import { DEFAULT_FILTERS, LOGO_MAX_BYTES, LOGO_TYPES } from "./constants";
import { generateOpenDeals, isOpen } from "./deals";
import { daysBetween } from "./format";
import { hashString, normalize, uniqueSlug } from "./text";
import { forgetContacts } from "./sequences";
import type {
  Activity,
  Company,
  CompanyFilters,
  CompanyLogo,
  CompanyRow,
  Contact,
  Deal,
  Enrollment,
  InteractionType,
  LogoMark,
  Region,
  Segment,
  Sequence,
  SortKey,
  Stage,
  Tag,
  Team,
  TrendWindow,
} from "./types";

export { slugify } from "./text";

// ---------------------------------------------------------------------------
// Filtering & sorting
// ---------------------------------------------------------------------------

export function daysSinceInteraction(company: Company, today: string): number {
  return Math.max(0, daysBetween(company.lastInteraction.date, today));
}

const byName = (a: Company, b: Company) => a.name.localeCompare(b.name);

const COMPARATORS: Record<SortKey, (a: CompanyRow, b: CompanyRow) => number> = {
  pipelineValue: (a, b) => b.pipelineValue - a.pipelineValue,
  // Companies without open deals sort last.
  winProbability: (a, b) => (b.winProbability ?? -1) - (a.winProbability ?? -1),
  openDeals: (a, b) => b.openDeals - a.openDeals,
  lastInteraction: (a, b) => b.lastInteraction.date.localeCompare(a.lastInteraction.date),
  name: byName,
};

export function filterCompanies(
  rows: readonly CompanyRow[],
  filters: CompanyFilters,
  today: string,
  teamOf: (owner: string) => Team | undefined,
): CompanyRow[] {
  const { owner, tag, activityWindow, sortBy, team, region } = filters;
  const compare = COMPARATORS[sortBy];
  return rows
    .filter(
      (row) =>
        (owner === null || row.owner === owner) &&
        (tag === null || row.tags.includes(tag)) &&
        (team === null || teamOf(row.owner) === team) &&
        (region === null || row.region === region) &&
        daysSinceInteraction(row, today) <= activityWindow,
    )
    .sort((a, b) => compare(a, b) || byName(a, b));
}

/** Filters that narrow the table (sorting doesn't count). */
export function activeFilterCount(filters: CompanyFilters): number {
  return [
    filters.owner !== DEFAULT_FILTERS.owner,
    filters.tag !== DEFAULT_FILTERS.tag,
    filters.activityWindow !== DEFAULT_FILTERS.activityWindow,
    filters.team !== DEFAULT_FILTERS.team,
    filters.region !== DEFAULT_FILTERS.region,
  ].filter(Boolean).length;
}

/**
 * Picks the tags that fit in the table cell: at most `maxVisible`, and no more
 * than `maxChars` characters in total. Always shows at least one tag.
 */
export function splitTags(
  tags: readonly Tag[],
  { maxVisible = 2, maxChars = 20 }: { maxVisible?: number; maxChars?: number } = {},
): { visible: Tag[]; hidden: Tag[] } {
  const visible: Tag[] = [];
  let chars = 0;
  for (const tag of tags) {
    if (visible.length === maxVisible || (visible.length > 0 && chars + tag.length > maxChars)) break;
    visible.push(tag);
    chars += tag.length;
  }
  return { visible, hidden: tags.slice(visible.length) };
}

// ---------------------------------------------------------------------------
// Derived account metrics (detail sheet)
// ---------------------------------------------------------------------------

export interface ActivitySummary {
  score: number;
  touches: number;
  emails: number;
  meetings: number;
  calls: number;
}

const WINDOW_SCALE: Record<TrendWindow, number> = { 7: 0.3, 30: 1, 90: 2.6 };

export function activitySummary(row: CompanyRow, window: TrendWindow = 30): ActivitySummary {
  const scale = WINDOW_SCALE[window];
  const score = Math.round(row.trend.reduce((sum, value) => sum + value, 0) * scale);
  const touches = Math.max(1, Math.round(Math.max(1, row.openDeals) * 6 * scale));
  const emails = Math.round(touches * 0.5);
  const meetings = Math.round(touches * 0.2);
  return { score, touches, emails, meetings, calls: touches - emails - meetings };
}

export const SCORE_CARD_IDS = ["businessFit", "technicalFit", "securityReview"] as const;
export type ScoreCardId = (typeof SCORE_CARD_IDS)[number];
export type Verdict = "high" | "promising" | "attention";

export interface ScoreCard {
  id: ScoreCardId;
  stars: number;
  verdict: Verdict;
}

const clampStars = (value: number) => Math.min(5, Math.max(1, value));
const verdictFor = (stars: number): Verdict => (stars >= 4 ? "high" : stars === 3 ? "promising" : "attention");

/** `stars` overrides the derived ratings (e.g. after a reviewer edits them). */
export function scoreCards(row: CompanyRow, stars?: readonly number[]): ScoreCard[] {
  const win = row.winProbability ?? 0;
  const derived = [
    Math.round(win / 20) + 1,
    Math.round((win + row.openDeals * 8) / 25),
    Math.round(win / 25) + 1,
  ];
  return SCORE_CARD_IDS.map((id, i) => {
    const rating = clampStars(Math.round(stars?.[i] ?? derived[i]!));
    return { id, stars: rating, verdict: verdictFor(rating) };
  });
}

// ---------------------------------------------------------------------------
// Aggregates (profiles & table footer)
// ---------------------------------------------------------------------------

export interface PipelineSummary {
  accounts: number;
  openDeals: number;
  pipeline: number;
  /** Average win probability of accounts with open deals. 0 when there are none. */
  avgWin: number;
}

export function pipelineSummary(rows: readonly CompanyRow[]): PipelineSummary {
  const withDeals = rows.filter((r) => r.winProbability !== null);
  const winTotal = withDeals.reduce((sum, r) => sum + (r.winProbability ?? 0), 0);
  return {
    accounts: rows.length,
    openDeals: rows.reduce((sum, r) => sum + r.openDeals, 0),
    pipeline: rows.reduce((sum, r) => sum + r.pipelineValue, 0),
    avgWin: withDeals.length ? Math.round(winTotal / withDeals.length) : 0,
  };
}

/** Pipeline value weighted by each account's win probability. */
export function weightedPipeline(rows: readonly CompanyRow[]): number {
  return Math.round(rows.reduce((sum, r) => sum + (r.pipelineValue * (r.winProbability ?? 0)) / 100, 0));
}

export function companiesByOwner<T extends Company & { pipelineValue: number }>(rows: readonly T[], owner: string): T[] {
  return rows.filter((r) => r.owner === owner).sort((a, b) => b.pipelineValue - a.pipelineValue);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Substring search over name, owner and tags, best matches first.
 * An empty query returns every company, most recent interaction first.
 */
export function searchCompanies<T extends Company>(companies: readonly T[], query: string): T[] {
  const q = normalize(query);
  if (!q) return [...companies].sort((a, b) => b.lastInteraction.date.localeCompare(a.lastInteraction.date));

  const scored: { company: T; score: number }[] = [];
  for (const company of companies) {
    const name = normalize(company.name);
    let score = 0;
    if (name.startsWith(q)) score = 4;
    else if (name.includes(q)) score = 3;
    else if (normalize(company.owner).includes(q)) score = 2;
    else if (company.tags.some((tag) => normalize(tag).includes(q))) score = 1;
    if (score > 0) scored.push({ company, score });
  }
  return scored.sort((a, b) => b.score - a.score || byName(a.company, b.company)).map((s) => s.company);
}

// ---------------------------------------------------------------------------
// Creating companies
// ---------------------------------------------------------------------------

export interface NewCompanyForm {
  name: string;
  segment: Segment;
  stage: Stage;
  region: Region;
  owner: string;
  /** Raw input values: may be empty strings. */
  pipelineValue: string;
  openDeals: string;
  winProbability: number;
  interactionDate: string;
  interactionType: InteractionType;
  logoSrc: string | null;
}

export type NewCompanyField = "name" | "pipelineValue" | "openDeals" | "interactionDate";
/** Error codes, translated by the UI. */
export type NewCompanyError = "nameRequired" | "nameTooLong" | "amount" | "wholeNumber" | "tooManyDeals" | "date" | "futureDate";
export type NewCompanyErrors = Partial<Record<NewCompanyField, NewCompanyError>>;

export interface ValidNewCompany extends Omit<NewCompanyForm, "pipelineValue" | "openDeals"> {
  pipelineValue: number;
  openDeals: number;
}

export const MAX_NEW_DEALS = 20;

export function validateNewCompany(
  form: NewCompanyForm,
  today: string,
): { ok: true; value: ValidNewCompany } | { ok: false; errors: NewCompanyErrors } {
  const errors: NewCompanyErrors = {};
  const name = form.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "nameRequired";
  else if (name.length > 60) errors.name = "nameTooLong";

  const pipelineValue = form.pipelineValue.trim() === "" ? 0 : Number(form.pipelineValue);
  if (!Number.isFinite(pipelineValue) || pipelineValue < 0) errors.pipelineValue = "amount";

  const openDeals = form.openDeals.trim() === "" ? 0 : Number(form.openDeals);
  if (!Number.isInteger(openDeals) || openDeals < 0) errors.openDeals = "wholeNumber";
  else if (openDeals > MAX_NEW_DEALS) errors.openDeals = "tooManyDeals";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.interactionDate)) errors.interactionDate = "date";
  else if (form.interactionDate > today) errors.interactionDate = "futureDate";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...form,
      name,
      pipelineValue: Math.round(pipelineValue),
      openDeals,
      winProbability: Math.min(100, Math.max(0, Math.round(form.winProbability))),
    },
  };
}

export type LogoError = "type" | "size";

/** Returns an error code, or null when the file can be used as a logo. */
export function validateLogoFile(file: { type: string; size: number }): LogoError | null {
  if (!LOGO_TYPES.includes(file.type)) return "type";
  if (file.size > LOGO_MAX_BYTES) return "size";
  return null;
}

const LOGO_MARKS: LogoMark[] = ["orbit", "bars", "diamond", "split", "grid", "wave", "peak", "ring", "spark", "hex"];
const LOGO_COLORS = ["#8b7bff", "#5eb1ff", "#3dd68c", "#ffb547", "#ff7a7a", "#4fd1c5", "#f472b6", "#facc15"];

export function generatedLogo(seed: string): CompanyLogo {
  const h = hashString(seed);
  return {
    kind: "mark",
    mark: LOGO_MARKS[h % LOGO_MARKS.length]!,
    color: LOGO_COLORS[Math.floor(h / LOGO_MARKS.length) % LOGO_COLORS.length]!,
  };
}

/** A gentle default curve for accounts that don't have activity history yet. */
const NEW_COMPANY_TREND = [2, 3, 3, 4, 2, 5, 6, 4, 5, 6, 4, 5, 7, 9];

/** Builds a company and its open deals from the form (deals split the pipeline value). */
export function createCompany(input: ValidNewCompany, existing: readonly Company[], today: string): { company: Company; deals: Deal[] } {
  const id = uniqueSlug(input.name, new Set(existing.map((c) => c.id)), "company");
  const company: Company = {
    id,
    name: input.name,
    tags: [input.segment, input.stage],
    owner: input.owner,
    region: input.region,
    trend: NEW_COMPANY_TREND,
    lastInteraction: { date: input.interactionDate, type: input.interactionType },
    logo: input.logoSrc ? { kind: "image", src: input.logoSrc } : generatedLogo(id),
  };
  const deals = generateOpenDeals(
    { companyId: id, owner: input.owner, count: input.openDeals, pipeline: input.pipelineValue, win: input.winProbability },
    today,
  );
  return { company, deals };
}

// ---------------------------------------------------------------------------
// Bulk changes
// ---------------------------------------------------------------------------

export interface DemoRecords {
  companies: Company[];
  deals: Deal[];
  contacts: Contact[];
  activities: Activity[];
  sequences: Sequence[];
  enrollments: Enrollment[];
}

/**
 * Reassigns accounts with their open deals and planned activities. Closed deals and
 * past activities keep their original owner.
 */
export function assignOwner(records: DemoRecords, ids: readonly string[], owner: string): DemoRecords {
  const set = new Set(ids);
  return {
    ...records,
    companies: records.companies.map((c) => (set.has(c.id) ? { ...c, owner } : c)),
    deals: records.deals.map((d) => (set.has(d.companyId) && isOpen(d) ? { ...d, owner } : d)),
    activities: records.activities.map((a) => (set.has(a.companyId) && !a.done ? { ...a, owner } : a)),
  };
}

/** Deletes accounts with everything that belongs to them: deals, contacts, activities and enrollments. */
export function deleteCompanies(records: DemoRecords, ids: readonly string[]): DemoRecords {
  const set = new Set(ids);
  const people = new Set(records.contacts.filter((c) => set.has(c.companyId)).map((c) => c.id));
  const { enrollments } = forgetContacts(records, people);
  return {
    ...records,
    companies: records.companies.filter((c) => !set.has(c.id)),
    deals: records.deals.filter((d) => !set.has(d.companyId)),
    contacts: records.contacts.filter((c) => !set.has(c.companyId)),
    activities: records.activities.filter((a) => !set.has(a.companyId)),
    enrollments,
  };
}

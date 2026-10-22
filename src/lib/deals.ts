import { STAGE_CATEGORY, STAGE_PROBABILITY, stageForProbability } from "./constants";
import type { CompanySeed } from "./data/companies";
import { DEAL_PRODUCTS } from "./data/companies";
import { addDays, addMonths, isSameQuarter } from "./format";
import { hashString } from "./text";
import {
  DEAL_STAGES,
  OPEN_DEAL_STAGES,
  type Company,
  type CompanyRow,
  type Deal,
  type DealFilters,
  type DealStage,
  type ForecastCategory,
  type OpenDealStage,
} from "./types";

export function isOpen(deal: Pick<Deal, "stage">): boolean {
  return deal.stage !== "won" && deal.stage !== "lost";
}

export function isOverdue(deal: Deal, today: string): boolean {
  return isOpen(deal) && deal.closeDate < today;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

/** Amount-weighted win probability of the open deals, or null when there are none. */
export function weightedWin(deals: readonly Deal[]): number | null {
  const open = deals.filter(isOpen);
  const total = open.reduce((sum, d) => sum + d.amount, 0);
  if (total === 0) return open.length ? Math.round(open.reduce((s, d) => s + d.probability, 0) / open.length) : null;
  return Math.round(open.reduce((sum, d) => sum + d.amount * d.probability, 0) / total);
}

/** Companies with open deal count, pipeline value and win probability derived from their deals. */
export function companyRows(companies: readonly Company[], deals: readonly Deal[]): CompanyRow[] {
  const byCompany = new Map<string, Deal[]>();
  for (const deal of deals) {
    if (!isOpen(deal)) continue;
    const list = byCompany.get(deal.companyId);
    if (list) list.push(deal);
    else byCompany.set(deal.companyId, [deal]);
  }
  return companies.map((company) => {
    const open = byCompany.get(company.id) ?? [];
    return {
      ...company,
      openDeals: open.length,
      pipelineValue: open.reduce((sum, d) => sum + d.amount, 0),
      winProbability: weightedWin(open),
    };
  });
}

export interface StageSlice {
  count: number;
  amount: number;
  /** Share of the open pipeline amount, 0–100. */
  share: number;
}

export function pipelineByStage(deals: readonly Deal[]): Record<OpenDealStage, StageSlice> {
  const open = deals.filter(isOpen);
  const total = open.reduce((sum, d) => sum + d.amount, 0);
  const slices = {} as Record<OpenDealStage, StageSlice>;
  for (const stage of OPEN_DEAL_STAGES) {
    const inStage = open.filter((d) => d.stage === stage);
    const amount = inStage.reduce((sum, d) => sum + d.amount, 0);
    slices[stage] = { count: inStage.length, amount, share: total ? Math.round((amount / total) * 100) : 0 };
  }
  return slices;
}

export interface DealSummary {
  count: number;
  amount: number;
  weighted: number;
}

export function dealSummary(deals: readonly Deal[]): DealSummary {
  return {
    count: deals.length,
    amount: deals.reduce((sum, d) => sum + d.amount, 0),
    weighted: Math.round(deals.reduce((sum, d) => sum + (d.amount * d.probability) / 100, 0)),
  };
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function filterDeals(deals: readonly Deal[], filters: DealFilters, today: string): Deal[] {
  return deals.filter(
    (deal) =>
      (filters.owner === null || deal.owner === filters.owner) &&
      (filters.close === null ||
        (filters.close === "overdue" ? isOverdue(deal, today) : isOpen(deal) && isSameQuarter(deal.closeDate, today))),
  );
}

/** Deals per stage. Open stages: soonest close first. Closed stages: most recent first. */
export function dealsByStage(deals: readonly Deal[]): Record<DealStage, Deal[]> {
  const columns = Object.fromEntries(DEAL_STAGES.map((stage) => [stage, [] as Deal[]])) as Record<DealStage, Deal[]>;
  for (const deal of deals) columns[deal.stage].push(deal);
  for (const stage of DEAL_STAGES) {
    const closed = !isOpen({ stage });
    columns[stage].sort((a, b) => (closed ? b.closeDate.localeCompare(a.closeDate) : a.closeDate.localeCompare(b.closeDate)) || a.name.localeCompare(b.name));
  }
  return columns;
}

/**
 * Moves a deal to another stage. The probability and forecast category reset to the
 * stage defaults, and closing a deal (won or lost) stamps today as its close date.
 */
export function moveDeal(deals: readonly Deal[], dealId: string, stage: DealStage, today: string): Deal[] {
  return deals.map((deal) => {
    if (deal.id !== dealId || deal.stage === stage) return deal;
    const next: Deal = {
      ...deal,
      stage,
      probability: STAGE_PROBABILITY[stage],
      closeDate: isOpen({ stage }) ? deal.closeDate : today,
    };
    delete next.forecast;
    return next;
  });
}

export function updateDeal(deals: readonly Deal[], dealId: string, update: (deal: Deal) => Deal): Deal[] {
  return deals.map((deal) => (deal.id === dealId ? update(deal) : deal));
}

// ---------------------------------------------------------------------------
// Forecast category and close date
// ---------------------------------------------------------------------------

/** The category an open deal counts in: its override, or its stage's default. Closed deals have none. */
export function forecastCategory(deal: Pick<Deal, "stage" | "forecast">): ForecastCategory | null {
  return isOpen(deal) ? (deal.forecast ?? STAGE_CATEGORY[deal.stage as OpenDealStage]) : null;
}

/** Puts an open deal in a forecast category. Choosing its stage's default clears the override. */
export function withForecastCategory(deal: Deal, category: ForecastCategory): Deal {
  if (!isOpen(deal) || forecastCategory(deal) === category) return deal;
  const next: Deal = { ...deal, forecast: category };
  if (category === STAGE_CATEGORY[deal.stage as OpenDealStage]) delete next.forecast;
  return next;
}

/**
 * Moves an open deal's close date to the same point of the next quarter (1) or the previous
 * one (-1), but never before today: a deal pulled in shouldn't turn overdue.
 */
export function shiftQuarter(deal: Deal, direction: 1 | -1, today: string): Deal {
  if (!isOpen(deal)) return deal;
  const closeDate = addMonths(deal.closeDate, 3 * direction);
  return { ...deal, closeDate: closeDate < today ? today : closeDate };
}

// ---------------------------------------------------------------------------
// Editing a deal
// ---------------------------------------------------------------------------

export interface DealForm {
  /** Raw input value: may be empty. */
  amount: string;
  closeDate: string;
  stage: DealStage;
  probability: number;
  /** Only used while the stage is open. */
  category: ForecastCategory;
}

export type DealField = "amount" | "closeDate";
/** Error codes, translated by the UI. */
export type DealError = "amount" | "tooLarge" | "date" | "futureClose";
export type DealErrors = Partial<Record<DealField, DealError>>;

export interface ValidDealForm extends Omit<DealForm, "amount"> {
  amount: number;
}

export const MAX_DEAL_AMOUNT = 100_000_000;

export function dealForm(deal: Deal): DealForm {
  return {
    amount: String(deal.amount),
    closeDate: deal.closeDate,
    stage: deal.stage,
    probability: deal.probability,
    category: forecastCategory(deal) ?? STAGE_CATEGORY.discovery,
  };
}

/**
 * Picking another stage in the form: probability and category follow the stage, like on the
 * board, and closing an open deal stamps today as its close date (it can still be edited).
 */
export function changeFormStage(form: DealForm, stage: DealStage, today: string): DealForm {
  const open = isOpen({ stage });
  return {
    ...form,
    stage,
    probability: STAGE_PROBABILITY[stage],
    category: open ? STAGE_CATEGORY[stage as OpenDealStage] : form.category,
    closeDate: !open && isOpen(form) ? today : form.closeDate,
  };
}

export function validateDealForm(
  form: DealForm,
  today: string,
): { ok: true; value: ValidDealForm } | { ok: false; errors: DealErrors } {
  const errors: DealErrors = {};
  const amount = Number(form.amount);
  if (form.amount.trim() === "" || !Number.isFinite(amount) || amount <= 0) errors.amount = "amount";
  else if (amount > MAX_DEAL_AMOUNT) errors.amount = "tooLarge";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.closeDate) || Number.isNaN(Date.parse(form.closeDate))) errors.closeDate = "date";
  else if (!isOpen(form) && form.closeDate > today) errors.closeDate = "futureClose";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { ...form, amount: Math.round(amount), probability: clamp(Math.round(form.probability), 0, 100) } };
}

/** Applies a validated form. A closed deal takes its stage's probability and drops out of the forecast categories. */
export function applyDealForm(deal: Deal, form: ValidDealForm): Deal {
  const open = isOpen(form);
  const next: Deal = {
    ...deal,
    amount: form.amount,
    closeDate: form.closeDate,
    stage: form.stage,
    probability: open ? form.probability : STAGE_PROBABILITY[form.stage],
  };
  delete next.forecast;
  return open ? withForecastCategory(next, form.category) : next;
}

// ---------------------------------------------------------------------------
// Generating deals
// ---------------------------------------------------------------------------

const PROBABILITY_JITTER = [-9, 7, -4, 11, -12, 5, 2, -6];
/** Open deals close in 15-day slots over the next six months; the first slot is already overdue (slipping). */
const CLOSE_SLOT_DAYS = 15;
const CLOSE_OFFSETS = Array.from({ length: 13 }, (_, i) => -11 + i * CLOSE_SLOT_DAYS);
/** Days the open pipeline is spread over. */
const PIPELINE_DAYS = CLOSE_OFFSETS.length * CLOSE_SLOT_DAYS;

/** Splits `total` into parts proportional to `weights`, rounded to hundreds, summing exactly to `total`. */
function splitAmount(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  let remaining = total;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return remaining;
    const part = Math.round((total * w) / sum / 100) * 100;
    remaining -= part;
    return part;
  });
}

/** Nudges the largest deal so the weighted win probability lands on `target`. */
function calibrate(deals: Deal[], target: number): void {
  const total = deals.reduce((sum, d) => sum + d.amount, 0);
  const largest = deals.reduce((max, d) => (d.amount > max.amount ? d : max), deals[0]!);
  if (!total || !largest.amount) return;
  const current = deals.reduce((sum, d) => sum + d.amount * d.probability, 0);
  largest.probability = clamp(Math.round(largest.probability + (target * total - current) / largest.amount), 5, 95);
  largest.stage = stageForProbability(largest.probability);
}

export interface OpenDealsInput {
  companyId: string;
  owner: string;
  count: number;
  pipeline: number;
  win: number;
}

/** Open deals for a company: amounts add up to `pipeline`, weighted win ≈ `win`. */
export function generateOpenDeals({ companyId, owner, count, pipeline, win }: OpenDealsInput, today: string, seed = companyId): Deal[] {
  if (count <= 0) return [];
  const h = hashString(seed);
  const weights = Array.from({ length: count }, (_, i) => 2 + ((h >>> (i * 3)) % 5));
  const amounts = splitAmount(pipeline, weights);
  const deals = amounts.map((amount, i): Deal => {
    const probability = clamp(win + PROBABILITY_JITTER[(h + i) % PROBABILITY_JITTER.length]!, 5, 95);
    return {
      id: `${companyId}-${i + 1}`,
      companyId,
      name: DEAL_PRODUCTS[(h + i) % DEAL_PRODUCTS.length]!,
      stage: stageForProbability(probability),
      amount,
      probability,
      closeDate: addDays(today, CLOSE_OFFSETS[(h + i * 5) % CLOSE_OFFSETS.length]!),
      owner,
    };
  });
  calibrate(deals, win);
  return deals;
}

/** Each account wins a deal about every six weeks. */
const WIN_INTERVAL = 45;
/** Seeded wins go back a full quarter, so the current quarter has its share whatever day it is. */
const WIN_HISTORY = 92;

/**
 * Past wins at the pace the account's open pipeline predicts: its weighted value closes over
 * PIPELINE_DAYS, and it booked at that same rate before. So whichever day of the quarter the
 * demo is opened, won and open deals add up to about the same forecast: early on most of it
 * is still open, late in the quarter most of it is won.
 */
function seedWonDeals(seed: CompanySeed, today: string): Deal[] {
  const { open, pipeline, win } = seed.deals;
  const h = hashString(seed.id);
  const amount = Math.round((pipeline * (win / 100) * (WIN_INTERVAL / PIPELINE_DAYS)) / 100) * 100;
  const deals: Deal[] = [];
  for (let daysAgo = 1 + (h % WIN_INTERVAL), n = 1; amount > 0 && daysAgo <= WIN_HISTORY; daysAgo += WIN_INTERVAL, n++) {
    deals.push({
      id: `${seed.id}-won-${n}`,
      companyId: seed.id,
      name: DEAL_PRODUCTS[(h + open + n) % DEAL_PRODUCTS.length]!,
      stage: "won",
      amount,
      probability: STAGE_PROBABILITY.won,
      closeDate: addDays(today, -daysAgo),
      owner: seed.owner,
    });
  }
  return deals;
}

/**
 * The reps' own calls on top of the stage defaults: likely deals still in evaluation are
 * committed, and long shots in discovery are left out of the forecast.
 */
function repCall(deal: Deal): Deal {
  if (deal.stage === "evaluation" && deal.probability >= 55) return { ...deal, forecast: "commit" };
  if (deal.stage === "discovery" && deal.probability <= 12) return { ...deal, forecast: "omitted" };
  return deal;
}

export function seedDealsFor(seed: CompanySeed, today: string): Deal[] {
  const { open, pipeline, win, lost } = seed.deals;
  const deals = [
    ...generateOpenDeals({ companyId: seed.id, owner: seed.owner, count: open, pipeline, win }, today).map(repCall),
    ...seedWonDeals(seed, today),
  ];
  if (lost) {
    const h = hashString(seed.id);
    deals.push({
      id: `${seed.id}-${open + 1}`,
      companyId: seed.id,
      name: DEAL_PRODUCTS[(h + open) % DEAL_PRODUCTS.length]!,
      stage: "lost",
      amount: Math.round((pipeline * 0.25) / 100) * 100,
      probability: STAGE_PROBABILITY.lost,
      closeDate: addDays(today, -(8 + (h % 40))),
      owner: seed.owner,
    });
  }
  return deals;
}

import { STAGE_PROBABILITY, stageForProbability } from "./constants";
import type { CompanySeed } from "./data/companies";
import { DEAL_PRODUCTS } from "./data/companies";
import { addDays, isSameQuarter } from "./format";
import { hashString } from "./text";
import {
  DEAL_STAGES,
  OPEN_DEAL_STAGES,
  type Company,
  type CompanyRow,
  type Deal,
  type DealFilters,
  type DealStage,
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
 * Moves a deal to another stage. The probability resets to the stage default, and
 * closing a deal (won or lost) stamps today as its close date.
 */
export function moveDeal(deals: readonly Deal[], dealId: string, stage: DealStage, today: string): Deal[] {
  return deals.map((deal) => {
    if (deal.id !== dealId || deal.stage === stage) return deal;
    return {
      ...deal,
      stage,
      probability: STAGE_PROBABILITY[stage],
      closeDate: isOpen({ stage }) ? deal.closeDate : today,
    };
  });
}

// ---------------------------------------------------------------------------
// Generating deals
// ---------------------------------------------------------------------------

const PROBABILITY_JITTER = [-9, 7, -4, 11, -12, 5, 2, -6];
/** Days from today for open deals; negative ones are already overdue (slipping). */
const CLOSE_OFFSETS = [-11, 9, 23, 38, 52, 67, 81, 96, 14, 45, 6, 30];

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

export function seedDealsFor(seed: CompanySeed, today: string): Deal[] {
  const { open, pipeline, win, closed } = seed.deals;
  const deals = generateOpenDeals({ companyId: seed.id, owner: seed.owner, count: open, pipeline, win }, today);
  if (closed) {
    const h = hashString(seed.id);
    deals.push({
      id: `${seed.id}-${open + 1}`,
      companyId: seed.id,
      name: DEAL_PRODUCTS[(h + open) % DEAL_PRODUCTS.length]!,
      stage: closed,
      amount: Math.round((pipeline * 0.25) / 100) * 100,
      probability: STAGE_PROBABILITY[closed],
      closeDate: addDays(today, -(8 + (h % 40))),
      owner: seed.owner,
    });
  }
  return deals;
}

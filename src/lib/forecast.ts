import { forecastCategory, isOpen } from "./deals";
import { addDays, addMonths, daysBetween, quarterOf, quarterStart } from "./format";
import { FORECAST_CATEGORIES, type Deal, type ForecastCategory, type ForecastFilters, type ForecastPeriod, type Team } from "./types";

// Forecasting works on calendar quarters. A deal counts in the quarter its close date falls
// in: the actual date once won, the expected one while open.

export interface Quarter {
  /** First day. */
  start: string;
  /** First day of the following quarter (exclusive). */
  end: string;
  /** 1–4 */
  quarter: number;
  year: number;
}

export function quarterFor(period: ForecastPeriod, today: string): Quarter {
  const start = addMonths(quarterStart(today), period === "next" ? 3 : 0);
  return { start, end: addMonths(start, 3), quarter: quarterOf(start), year: Number(start.slice(0, 4)) };
}

export function inQuarter(date: string, quarter: Quarter): boolean {
  return date >= quarter.start && date < quarter.end;
}

/** People whose numbers are in view: everyone, one team, or one rep. */
export function repsInView<T extends { name: string; team: Team }>(people: readonly T[], filters: Pick<ForecastFilters, "owner" | "team">): T[] {
  return people.filter((p) => (filters.owner === null || p.name === filters.owner) && (filters.team === null || p.team === filters.team));
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export interface ForecastTotals {
  quota: number;
  /** Won in the quarter. */
  closed: number;
  /** Open deals closing in the quarter, per category. */
  open: Record<ForecastCategory, number>;
  /** Won plus the probability-weighted value of the open deals. Omitted deals don't count. */
  weighted: number;
}

export function forecastTotals(deals: readonly Deal[], quarter: Quarter, quota: number): ForecastTotals {
  const open = Object.fromEntries(FORECAST_CATEGORIES.map((category) => [category, 0])) as Record<ForecastCategory, number>;
  let closed = 0;
  let expected = 0;
  for (const deal of deals) {
    if (!inQuarter(deal.closeDate, quarter)) continue;
    if (deal.stage === "won") {
      closed += deal.amount;
      continue;
    }
    const category = forecastCategory(deal);
    if (category === null) continue; // lost
    open[category] += deal.amount;
    if (category !== "omitted") expected += (deal.amount * deal.probability) / 100;
  }
  return { quota, closed, open, weighted: closed + Math.round(expected) };
}

/** Won plus Commit: what the team stands behind. */
export function commitForecast(totals: ForecastTotals): number {
  return totals.closed + totals.open.commit;
}

/** Commit plus Best case: the upside if the likely deals close too. */
export function bestCaseForecast(totals: ForecastTotals): number {
  return commitForecast(totals) + totals.open.bestCase;
}

/** Open deals that count in the forecast (omitted ones don't). */
export function openForecast(totals: ForecastTotals): number {
  return totals.open.commit + totals.open.bestCase + totals.open.pipeline;
}

/** `value` as a whole percentage of the quota; null without a quota. */
export function shareOfQuota(value: number, quota: number): number | null {
  return quota > 0 ? Math.round((value / quota) * 100) : null;
}

/** How many times the open forecast covers the quota still to close, to one decimal; null once the quota is won. */
export function coverage(totals: ForecastTotals): number | null {
  const remaining = totals.quota - totals.closed;
  return remaining > 0 ? Math.round((openForecast(totals) / remaining) * 10) / 10 : null;
}

export interface RepForecast extends ForecastTotals {
  owner: string;
}

/** One row per rep, highest share of quota with Commit first. */
export function forecastByRep(
  deals: readonly Deal[],
  quarter: Quarter,
  reps: readonly { name: string; quota: number }[],
): RepForecast[] {
  const byOwner = new Map<string, Deal[]>();
  for (const deal of deals) {
    const list = byOwner.get(deal.owner);
    if (list) list.push(deal);
    else byOwner.set(deal.owner, [deal]);
  }
  const attainment = (rep: RepForecast) => (rep.quota > 0 ? commitForecast(rep) / rep.quota : 0);
  return reps
    .map((rep): RepForecast => ({ owner: rep.name, ...forecastTotals(byOwner.get(rep.name) ?? [], quarter, rep.quota) }))
    .sort((a, b) => attainment(b) - attainment(a) || a.owner.localeCompare(b.owner));
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

/** How the forecast lists a quarter's deals: open ones by category, then the won ones. */
export const FORECAST_GROUPS = [...FORECAST_CATEGORIES, "won"] as const;
export type ForecastGroup = (typeof FORECAST_GROUPS)[number];

/** The quarter's deals per group: open ones soonest close first, won ones most recent first. Lost deals are left out. */
export function forecastGroups(deals: readonly Deal[], quarter: Quarter): Record<ForecastGroup, Deal[]> {
  const groups = Object.fromEntries(FORECAST_GROUPS.map((group) => [group, [] as Deal[]])) as Record<ForecastGroup, Deal[]>;
  for (const deal of deals) {
    if (!inQuarter(deal.closeDate, quarter)) continue;
    const group = deal.stage === "won" ? "won" : forecastCategory(deal);
    if (group) groups[group].push(deal);
  }
  for (const group of FORECAST_GROUPS) {
    const newestFirst = group === "won";
    groups[group].sort(
      (a, b) => (newestFirst ? b.closeDate.localeCompare(a.closeDate) : a.closeDate.localeCompare(b.closeDate)) || a.name.localeCompare(b.name),
    );
  }
  return groups;
}

/** Open deals expected to close before the current quarter: they count in no forecast until someone updates them. */
export function pastDueDeals(deals: readonly Deal[], today: string): Deal[] {
  const start = quarterStart(today);
  return deals.filter((deal) => isOpen(deal) && deal.closeDate < start);
}

// ---------------------------------------------------------------------------
// Progress through the quarter (chart)
// ---------------------------------------------------------------------------

/** `value` holds from `day` (0 is the quarter's first day) until the next step. */
export interface Step {
  day: number;
  value: number;
}

export interface ForecastSeries {
  /** Days in the quarter. */
  days: number;
  /** Days already over, today included: 0 before the quarter starts. */
  elapsed: number;
  /** Won so far, added up day by day. */
  closed: Step[];
  /** From `elapsed` on: won so far, plus Commit deals on their close dates. */
  commit: Step[];
  /** The same, plus Best case deals. */
  bestCase: Step[];
}

function addTo(amounts: Map<number, number>, day: number, amount: number): void {
  amounts.set(day, (amounts.get(day) ?? 0) + amount);
}

/** Running total of `amounts` per day, starting at `from` with `initial`. */
function runningTotal(amounts: Map<number, number>, from: number, initial: number): Step[] {
  const steps: Step[] = [{ day: from, value: initial }];
  let value = initial;
  for (const day of [...amounts.keys()].sort((a, b) => a - b)) {
    value += amounts.get(day)!;
    if (day <= from) steps[0] = { day: from, value };
    else steps.push({ day, value });
  }
  return steps;
}

export function forecastSeries(deals: readonly Deal[], quarter: Quarter, today: string): ForecastSeries {
  const days = daysBetween(quarter.start, quarter.end);
  const elapsed = Math.min(days, Math.max(0, daysBetween(quarter.start, today) + 1));
  const won = new Map<number, number>();
  const commit = new Map<number, number>();
  const bestCase = new Map<number, number>();
  for (const deal of deals) {
    if (!inQuarter(deal.closeDate, quarter)) continue;
    const day = daysBetween(quarter.start, deal.closeDate);
    if (deal.stage === "won") {
      addTo(won, day, deal.amount);
      continue;
    }
    // Deals due today or already overdue could close any moment: they count from now on.
    const due = Math.max(day, elapsed);
    const category = forecastCategory(deal);
    if (category === "commit") addTo(commit, due, deal.amount);
    if (category === "commit" || category === "bestCase") addTo(bestCase, due, deal.amount);
  }
  const closed = runningTotal(won, 0, 0);
  const wonSoFar = closed.at(-1)!.value;
  return {
    days,
    elapsed,
    closed,
    commit: runningTotal(commit, elapsed, wonSoFar),
    bestCase: runningTotal(bestCase, elapsed, wonSoFar),
  };
}

/** A step series' value on `day`. */
export function valueAt(steps: readonly Step[], day: number): number {
  let value = steps[0]?.value ?? 0;
  for (const step of steps) {
    if (step.day > day) break;
    value = step.value;
  }
  return value;
}

export interface WeekRow {
  /** First day of the week. */
  start: string;
  /** Won by the end of the week (or by today); null for weeks that haven't started. */
  closed: number | null;
  /** Projections at the end of the week; null for weeks that are over. */
  commit: number | null;
  bestCase: number | null;
}

/** The chart as a table, one row per week of the quarter. */
export function weeklyRows(series: ForecastSeries, quarter: Quarter): WeekRow[] {
  const rows: WeekRow[] = [];
  for (let first = 0; first < series.days; first += 7) {
    const last = Math.min(first + 6, series.days - 1);
    const started = first < series.elapsed;
    const over = last < series.elapsed;
    rows.push({
      start: addDays(quarter.start, first),
      closed: started ? valueAt(series.closed, Math.min(last, series.elapsed - 1)) : null,
      commit: over ? null : valueAt(series.commit, last),
      bestCase: over ? null : valueAt(series.bestCase, last),
    });
  }
  return rows;
}

/** Round axis values from 0 up past `max`: 1.58M → 0, 500K, 1M, 1.5M, 2M. */
export function axisTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

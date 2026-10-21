import type { DemoRecords } from "./companies";
import { addDays, daysBetween } from "./format";
import type { Company, Deal } from "./types";

export const STORAGE_KEY = "sales-crm:demo:v1";

export interface DemoState extends DemoRecords {
  scoreOverrides: Record<string, number[]>;
  unreadIds: string[];
}

interface PersistedDemo extends DemoState {
  version: 1;
  /** The day the data was last saved; used to move every date forward on the next visit. */
  asOf: string;
}

export function serializeDemo(state: DemoState, today: string): string {
  const payload: PersistedDemo = { version: 1, asOf: today, ...state };
  return JSON.stringify(payload);
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function isPersistedDemo(value: unknown): value is PersistedDemo {
  return (
    isObject(value) &&
    value.version === 1 &&
    typeof value.asOf === "string" &&
    Array.isArray(value.companies) &&
    Array.isArray(value.deals) &&
    isObject(value.scoreOverrides) &&
    Array.isArray(value.unreadIds)
  );
}

/** Shifts every date by `days`, so the demo keeps the same "N days ago" feel. */
export function shiftDemo<T extends DemoRecords>(data: T, days: number): T {
  if (days === 0) return data;
  return {
    ...data,
    companies: data.companies.map(
      (c): Company => ({ ...c, lastInteraction: { ...c.lastInteraction, date: addDays(c.lastInteraction.date, days) } }),
    ),
    deals: data.deals.map((d): Deal => ({ ...d, closeDate: addDays(d.closeDate, days) })),
  };
}

/** Parses what was saved and brings it up to `today`. Returns null for missing or unreadable data. */
export function restoreDemo(raw: string | null, today: string): DemoState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPersistedDemo(parsed)) return null;
  const state: DemoState = {
    companies: parsed.companies,
    deals: parsed.deals,
    scoreOverrides: parsed.scoreOverrides,
    unreadIds: parsed.unreadIds,
  };
  return shiftDemo(state, daysBetween(parsed.asOf, today));
}

import { seedActivities } from "./activities";
import type { DemoRecords } from "./companies";
import { seedContacts } from "./contacts";
import { addDays, daysBetween } from "./format";
import type { Activity, Company, Deal } from "./types";

// Version 2 seeds a quarter of won deals for the forecast. Version 1 data had none,
// so it's dropped rather than migrated: visitors start again from fresh demo data.
const VERSION = 2;
export const STORAGE_KEY = `sales-crm:demo:v${VERSION}`;
export const LEGACY_STORAGE_KEYS = ["sales-crm:demo:v1"];

export interface DemoState extends DemoRecords {
  scoreOverrides: Record<string, number[]>;
  unreadIds: string[];
}

interface PersistedDemo extends DemoState {
  version: typeof VERSION;
  /** The day the data was last saved; used to move every date forward on the next visit. */
  asOf: string;
}

export function serializeDemo(state: DemoState, today: string): string {
  const payload: PersistedDemo = { version: VERSION, asOf: today, ...state };
  return JSON.stringify(payload);
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function isPersistedDemo(value: unknown): value is PersistedDemo {
  return (
    isObject(value) &&
    value.version === VERSION &&
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
    activities: data.activities.map((a): Activity => ({ ...a, date: addDays(a.date, days) })),
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
  // Data saved before contacts or activities existed gets them seeded for what's still
  // there, as of the day it was saved; the shift below brings everything up to today.
  const contacts = Array.isArray(parsed.contacts) ? parsed.contacts : seedContacts(new Set(parsed.companies.map((c) => c.id)));
  const state: DemoState = {
    companies: parsed.companies,
    deals: parsed.deals,
    contacts,
    activities: Array.isArray(parsed.activities) ? parsed.activities : seedActivities(parsed.companies, parsed.deals, contacts, parsed.asOf),
    scoreOverrides: parsed.scoreOverrides,
    unreadIds: parsed.unreadIds,
  };
  return shiftDemo(state, daysBetween(parsed.asOf, today));
}

import type { AppLocale } from "./types";

const DAY_MS = 86_400_000;

/** Regional formatting per app locale. Spanish uses es-AR: "US$ 548.200" can't be mistaken for pesos. */
export const INTL_LOCALES: Record<AppLocale, string> = { en: "en-US", es: "es-AR" };

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(key: string, create: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (!value) {
    value = create();
    cache.set(key, value);
  }
  return value;
}

const money = (locale: AppLocale) =>
  cached(`money:${locale}`, () =>
    new Intl.NumberFormat(INTL_LOCALES[locale], { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  );

export function formatNumber(value: number, locale: AppLocale): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(INTL_LOCALES[locale])).format(value);
}

/** 548200 → "$548,200" (en) · "US$ 548.200" (es) */
export function formatMoney(value: number, locale: AppLocale): string {
  return money(locale).format(Math.round(value));
}

/** Splits currency and amount so the symbol can be styled apart: { symbol: "US$", amount: "548.200" }. */
export function moneyParts(value: number, locale: AppLocale): { symbol: string; amount: string } {
  const parts = money(locale).formatToParts(Math.round(value));
  const symbol = parts.find((p) => p.type === "currency")?.value ?? "$";
  const amount = parts
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("")
    .trim();
  return { symbol, amount };
}

/** 5138594 → "$5.1M" */
export function formatCompactMoney(value: number, locale: AppLocale): string {
  return cached(
    `compact:${locale}`,
    () =>
      new Intl.NumberFormat(INTL_LOCALES[locale], {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }),
  ).format(value);
}

/** "2026-09-11" → "Sep 11" (en) · "11 sept" (es) */
export function formatShortDate(isoDate: string, locale: AppLocale): string {
  return cached(
    `date:${locale}`,
    () => new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", day: "numeric", timeZone: "UTC" }),
  ).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-11-01" → "Nov" (en) · "nov" (es) */
export function formatMonth(isoDate: string, locale: AppLocale): string {
  return cached(
    `month:${locale}`,
    () => new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", timeZone: "UTC" }),
  ).format(new Date(`${isoDate}T00:00:00Z`));
}

/** 2 → "2 min. ago" · 1440 → "yesterday" (en) / "ayer" (es) */
export function formatMinutesAgo(minutes: number, locale: AppLocale): string {
  const rtf = cached(
    `relative:${locale}`,
    () => new Intl.RelativeTimeFormat(INTL_LOCALES[locale], { numeric: "auto", style: "short" }),
  );
  if (minutes < 60) return rtf.format(-Math.max(1, Math.round(minutes)), "minute");
  if (minutes < 1440) return rtf.format(-Math.round(minutes / 60), "hour");
  return rtf.format(-Math.round(minutes / 1440), "day");
}

/** Whole days from `from` to `to` (both ISO dates). Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The same day `months` later (or earlier), kept within the month: Nov 30 + 3 months → Feb 28. */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const index = year * 12 + month - 1 + months;
  const y = Math.floor(index / 12);
  const m = index - y * 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return `${y}-${pad(m + 1)}-${pad(Math.min(day, lastDay))}`;
}

/** Today's date in the visitor's time zone, as YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 1–4 */
export function quarterOf(isoDate: string): number {
  return Math.floor((Number(isoDate.slice(5, 7)) - 1) / 3) + 1;
}

/** First day of the quarter the date falls in: "2026-11-20" → "2026-10-01". */
export function quarterStart(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-${pad((quarterOf(isoDate) - 1) * 3 + 1)}-01`;
}

export function isSameQuarter(a: string, b: string): boolean {
  return a.slice(0, 4) === b.slice(0, 4) && quarterOf(a) === quarterOf(b);
}

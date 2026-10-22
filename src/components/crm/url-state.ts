"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_ACTIVITY_FILTERS, DEFAULT_CONTACT_FILTERS, DEFAULT_DEAL_FILTERS, DEFAULT_FILTERS, DEFAULT_FORECAST_FILTERS } from "@/lib/constants";
import { OWNER_NAMES } from "@/lib/data/people";
import type { ActivityFilters, CompanyFilters, ContactFilters, DealFilters, ForecastFilters } from "@/lib/types";
import {
  parseActivityFilters,
  parseCompanyFilters,
  parseContactFilters,
  parseDealFilters,
  parseForecastFilters,
  toHref,
  writeActivityFilters,
  writeCompanyFilters,
  writeContactFilters,
  writeDealFilters,
  writeForecastFilters,
} from "@/lib/url-state";

/**
 * Changes the query string without a navigation. Next.js keeps useSearchParams in sync
 * with history.replaceState, so every view reading the URL re-renders.
 */
export function replaceSearchParams(update: (params: URLSearchParams) => URLSearchParams | void): void {
  const params = new URLSearchParams(window.location.search);
  window.history.replaceState(null, "", toHref(window.location.pathname, update(params) ?? params));
}

/** Filters and sort order of the companies table, stored in the URL so views can be shared. */
export function useCompanyFilters() {
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseCompanyFilters(new URLSearchParams(query), OWNER_NAMES), [query]);
  // Setters read the live URL, so they never act on stale filters.
  const setFilters = useCallback(
    (patch: Partial<CompanyFilters>) =>
      replaceSearchParams((p) => writeCompanyFilters(p, { ...parseCompanyFilters(p, OWNER_NAMES), ...patch })),
    [],
  );
  const resetFilters = useCallback(
    () =>
      replaceSearchParams((p) =>
        writeCompanyFilters(p, { ...DEFAULT_FILTERS, sortBy: parseCompanyFilters(p, OWNER_NAMES).sortBy }),
      ),
    [],
  );
  return { filters, setFilters, resetFilters };
}

export function useDealFilters() {
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseDealFilters(new URLSearchParams(query), OWNER_NAMES), [query]);
  const setFilters = useCallback(
    (patch: Partial<DealFilters>) =>
      replaceSearchParams((p) => writeDealFilters(p, { ...parseDealFilters(p, OWNER_NAMES), ...patch })),
    [],
  );
  const resetFilters = useCallback(() => replaceSearchParams((p) => writeDealFilters(p, DEFAULT_DEAL_FILTERS)), []);
  return { filters, setFilters, resetFilters };
}

export function useForecastFilters() {
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseForecastFilters(new URLSearchParams(query), OWNER_NAMES), [query]);
  const setFilters = useCallback(
    (patch: Partial<ForecastFilters>) =>
      replaceSearchParams((p) => writeForecastFilters(p, { ...parseForecastFilters(p, OWNER_NAMES), ...patch })),
    [],
  );
  // The quarter is a view, not a filter: resetting keeps it.
  const resetFilters = useCallback(
    () =>
      replaceSearchParams((p) =>
        writeForecastFilters(p, { ...DEFAULT_FORECAST_FILTERS, period: parseForecastFilters(p, OWNER_NAMES).period }),
      ),
    [],
  );
  return { filters, setFilters, resetFilters };
}

export function useContactFilters() {
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseContactFilters(new URLSearchParams(query)), [query]);
  const setFilters = useCallback(
    (patch: Partial<ContactFilters>) => replaceSearchParams((p) => writeContactFilters(p, { ...parseContactFilters(p), ...patch })),
    [],
  );
  const resetFilters = useCallback(() => replaceSearchParams((p) => writeContactFilters(p, DEFAULT_CONTACT_FILTERS)), []);
  return { filters, setFilters, resetFilters };
}

export function useActivityFilters() {
  const query = useSearchParams().toString();
  const filters = useMemo(() => parseActivityFilters(new URLSearchParams(query), OWNER_NAMES), [query]);
  const setFilters = useCallback(
    (patch: Partial<ActivityFilters>) =>
      replaceSearchParams((p) => writeActivityFilters(p, { ...parseActivityFilters(p, OWNER_NAMES), ...patch })),
    [],
  );
  // The to-do/done switch is a view, not a filter: resetting keeps it.
  const resetFilters = useCallback(
    () =>
      replaceSearchParams((p) =>
        writeActivityFilters(p, { ...DEFAULT_ACTIVITY_FILTERS, view: parseActivityFilters(p, OWNER_NAMES).view }),
      ),
    [],
  );
  return { filters, setFilters, resetFilters };
}

// Detail sheets, on any page: ?company=id, ?deal=id or ?contact=id. One at a time, so
// opening one closes the others.

const SHEETS = ["company", "deal", "contact"] as const;
type SheetParam = (typeof SHEETS)[number];

function openSheet(param: SheetParam, id: string): void {
  replaceSearchParams((p) => {
    for (const sheet of SHEETS) p.delete(sheet);
    p.set(param, id);
  });
}

function closeSheet(param: SheetParam): void {
  replaceSearchParams((p) => {
    p.delete(param);
  });
}

export const useOpenCompanyId = (): string | null => useSearchParams().get("company");
export const openCompany = (id: string) => openSheet("company", id);
export const closeCompany = () => closeSheet("company");

export const useOpenDealId = (): string | null => useSearchParams().get("deal");
export const openDeal = (id: string) => openSheet("deal", id);
export const closeDeal = () => closeSheet("deal");

export const useOpenContactId = (): string | null => useSearchParams().get("contact");
export const openContact = (id: string) => openSheet("contact", id);
export const closeContact = () => closeSheet("contact");

/** The sequence open on the sequences page (?sequence=id); without it, the page lists them all. */
export const useOpenSequenceId = (): string | null => useSearchParams().get("sequence");
export const openSequence = (id: string) =>
  replaceSearchParams((p) => {
    p.set("sequence", id);
  });
export const closeSequence = () =>
  replaceSearchParams((p) => {
    p.delete("sequence");
  });

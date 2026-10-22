"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_DEAL_FILTERS, DEFAULT_FILTERS, DEFAULT_FORECAST_FILTERS } from "@/lib/constants";
import { OWNER_NAMES } from "@/lib/data/people";
import type { CompanyFilters, DealFilters, ForecastFilters } from "@/lib/types";
import {
  parseCompanyFilters,
  parseDealFilters,
  parseForecastFilters,
  toHref,
  writeCompanyFilters,
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

// One sheet at a time: opening a company closes an open deal, and the other way round.

/** The company whose detail sheet is open (?company=id), on any page. */
export function useOpenCompanyId(): string | null {
  return useSearchParams().get("company");
}

export function openCompany(id: string): void {
  replaceSearchParams((p) => {
    p.delete("deal");
    p.set("company", id);
  });
}

export function closeCompany(): void {
  replaceSearchParams((p) => {
    p.delete("company");
  });
}

/** The deal whose sheet is open (?deal=id), on any page. */
export function useOpenDealId(): string | null {
  return useSearchParams().get("deal");
}

export function openDeal(id: string): void {
  replaceSearchParams((p) => {
    p.delete("company");
    p.set("deal", id);
  });
}

export function closeDeal(): void {
  replaceSearchParams((p) => {
    p.delete("deal");
  });
}

import { DEFAULT_DEAL_FILTERS, DEFAULT_FILTERS } from "./constants";
import { slugify } from "./text";
import {
  ACTIVITY_WINDOWS,
  CLOSE_WINDOWS,
  REGIONS,
  SEGMENTS,
  STAGES,
  TEAMS,
  type ActivityWindow,
  type CloseWindow,
  type CompanyFilters,
  type DealFilters,
  type ForecastFilters,
  type Region,
  type SortKey,
  type Tag,
  type Team,
} from "./types";

// Short, readable URL values: ?sort=win&owner=kenji-mori&tag=mid-market&activity=30

const SORT_PARAM: Record<SortKey, string> = {
  pipelineValue: "pipeline",
  winProbability: "win",
  openDeals: "deals",
  lastInteraction: "recent",
  name: "name",
};
const SORT_BY_PARAM = new Map(Object.entries(SORT_PARAM).map(([key, param]) => [param, key as SortKey]));
const TAG_BY_SLUG = new Map<string, Tag>([...SEGMENTS, ...STAGES].map((tag) => [slugify(tag), tag]));

function oneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : null;
}

function ownerFromSlug(slug: string | null, owners: readonly string[]): string | null {
  return slug ? (owners.find((name) => slugify(name) === slug) ?? null) : null;
}

/** Unknown or malformed values fall back to the defaults. */
export function parseCompanyFilters(params: URLSearchParams, owners: readonly string[]): CompanyFilters {
  const activity = Number(params.get("activity"));
  return {
    sortBy: SORT_BY_PARAM.get(params.get("sort") ?? "") ?? DEFAULT_FILTERS.sortBy,
    owner: ownerFromSlug(params.get("owner"), owners),
    tag: TAG_BY_SLUG.get(params.get("tag") ?? "") ?? null,
    activityWindow: (ACTIVITY_WINDOWS as readonly number[]).includes(activity)
      ? (activity as ActivityWindow)
      : DEFAULT_FILTERS.activityWindow,
    team: oneOf<Team>(TEAMS, params.get("team")),
    region: oneOf<Region>(REGIONS, params.get("region")),
  };
}

/** Writes the filters into `params`, leaving out defaults so URLs stay short. Other params are kept. */
export function writeCompanyFilters(params: URLSearchParams, filters: CompanyFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => (value === null ? next.delete(key) : next.set(key, value));
  set("sort", filters.sortBy === DEFAULT_FILTERS.sortBy ? null : SORT_PARAM[filters.sortBy]);
  set("owner", filters.owner ? slugify(filters.owner) : null);
  set("tag", filters.tag ? slugify(filters.tag) : null);
  set("activity", filters.activityWindow === DEFAULT_FILTERS.activityWindow ? null : String(filters.activityWindow));
  set("team", filters.team);
  set("region", filters.region);
  return next;
}

export function parseDealFilters(params: URLSearchParams, owners: readonly string[]): DealFilters {
  return {
    owner: ownerFromSlug(params.get("owner"), owners),
    close: oneOf<CloseWindow>(CLOSE_WINDOWS, params.get("close")) ?? DEFAULT_DEAL_FILTERS.close,
  };
}

export function writeDealFilters(params: URLSearchParams, filters: DealFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filters.owner) next.set("owner", slugify(filters.owner));
  else next.delete("owner");
  if (filters.close) next.set("close", filters.close);
  else next.delete("close");
  return next;
}

// The forecast shows this quarter unless ?quarter=next.
export function parseForecastFilters(params: URLSearchParams, owners: readonly string[]): ForecastFilters {
  return {
    period: params.get("quarter") === "next" ? "next" : "this",
    owner: ownerFromSlug(params.get("owner"), owners),
    team: oneOf<Team>(TEAMS, params.get("team")),
  };
}

export function writeForecastFilters(params: URLSearchParams, filters: ForecastFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => (value === null ? next.delete(key) : next.set(key, value));
  set("quarter", filters.period === "next" ? "next" : null);
  set("owner", filters.owner ? slugify(filters.owner) : null);
  set("team", filters.team);
  return next;
}

export function toHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

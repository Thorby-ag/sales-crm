import type { ActivityFilters, BuyingRole, CompanyFilters, ContactFilters, DealFilters, DealStage, ForecastCategory, ForecastFilters, OpenDealStage, SortKey, Tag } from "./types";

export const DEFAULT_FILTERS: CompanyFilters = {
  sortBy: "pipelineValue",
  owner: null,
  tag: null,
  activityWindow: 90,
  team: null,
  region: null,
};

export const DEFAULT_DEAL_FILTERS: DealFilters = { owner: null, close: null };

export const DEFAULT_FORECAST_FILTERS: ForecastFilters = { period: "this", owner: null, team: null };

export const DEFAULT_CONTACT_FILTERS: ContactFilters = { query: "", role: null };

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = { view: "todo", owner: null, type: null };

export const SORT_KEYS: SortKey[] = ["pipelineValue", "winProbability", "openDeals", "lastInteraction", "name"];

export type TagTone = "blue" | "purple" | "green" | "moss" | "red" | "orange" | "amber" | "teal" | "yellow" | "neutral";

export const TAG_TONES: Record<Tag, TagTone> = {
  Enterprise: "blue",
  "Mid-Market": "moss",
  SMB: "yellow",
  Strategic: "red",
  "New Logo": "teal",
  Upsell: "purple",
  Expansion: "green",
  Renewal: "neutral",
  Pilot: "orange",
  "Co-Sell": "amber",
  "Land & Expand": "green",
};

export const DEAL_STAGE_TONES: Record<DealStage, TagTone> = {
  discovery: "red",
  evaluation: "amber",
  procurement: "green",
  won: "teal",
  lost: "neutral",
};

export const BUYING_ROLE_TONES: Record<BuyingRole, TagTone> = {
  decisionMaker: "purple",
  champion: "green",
  influencer: "blue",
  endUser: "neutral",
  blocker: "red",
};

/** Probability a deal takes when it moves into a stage. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  discovery: 20,
  evaluation: 50,
  procurement: 80,
  won: 100,
  lost: 0,
};

/** The forecast category an open deal counts in unless someone overrides it. */
export const STAGE_CATEGORY: Record<OpenDealStage, ForecastCategory> = {
  discovery: "pipeline",
  evaluation: "bestCase",
  procurement: "commit",
};

/** Which open stage a probability falls in, for seeded and newly created deals. */
export function stageForProbability(probability: number): OpenDealStage {
  if (probability >= 65) return "procurement";
  if (probability >= 35) return "evaluation";
  return "discovery";
}

/** Which bars of the activity sparkline are highlighted. */
export const TREND_HIGHLIGHT = [false, true, true, false, true, true, false, true, false, true, false, true, true, false];

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
/** Uploaded logos are downscaled to this size before they're stored. */
export const LOGO_STORED_SIZE = 96;

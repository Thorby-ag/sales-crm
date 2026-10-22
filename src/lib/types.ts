export const LOCALES = ["en", "es"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const SEGMENTS = ["Enterprise", "Mid-Market", "SMB", "Strategic"] as const;
export const STAGES = ["New Logo", "Upsell", "Expansion", "Renewal", "Pilot", "Co-Sell", "Land & Expand"] as const;
export const INTERACTION_TYPES = [
  "discovery",
  "demo",
  "pricing",
  "security",
  "legal",
  "product",
  "pilot",
  "exec",
  "qbr",
  "partner",
  "renewal",
  "expansion",
] as const;
export const ACTIVITY_WINDOWS = [7, 30, 60, 90] as const;
export const TREND_WINDOWS = [7, 30, 90] as const;
export const REGIONS = ["north-america", "emea", "apac"] as const;
export const TEAMS = ["strategic", "mid-market", "sdr"] as const;
export const DEAL_STAGES = ["discovery", "evaluation", "procurement", "won", "lost"] as const;
export const OPEN_DEAL_STAGES = ["discovery", "evaluation", "procurement"] as const;
export const CLOSE_WINDOWS = ["quarter", "overdue"] as const;
/** How confident the team is that an open deal closes in its quarter, from most to least. */
export const FORECAST_CATEGORIES = ["commit", "bestCase", "pipeline", "omitted"] as const;
export const FORECAST_PERIODS = ["this", "next"] as const;

/** Segment and stage tags are sales jargon: they stay in English in every locale. */
export type Segment = (typeof SEGMENTS)[number];
export type Stage = (typeof STAGES)[number];
export type Tag = Segment | Stage;
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export type ActivityWindow = (typeof ACTIVITY_WINDOWS)[number];
export type TrendWindow = (typeof TREND_WINDOWS)[number];
export type Region = (typeof REGIONS)[number];
export type Team = (typeof TEAMS)[number];
export type DealStage = (typeof DEAL_STAGES)[number];
export type OpenDealStage = (typeof OPEN_DEAL_STAGES)[number];
export type CloseWindow = (typeof CLOSE_WINDOWS)[number];
export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number];
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number];
export type SortKey = "pipelineValue" | "winProbability" | "openDeals" | "lastInteraction" | "name";

export type LogoMark = "orbit" | "bars" | "diamond" | "split" | "grid" | "wave" | "peak" | "ring" | "spark" | "hex";
export type CompanyLogo = { kind: "mark"; mark: LogoMark; color: string } | { kind: "image"; src: string };

export interface Person {
  name: string;
  role: string;
  team: Team;
  email: string;
  phone: string;
  avatar: string;
  /** Quarterly bookings target. For the head of sales, the whole team's. */
  quota: number;
}

/** A stored account. Deal metrics are derived from its deals (see CompanyRow). */
export interface Company {
  id: string;
  name: string;
  tags: Tag[];
  owner: string;
  region: Region;
  /** 14 activity buckets, each 1–14 */
  trend: number[];
  lastInteraction: { date: string; type: InteractionType };
  logo: CompanyLogo;
}

export interface Deal {
  id: string;
  companyId: string;
  name: string;
  stage: DealStage;
  amount: number;
  /** 0–100 */
  probability: number;
  /** Expected close date while open, actual close date once won or lost. */
  closeDate: string;
  owner: string;
  /** Set when someone overrides the forecast category the stage implies (see forecastCategory). */
  forecast?: ForecastCategory;
}

/** A company plus the metrics derived from its open deals. */
export interface CompanyRow extends Company {
  openDeals: number;
  pipelineValue: number;
  /** Amount-weighted win probability of open deals; null without open deals. */
  winProbability: number | null;
}

export interface CompanyFilters {
  sortBy: SortKey;
  /** null = all owners */
  owner: string | null;
  /** null = any segment or stage */
  tag: Tag | null;
  activityWindow: ActivityWindow;
  team: Team | null;
  region: Region | null;
}

export interface DealFilters {
  owner: string | null;
  close: CloseWindow | null;
}

export interface ForecastFilters {
  period: ForecastPeriod;
  owner: string | null;
  team: Team | null;
}

export type NotificationKind = "mention" | "stage" | "winDrop" | "scoreUpdate" | "demoLogged" | "pipelineUp" | "invite";

export interface CrmNotification {
  id: string;
  kind: NotificationKind;
  actor?: string;
  companyId: string;
  /** Extra values for the translated message, e.g. { value: 23 }. */
  params?: Record<string, string | number>;
  /** Translated quote shown under the message (notifications.quotes). */
  quoteKey?: "n1";
  minutesAgo: number;
  unread: boolean;
}

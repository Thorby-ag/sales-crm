import type { CompanyLogo, InteractionType, Region, Tag } from "../types";

// Activity curves (14 buckets, values 1–14).
const RISING = [3, 5, 8, 4, 6, 9, 7, 10, 6, 11, 8, 12, 9, 14];
const SPIKY = [6, 4, 7, 3, 5, 8, 12, 6, 4, 9, 5, 7, 6, 10];
const STEADY = [2, 3, 2, 5, 4, 6, 5, 8, 7, 9, 11, 10, 12, 13];
const FADING = [9, 7, 8, 6, 10, 5, 7, 4, 6, 3, 5, 4, 3, 4];
const FLAT = [5, 6, 5, 7, 6, 8, 7, 6, 9, 8, 7, 9, 8, 10];
const BURSTY = [3, 4, 9, 5, 3, 7, 12, 6, 10, 5, 11, 6, 8, 14];

export interface CompanySeed {
  id: string;
  name: string;
  tags: Tag[];
  owner: string;
  region: Region;
  trend: number[];
  /** Days before today, so the demo never looks stale. */
  lastInteraction: { daysAgo: number; type: InteractionType };
  logo: CompanyLogo;
  /**
   * Targets used to generate the company's deals (see seedDealsFor): open deals, their total
   * amount and weighted win probability, and whether the account recently lost a deal.
   */
  deals: { open: number; pipeline: number; win: number; lost?: boolean };
}

/** Fictional accounts. */
export const COMPANY_SEEDS: CompanySeed[] = [
  {
    id: "lumenfold",
    name: "Lumenfold",
    tags: ["Pilot"],
    owner: "Lucas Ferreira",
    region: "north-america",
    trend: RISING,
    lastInteraction: { daysAgo: 73, type: "exec" },
    logo: { kind: "mark", mark: "orbit", color: "#8b7bff" },
    deals: { open: 4, pipeline: 548_200, win: 82 },
  },
  {
    id: "northpeak",
    name: "Northpeak",
    tags: ["Enterprise", "Mid-Market"],
    owner: "Grace Adeyemi",
    region: "north-america",
    trend: SPIKY,
    lastInteraction: { daysAgo: 3, type: "pricing" },
    logo: { kind: "mark", mark: "peak", color: "#5eb1ff" },
    deals: { open: 4, pipeline: 512_000, win: 24 },
  },
  {
    id: "quantora",
    name: "Quantora",
    tags: ["Expansion", "SMB", "Upsell", "Pilot"],
    owner: "Kenji Mori",
    region: "apac",
    trend: BURSTY,
    lastInteraction: { daysAgo: 5, type: "demo" },
    logo: { kind: "mark", mark: "diamond", color: "#f472b6" },
    deals: { open: 2, pipeline: 446_900, win: 44, lost: true },
  },
  {
    id: "brightwave",
    name: "Brightwave",
    tags: ["Mid-Market", "Upsell", "Renewal", "Co-Sell"],
    owner: "Omar Haddad",
    region: "emea",
    trend: FLAT,
    lastInteraction: { daysAgo: 44, type: "pricing" },
    logo: { kind: "mark", mark: "wave", color: "#4fd1c5" },
    deals: { open: 2, pipeline: 418_750, win: 38 },
  },
  {
    id: "maison-vale",
    name: "Maison Vale",
    tags: ["Enterprise", "Upsell", "Expansion", "Renewal"],
    owner: "Sofia Marin",
    region: "emea",
    trend: STEADY,
    lastInteraction: { daysAgo: 84, type: "qbr" },
    logo: { kind: "mark", mark: "ring", color: "#facc15" },
    deals: { open: 4, pipeline: 405_000, win: 70 },
  },
  {
    id: "cobaltix",
    name: "Cobaltix",
    tags: ["Mid-Market", "Co-Sell"],
    owner: "Nina Petrova",
    region: "emea",
    trend: FADING,
    lastInteraction: { daysAgo: 18, type: "discovery" },
    logo: { kind: "mark", mark: "hex", color: "#5eb1ff" },
    deals: { open: 3, pipeline: 338_400, win: 23, lost: true },
  },
  {
    id: "halcyon-air",
    name: "Halcyon Air",
    tags: ["Strategic", "Expansion"],
    owner: "Mateo Alvarez",
    region: "north-america",
    trend: RISING,
    lastInteraction: { daysAgo: 70, type: "pilot" },
    logo: { kind: "mark", mark: "spark", color: "#ffb547" },
    deals: { open: 5, pipeline: 326_100, win: 86 },
  },
  {
    id: "orbitra",
    name: "Orbitra",
    tags: ["Enterprise", "New Logo"],
    owner: "Daniel Okafor",
    region: "emea",
    trend: SPIKY,
    lastInteraction: { daysAgo: 81, type: "demo" },
    logo: { kind: "mark", mark: "orbit", color: "#3dd68c" },
    deals: { open: 3, pipeline: 309_800, win: 51 },
  },
  {
    id: "sablecrest",
    name: "Sablecrest",
    tags: ["Expansion", "Land & Expand", "Renewal"],
    owner: "Aisha Bello",
    region: "north-america",
    trend: BURSTY,
    lastInteraction: { daysAgo: 22, type: "partner" },
    logo: { kind: "mark", mark: "split", color: "#ff7a7a" },
    deals: { open: 4, pipeline: 284_300, win: 38 },
  },
  {
    id: "kestrel",
    name: "Kestrel",
    tags: ["Enterprise", "Mid-Market"],
    owner: "Chloe Bennett",
    region: "apac",
    trend: STEADY,
    lastInteraction: { daysAgo: 58, type: "product" },
    logo: { kind: "mark", mark: "bars", color: "#8b7bff" },
    deals: { open: 3, pipeline: 236_500, win: 61 },
  },
  {
    id: "pinegrove",
    name: "Pinegrove",
    tags: ["Renewal"],
    owner: "Hana Sato",
    region: "apac",
    trend: FLAT,
    lastInteraction: { daysAgo: 67, type: "legal" },
    logo: { kind: "mark", mark: "peak", color: "#3dd68c" },
    deals: { open: 2, pipeline: 224_000, win: 77 },
  },
  {
    id: "zephyra",
    name: "Zephyra",
    tags: ["Mid-Market"],
    owner: "Tomas Novak",
    region: "emea",
    trend: RISING,
    lastInteraction: { daysAgo: 41, type: "pilot" },
    logo: { kind: "mark", mark: "wave", color: "#f472b6" },
    deals: { open: 2, pipeline: 219_600, win: 72 },
  },
  {
    id: "ferrolite",
    name: "Ferrolite",
    tags: ["Expansion", "Co-Sell", "Renewal", "Pilot"],
    owner: "Zoe Carter",
    region: "north-america",
    trend: SPIKY,
    lastInteraction: { daysAgo: 1, type: "qbr" },
    logo: { kind: "mark", mark: "grid", color: "#ffb547" },
    deals: { open: 2, pipeline: 207_900, win: 52, lost: true },
  },
  {
    id: "tidewell",
    name: "Tidewell",
    tags: ["Land & Expand", "Expansion", "Strategic"],
    owner: "Ryan Mitchell",
    region: "apac",
    trend: STEADY,
    lastInteraction: { daysAgo: 34, type: "expansion" },
    logo: { kind: "mark", mark: "split", color: "#4fd1c5" },
    deals: { open: 3, pipeline: 172_400, win: 55 },
  },
  {
    id: "arclight",
    name: "Arclight",
    tags: ["Co-Sell", "Expansion"],
    owner: "Lea Fontaine",
    region: "north-america",
    trend: FLAT,
    lastInteraction: { daysAgo: 28, type: "renewal" },
    logo: { kind: "mark", mark: "spark", color: "#facc15" },
    deals: { open: 5, pipeline: 141_250, win: 45 },
  },
  {
    id: "veridian",
    name: "Veridian",
    tags: ["Enterprise"],
    owner: "Lucas Ferreira",
    region: "emea",
    trend: FADING,
    lastInteraction: { daysAgo: 74, type: "security" },
    logo: { kind: "mark", mark: "diamond", color: "#3dd68c" },
    deals: { open: 3, pipeline: 126_300, win: 22, lost: true },
  },
  {
    id: "parcelo",
    name: "Parcelo",
    tags: ["Upsell", "Expansion", "SMB", "Pilot"],
    owner: "Emma Lindqvist",
    region: "apac",
    trend: BURSTY,
    lastInteraction: { daysAgo: 65, type: "pricing" },
    logo: { kind: "mark", mark: "grid", color: "#ff7a7a" },
    deals: { open: 2, pipeline: 118_700, win: 51 },
  },
  {
    id: "hexaloop",
    name: "Hexaloop",
    tags: ["SMB", "Enterprise", "Expansion", "Pilot"],
    owner: "Kenji Mori",
    region: "north-america",
    trend: FADING,
    lastInteraction: { daysAgo: 48, type: "renewal" },
    logo: { kind: "mark", mark: "hex", color: "#8b7bff" },
    deals: { open: 4, pipeline: 109_900, win: 24 },
  },
];

/** Deal names are records (data), so they stay as entered in every locale. */
export const DEAL_PRODUCTS = [
  "Platform license",
  "Analytics add-on",
  "Seat expansion",
  "Data connectors",
  "Premium support",
  "Security package",
  "Pilot program",
  "API access",
  "Onboarding services",
  "Workflow automation",
  "Multi-region rollout",
  "Reporting suite",
];

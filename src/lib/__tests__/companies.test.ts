import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  activitySummary,
  assignOwner,
  companiesByOwner,
  createCompany,
  daysSinceInteraction,
  deleteCompanies,
  filterCompanies,
  generatedLogo,
  pipelineSummary,
  scoreCards,
  searchCompanies,
  slugify,
  splitTags,
  validateLogoFile,
  validateNewCompany,
  weightedPipeline,
  type NewCompanyForm,
} from "../companies";
import { DEFAULT_FILTERS } from "../constants";
import { companyRows } from "../deals";
import { seedDemo } from "../seed";
import type { Team } from "../types";
import { activity, company, contact, deal, row, TODAY } from "./fixtures";

const a = row({ id: "a", name: "Alpha", owner: "Ada", pipelineValue: 300, winProbability: 20, openDeals: 5, tags: ["SMB", "Pilot"], region: "apac", lastInteraction: { date: "2026-10-14", type: "demo" } });
const b = row({ id: "b", name: "Bravo", owner: "Ben", pipelineValue: 500, winProbability: 80, openDeals: 1, tags: ["Enterprise"], region: "emea", lastInteraction: { date: "2026-08-01", type: "exec" } });
const c = row({ id: "c", name: "Charlie", owner: "Ada", pipelineValue: 100, winProbability: 60, openDeals: 3, tags: ["Enterprise", "Renewal"], region: "emea", lastInteraction: { date: "2026-09-20", type: "legal" } });
const all = [c, a, b];
const teams: Record<string, Team> = { Ada: "strategic", Ben: "sdr" };
const teamOf = (owner: string) => teams[owner];
const filter = (overrides: Partial<typeof DEFAULT_FILTERS>) => filterCompanies(all, { ...DEFAULT_FILTERS, ...overrides }, TODAY, teamOf).map((x) => x.id);

describe("filterCompanies", () => {
  it("sorts by pipeline value by default", () => {
    expect(filter({})).toEqual(["b", "a", "c"]);
  });

  it.each([
    ["winProbability", ["b", "c", "a"]],
    ["openDeals", ["a", "c", "b"]],
    ["lastInteraction", ["a", "c", "b"]],
    ["name", ["a", "b", "c"]],
  ] as const)("sorts by %s", (sortBy, expected) => {
    expect(filter({ sortBy })).toEqual(expected);
  });

  it("puts accounts without open deals last when sorting by win probability", () => {
    const none = row({ id: "z", name: "Zero", winProbability: null, openDeals: 0, pipelineValue: 0 });
    const ids = filterCompanies([none, a], { ...DEFAULT_FILTERS, sortBy: "winProbability" }, TODAY, teamOf).map((x) => x.id);
    expect(ids).toEqual(["a", "z"]);
  });

  it("filters by owner, tag, team and region", () => {
    expect(filter({ owner: "Ada" })).toEqual(["a", "c"]);
    expect(filter({ tag: "Enterprise" })).toEqual(["b", "c"]);
    expect(filter({ team: "sdr" })).toEqual(["b"]);
    expect(filter({ region: "emea" })).toEqual(["b", "c"]);
    expect(filter({ region: "emea", team: "strategic" })).toEqual(["c"]);
  });

  it("filters by days since the last interaction, inclusive", () => {
    expect(filter({ activityWindow: 7 })).toEqual(["a"]);
    expect(filter({ activityWindow: 30 })).toEqual(["a", "c"]);
    const edge = row({ id: "edge", lastInteraction: { date: "2026-10-09", type: "demo" } });
    expect(filterCompanies([edge], { ...DEFAULT_FILTERS, activityWindow: 7 }, TODAY, teamOf)).toHaveLength(1);
  });

  it("returns an empty list when nothing matches, without mutating the input", () => {
    const input = [...all];
    expect(filterCompanies(input, { ...DEFAULT_FILTERS, owner: "Ben", tag: "Pilot" }, TODAY, teamOf)).toEqual([]);
    expect(input).toEqual(all);
  });

  it("breaks ties by name so the order is stable", () => {
    const x = row({ id: "x", name: "Zulu", pipelineValue: 10 });
    const y = row({ id: "y", name: "Yankee", pipelineValue: 10 });
    expect(filterCompanies([x, y], DEFAULT_FILTERS, TODAY, teamOf).map((k) => k.id)).toEqual(["y", "x"]);
  });

  it("shows every seeded company with the default 90-day window", () => {
    const { companies, deals } = seedDemo(TODAY);
    expect(filterCompanies(companyRows(companies, deals), DEFAULT_FILTERS, TODAY, teamOf)).toHaveLength(companies.length);
  });
});

describe("daysSinceInteraction", () => {
  it("never goes negative for future dates", () => {
    expect(daysSinceInteraction(company({ id: "f", lastInteraction: { date: "2026-10-20", type: "demo" } }), TODAY)).toBe(0);
    expect(daysSinceInteraction(a, TODAY)).toBe(2);
  });
});

describe("activeFilterCount", () => {
  it("counts every narrowing filter but not the sort order", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sortBy: "name" })).toBe(0);
    expect(activeFilterCount({ sortBy: "name", owner: "Ada", tag: "SMB", activityWindow: 7, team: "sdr", region: "apac" })).toBe(5);
  });
});

describe("splitTags", () => {
  it("shows up to two tags that fit in 20 characters", () => {
    expect(splitTags(["Enterprise", "Mid-Market"])).toEqual({ visible: ["Enterprise", "Mid-Market"], hidden: [] });
    expect(splitTags(["Expansion", "SMB", "Upsell", "Pilot"])).toEqual({ visible: ["Expansion", "SMB"], hidden: ["Upsell", "Pilot"] });
  });

  it("moves a tag to the overflow when it would exceed the character budget", () => {
    expect(splitTags(["Land & Expand", "Expansion", "Strategic"])).toEqual({ visible: ["Land & Expand"], hidden: ["Expansion", "Strategic"] });
  });

  it("always shows the first tag and handles empty lists", () => {
    expect(splitTags(["Land & Expand"], { maxChars: 4 }).visible).toEqual(["Land & Expand"]);
    expect(splitTags([])).toEqual({ visible: [], hidden: [] });
  });
});

describe("activitySummary", () => {
  it("keeps total touches equal to emails + meetings + calls", () => {
    for (const window of [7, 30, 90] as const) {
      for (const openDeals of [0, 1, 3, 9]) {
        const s = activitySummary(row({ id: "s", openDeals }), window);
        expect(s.emails + s.meetings + s.calls).toBe(s.touches);
        expect(s.calls).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("grows with the time window", () => {
    const [w7, w30, w90] = ([7, 30, 90] as const).map((w) => activitySummary(c, w).score);
    expect(w7).toBeLessThan(w30!);
    expect(w30).toBeLessThan(w90!);
    expect(w30).toBe(105);
  });
});

describe("scoreCards", () => {
  it("returns three distinct cards with 1–5 stars and a matching verdict", () => {
    for (const win of [null, 0, 40, 100]) {
      const cards = scoreCards(row({ id: "k", winProbability: win, openDeals: 4 }));
      expect(new Set(cards.map((card) => card.id)).size).toBe(3);
      for (const card of cards) {
        expect(card.stars).toBeGreaterThanOrEqual(1);
        expect(card.stars).toBeLessThanOrEqual(5);
        expect(card.verdict).toBe(card.stars >= 4 ? "high" : card.stars === 3 ? "promising" : "attention");
      }
    }
  });

  it("applies reviewer overrides, clamped to 1–5", () => {
    const cards = scoreCards(row({ id: "k", winProbability: 90 }), [2, 9]);
    expect(cards.map((card) => card.stars)).toEqual([2, 5, 5]);
    expect(cards[0]?.verdict).toBe("attention");
  });
});

describe("pipeline aggregates", () => {
  it("summarizes accounts, deals, pipeline and average win", () => {
    expect(pipelineSummary(all)).toEqual({ accounts: 3, openDeals: 9, pipeline: 900, avgWin: 53 });
  });

  it("leaves accounts without open deals out of the average", () => {
    const none = row({ id: "z", winProbability: null, openDeals: 0, pipelineValue: 0 });
    expect(pipelineSummary([a, none]).avgWin).toBe(20);
    expect(pipelineSummary([])).toEqual({ accounts: 0, openDeals: 0, pipeline: 0, avgWin: 0 });
    expect(weightedPipeline([])).toBe(0);
  });

  it("weights pipeline by win probability", () => {
    expect(weightedPipeline(all)).toBe(60 + 400 + 60);
  });

  it("lists an owner's accounts by pipeline value", () => {
    expect(companiesByOwner(all, "Ada").map((x) => x.id)).toEqual(["a", "c"]);
    expect(companiesByOwner(all, "Nobody")).toEqual([]);
  });
});

describe("searchCompanies", () => {
  it("returns everything by most recent interaction for an empty query", () => {
    expect(searchCompanies(all, "  ").map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("ranks name prefix > name substring > owner > tag", () => {
    const list = [
      company({ id: "1", name: "Renew Labs", tags: ["SMB"] }),
      company({ id: "2", name: "Ace Renewables", tags: ["SMB"] }),
      company({ id: "3", name: "Other", owner: "Renee Rossi", tags: ["SMB"] }),
      company({ id: "4", name: "Tagged", tags: ["Renewal"] }),
    ];
    expect(searchCompanies(list, "ren").map((x) => x.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("is case and accent insensitive, and returns nothing for unrelated text", () => {
    const list = [company({ id: "m", name: "Maison Vale", owner: "José Núñez" })];
    expect(searchCompanies(list, "MAISON")).toHaveLength(1);
    expect(searchCompanies(list, "nunez")).toHaveLength(1);
    expect(searchCompanies(list, "zzzz")).toEqual([]);
  });
});

describe("validateNewCompany", () => {
  const form: NewCompanyForm = {
    name: "  Acme   Robotics ",
    segment: "Enterprise",
    stage: "New Logo",
    region: "emea",
    owner: "Ada",
    pipelineValue: "275000",
    openDeals: "3",
    winProbability: 50,
    interactionDate: TODAY,
    interactionType: "discovery",
    logoSrc: null,
  };

  it("normalizes a valid form", () => {
    const result = validateNewCompany(form, TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ name: "Acme Robotics", pipelineValue: 275000, openDeals: 3 });
  });

  it("requires a name", () => {
    expect(validateNewCompany({ ...form, name: "   " }, TODAY)).toEqual({ ok: false, errors: { name: "nameRequired" } });
  });

  it("treats empty numbers as zero and rejects invalid ones", () => {
    const empty = validateNewCompany({ ...form, pipelineValue: "", openDeals: "" }, TODAY);
    expect(empty.ok && empty.value.pipelineValue === 0 && empty.value.openDeals === 0).toBe(true);
    const bad = validateNewCompany({ ...form, pipelineValue: "-5", openDeals: "1.5" }, TODAY);
    expect(bad).toEqual({ ok: false, errors: { pipelineValue: "amount", openDeals: "wholeNumber" } });
    expect(validateNewCompany({ ...form, openDeals: "21" }, TODAY)).toEqual({ ok: false, errors: { openDeals: "tooManyDeals" } });
  });

  it("rejects future or missing dates", () => {
    expect(validateNewCompany({ ...form, interactionDate: "2026-10-17" }, TODAY)).toEqual({ ok: false, errors: { interactionDate: "futureDate" } });
    expect(validateNewCompany({ ...form, interactionDate: "" }, TODAY)).toEqual({ ok: false, errors: { interactionDate: "date" } });
  });
});

describe("validateLogoFile", () => {
  it("accepts supported images up to 2 MB", () => {
    expect(validateLogoFile({ type: "image/svg+xml", size: 2 * 1024 * 1024 })).toBeNull();
    expect(validateLogoFile({ type: "image/gif", size: 10 })).toBe("type");
    expect(validateLogoFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toBe("size");
  });
});

describe("createCompany", () => {
  const input = {
    name: "Acme Robotics",
    segment: "Enterprise" as const,
    stage: "Pilot" as const,
    region: "apac" as const,
    owner: "Ada",
    pipelineValue: 90_000,
    openDeals: 3,
    winProbability: 40,
    interactionDate: "2026-10-01",
    interactionType: "demo" as const,
    logoSrc: null,
  };

  it("derives a unique id and the tags from segment and stage", () => {
    const first = createCompany(input, [a, b], TODAY).company;
    expect(first.id).toBe("acme-robotics");
    expect(first.tags).toEqual(["Enterprise", "Pilot"]);
    expect(createCompany(input, [a, first], TODAY).company.id).toBe("acme-robotics-2");
  });

  it("creates open deals that add up to the pipeline value and win probability", () => {
    const { company: created, deals } = createCompany(input, [], TODAY);
    const [rowForCompany] = companyRows([created], deals);
    expect(deals).toHaveLength(3);
    expect(rowForCompany).toMatchObject({ openDeals: 3, pipelineValue: 90_000 });
    expect(Math.abs((rowForCompany?.winProbability ?? 0) - 40)).toBeLessThanOrEqual(1);
    expect(createCompany({ ...input, openDeals: 0 }, [], TODAY).deals).toEqual([]);
  });

  it("uses the uploaded logo or a deterministic generated mark", () => {
    expect(createCompany({ ...input, logoSrc: "data:image/png;base64,AAA" }, [], TODAY).company.logo).toEqual({ kind: "image", src: "data:image/png;base64,AAA" });
    expect(createCompany(input, [], TODAY).company.logo).toEqual(generatedLogo("acme-robotics"));
  });
});

describe("bulk changes", () => {
  const records = {
    companies: [company({ id: "a" }), company({ id: "b", owner: "Ben" })],
    deals: [deal({ id: "a1", companyId: "a" }), deal({ id: "a2", companyId: "a", stage: "won" }), deal({ id: "b1", companyId: "b", owner: "Ben" })],
    contacts: [contact({ id: "ann", companyId: "a" }), contact({ id: "bob", companyId: "b" })],
    activities: [activity({ id: "call", companyId: "a" }), activity({ id: "demo", companyId: "a", done: true }), activity({ id: "qbr", companyId: "b", owner: "Ben" })],
    sequences: [],
    enrollments: [
      { id: "s--ann", sequenceId: "s", contactId: "ann", enrolledAt: "2026-10-01", repliedAt: null },
      { id: "s--bob", sequenceId: "s", contactId: "bob", enrolledAt: "2026-10-01", repliedAt: null },
    ],
  };

  it("reassigns accounts and their open deals only", () => {
    const next = assignOwner(records, ["a"], "Zoe");
    expect(next.companies.map((x) => x.owner)).toEqual(["Zoe", "Ben"]);
    expect(next.deals.map((x) => x.owner)).toEqual(["Zoe", "Ada", "Ben"]);
    expect(next.activities.map((x) => x.owner)).toEqual(["Zoe", "Ada", "Ben"]);
    expect(next.contacts).toBe(records.contacts);
  });

  it("deletes accounts together with their deals, contacts, activities and enrollments", () => {
    const next = deleteCompanies(records, ["a"]);
    expect(next.enrollments.map((x) => x.id)).toEqual(["s--bob"]);
    expect(next.companies.map((x) => x.id)).toEqual(["b"]);
    expect(next.deals.map((x) => x.id)).toEqual(["b1"]);
    expect(next.contacts.map((x) => x.id)).toEqual(["bob"]);
    expect(next.activities.map((x) => x.id)).toEqual(["qbr"]);
  });
});

describe("slugify", () => {
  it("creates URL-safe ids", () => {
    expect(slugify("Maison Vale & Co.")).toBe("maison-vale-co");
    expect(slugify("Ñandú Café")).toBe("nandu-cafe");
    expect(slugify("!!!")).toBe("");
  });
});

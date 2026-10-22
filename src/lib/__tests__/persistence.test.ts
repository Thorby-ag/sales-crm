import { describe, expect, it } from "vitest";
import { restoreDemo, serializeDemo, shiftDemo, type DemoState } from "../persistence";
import { seedDemo } from "../seed";
import { activity, company, contact, deal, TODAY } from "./fixtures";

const state: DemoState = {
  companies: [company({ id: "a", lastInteraction: { date: "2026-10-10", type: "demo" } })],
  deals: [deal({ id: "d1", companyId: "a", closeDate: "2026-11-01", forecast: "commit" })],
  contacts: [contact({ id: "ann", companyId: "a" })],
  activities: [activity({ id: "call", companyId: "a", date: "2026-10-20" })],
  scoreOverrides: { a: [5, 4, 3] },
  unreadIds: ["n1"],
};

describe("persistence", () => {
  it("round-trips the saved state on the same day", () => {
    expect(restoreDemo(serializeDemo(state, TODAY), TODAY)).toEqual(state);
  });

  it("moves every date forward by the days since it was saved", () => {
    const restored = restoreDemo(serializeDemo(state, TODAY), "2026-10-26");
    expect(restored?.companies[0]?.lastInteraction.date).toBe("2026-10-20");
    expect(restored?.deals[0]?.closeDate).toBe("2026-11-11");
    expect(restored?.activities[0]?.date).toBe("2026-10-30");
    expect(restored?.scoreOverrides).toEqual(state.scoreOverrides);
  });

  it("keeps seeded data looking the same no matter when it's restored", () => {
    const saved = serializeDemo({ ...seedDemo(TODAY), scoreOverrides: {}, unreadIds: [] }, TODAY);
    const later = "2027-03-02";
    const restored = restoreDemo(saved, later);
    const { companies, deals, contacts, activities } = seedDemo(later);
    expect(restored?.companies).toEqual(companies);
    expect(restored?.deals).toEqual(deals);
    expect(restored?.contacts).toEqual(contacts);
    expect(restored?.activities).toEqual(activities);
  });

  it("seeds contacts and activities for data saved before they existed", () => {
    const { companies, deals } = seedDemo(TODAY);
    const kept = companies.filter((c) => c.id !== "lumenfold");
    const saved = JSON.parse(
      serializeDemo({ companies: kept, deals, contacts: [], activities: [], scoreOverrides: {}, unreadIds: [] }, TODAY),
    ) as Record<string, unknown>;
    delete saved.contacts;
    delete saved.activities;
    const restored = restoreDemo(JSON.stringify(saved), "2026-10-26");
    expect(restored?.contacts.length).toBeGreaterThan(0);
    expect(restored?.contacts.some((c) => c.companyId === "lumenfold")).toBe(false);
    expect(restored?.activities.length).toBeGreaterThan(0);
    expect(restored?.activities.some((a) => a.companyId === "lumenfold")).toBe(false);
    // Seeded as of the day it was saved, then moved forward like everything else.
    expect(restored?.activities).toEqual(seedDemo("2026-10-26").activities.filter((a) => a.companyId !== "lumenfold"));
  });

  it("ignores missing, corrupt or incompatible data", () => {
    expect(restoreDemo(null, TODAY)).toBeNull();
    expect(restoreDemo("{not json", TODAY)).toBeNull();
    expect(restoreDemo(JSON.stringify({ version: 2, companies: [] }), TODAY)).toBeNull();
    // Version 1 had no won deals for the forecast: start over with fresh data.
    const v1 = JSON.parse(serializeDemo(state, TODAY)) as Record<string, unknown>;
    expect(restoreDemo(JSON.stringify({ ...v1, version: 1 }), TODAY)).toBeNull();
  });

  it("shifts dates in both directions without touching the original", () => {
    const back = shiftDemo(state, -10);
    expect(back.companies[0]?.lastInteraction.date).toBe("2026-09-30");
    expect(state.companies[0]?.lastInteraction.date).toBe("2026-10-10");
    expect(shiftDemo(state, 0)).toBe(state);
  });
});

import { describe, expect, it } from "vitest";
import {
  activityForm,
  activityFromForm,
  completeActivity,
  dealsWithoutNextStep,
  doneActivities,
  dueCount,
  filterActivities,
  logInteraction,
  nextStep,
  plannedGroups,
  upsertActivity,
  validateActivity,
} from "../activities";
import { COMPANY_SEEDS } from "../data/companies";
import { isOpen } from "../deals";
import { addDays } from "../format";
import { seedDemo } from "../seed";
import { activity, company, deal, TODAY } from "./fixtures";

const ids = (list: { id: string }[]) => list.map((a) => a.id);

describe("seeded activities", () => {
  const demo = seedDemo(TODAY);

  it("give every seeded account its history and a next step", () => {
    for (const seed of COMPANY_SEEDS) {
      const own = demo.activities.filter((a) => a.companyId === seed.id && !a.enrollmentId);
      expect(own.filter((a) => a.done).length, seed.id).toBe(2);
      expect(own.some((a) => !a.done), seed.id).toBe(true);
    }
    expect(new Set(ids(demo.activities)).size).toBe(demo.activities.length);
  });

  it("match each company's last interaction, and link to its own deals and contacts", () => {
    for (const company of demo.companies) {
      const latest = doneActivities(demo.activities.filter((a) => a.companyId === company.id))[0]!;
      expect({ date: latest.date, type: latest.topic }, company.id).toEqual(company.lastInteraction);
    }
    for (const a of demo.activities) {
      if (a.dealId) expect(demo.deals.find((d) => d.id === a.dealId)?.companyId).toBe(a.companyId);
      if (a.contactId) expect(demo.contacts.find((c) => c.id === a.contactId)?.companyId).toBe(a.companyId);
    }
  });

  it("plan next steps from a few days overdue to three weeks out, some of them today", () => {
    const planned = demo.activities.filter((a) => !a.done);
    for (const a of planned) {
      expect(a.date >= addDays(TODAY, -6) && a.date <= addDays(TODAY, 21), a.id).toBe(true);
      if (a.dealId) expect(isOpen(demo.deals.find((d) => d.id === a.dealId)!)).toBe(true);
    }
    const groups = plannedGroups(planned, TODAY);
    expect(groups.overdue.length).toBeGreaterThan(0);
    expect(groups.today.length).toBeGreaterThan(0);
    expect(groups.upcoming.length).toBeGreaterThan(0);
  });
});

describe("activity lists", () => {
  const list = [
    activity({ id: "late", date: "2026-10-10" }),
    activity({ id: "now", date: TODAY, type: "meeting", owner: "Ben" }),
    activity({ id: "soon", date: "2026-10-20", dealId: "d1" }),
    activity({ id: "sooner", date: "2026-10-18", dealId: "d1", type: "email" }),
    activity({ id: "done-old", date: "2026-10-01", done: true, dealId: "d2" }),
    activity({ id: "done-new", date: "2026-10-12", done: true }),
  ];

  it("group what's planned by when it's due", () => {
    const groups = plannedGroups(list, TODAY);
    expect(ids(groups.overdue)).toEqual(["late"]);
    expect(ids(groups.today)).toEqual(["now"]);
    expect(ids(groups.upcoming)).toEqual(["sooner", "soon"]);
    expect(dueCount(list, TODAY)).toBe(2);
  });

  it("list what's done, most recent first", () => {
    expect(ids(doneActivities(list))).toEqual(["done-new", "done-old"]);
  });

  it("filter by owner and type", () => {
    expect(ids(filterActivities(list, { owner: "Ben", type: null }))).toEqual(["now"]);
    expect(ids(filterActivities(list, { owner: null, type: "email" }))).toEqual(["sooner"]);
  });

  it("find a deal's next step, and the deals that have none", () => {
    expect(nextStep(list, "d1")?.id).toBe("sooner");
    expect(nextStep(list, "d2")).toBeUndefined();
    const deals = [
      deal({ id: "d1", amount: 900 }),
      deal({ id: "d2", amount: 500 }),
      deal({ id: "d3", amount: 700, closeDate: "2026-10-01" }),
      deal({ id: "next-year", amount: 9_000, closeDate: "2027-02-01" }),
      deal({ id: "won", amount: 9_000, stage: "won" }),
    ];
    expect(ids(dealsWithoutNextStep(deals, list, TODAY))).toEqual(["d3", "d2"]);
  });
});

describe("completing activities", () => {
  const companies = [company({ id: "a", lastInteraction: { date: "2026-10-10", type: "demo" } })];

  it("stamps today and makes it the company's last interaction", () => {
    const next = completeActivity({ activities: [activity({ id: "call", date: "2026-10-12", topic: "pricing" })], companies }, "call", TODAY);
    expect(next.activities[0]).toMatchObject({ done: true, date: TODAY });
    expect(next.companies[0]?.lastInteraction).toEqual({ date: TODAY, type: "pricing" });
  });

  it("only moves the last interaction forward", () => {
    expect(logInteraction(companies, activity({ id: "old", done: true, date: "2026-10-01" }))).toEqual(companies);
    expect(logInteraction(companies, activity({ id: "planned", date: "2026-10-30" }))).toEqual(companies);
    expect(logInteraction(companies, activity({ id: "new", done: true, date: "2026-10-11", topic: "legal" }))[0]?.lastInteraction).toEqual({
      date: "2026-10-11",
      type: "legal",
    });
  });

  it("leaves done activities as they are", () => {
    const list = [activity({ id: "x", done: true, date: "2026-10-01" })];
    expect(completeActivity({ activities: list, companies }, "x", TODAY).activities).toEqual(list);
  });
});

describe("the activity form", () => {
  const form = activityForm(activity({ id: "x", subject: "  Pricing   call ", notes: " bring the numbers " }));
  const companies = new Set(["a"]);

  it("cleans up valid input and keeps empty links as none", () => {
    const result = validateActivity(form, companies, TODAY);
    expect(result).toMatchObject({ ok: true, value: { subject: "Pricing call", notes: "bring the numbers", dealId: "", contactId: "" } });
    if (!result.ok) return;
    const created = activityFromForm(result.value, [activity({ id: "a-pricing-call" })]);
    expect(created).toMatchObject({ id: "a-pricing-call-2", dealId: null, contactId: null });
    const original = activity({ id: "keep", enrollmentId: "seq--ann" });
    expect(activityFromForm(result.value, [], original)).toMatchObject({ id: "keep", enrollmentId: "seq--ann" });
  });

  it("reports missing or invalid fields", () => {
    expect(validateActivity({ ...form, subject: " ", companyId: "zz", date: "" }, companies, TODAY)).toEqual({
      ok: false,
      errors: { subject: "subjectRequired", companyId: "company", date: "date" },
    });
    expect(validateActivity({ ...form, subject: "x".repeat(81) }, companies, TODAY)).toEqual({ ok: false, errors: { subject: "subjectTooLong" } });
  });

  it("doesn't log something as done in the future", () => {
    expect(validateActivity({ ...form, done: true, date: addDays(TODAY, 1) }, companies, TODAY)).toEqual({ ok: false, errors: { date: "futureDone" } });
    expect(validateActivity({ ...form, done: false, date: addDays(TODAY, 1) }, companies, TODAY).ok).toBe(true);
  });

  it("adds new activities and replaces edited ones", () => {
    const list = [activity({ id: "a" }), activity({ id: "b" })];
    expect(ids(upsertActivity(list, activity({ id: "c" })))).toEqual(["c", "a", "b"]);
    expect(upsertActivity(list, activity({ id: "b", subject: "new" }))[1]?.subject).toBe("new");
  });
});

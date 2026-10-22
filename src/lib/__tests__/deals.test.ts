import { describe, expect, it } from "vitest";
import { COMPANY_SEEDS } from "../data/companies";
import {
  applyDealForm,
  changeFormStage,
  companyRows,
  dealForm,
  dealsByStage,
  dealSummary,
  filterDeals,
  forecastCategory,
  generateOpenDeals,
  isOverdue,
  moveDeal,
  pipelineByStage,
  shiftQuarter,
  updateDeal,
  validateDealForm,
  weightedWin,
  withForecastCategory,
} from "../deals";
import { addDays } from "../format";
import { seedDemo } from "../seed";
import { company, deal, TODAY } from "./fixtures";

describe("derived company metrics", () => {
  const deals = [
    deal({ id: "1", companyId: "a", amount: 300, probability: 80 }),
    deal({ id: "2", companyId: "a", amount: 100, probability: 20 }),
    deal({ id: "3", companyId: "a", amount: 999, stage: "won", probability: 100 }),
  ];

  it("counts only open deals and weights win probability by amount", () => {
    const [row] = companyRows([company({ id: "a" }), company({ id: "b" })], deals);
    expect(row).toMatchObject({ openDeals: 2, pipelineValue: 400, winProbability: 65 });
  });

  it("has no win probability without open deals", () => {
    const rows = companyRows([company({ id: "b" })], deals);
    expect(rows[0]).toMatchObject({ openDeals: 0, pipelineValue: 0, winProbability: null });
    expect(weightedWin([])).toBeNull();
  });

  it("splits the open pipeline by stage", () => {
    const slices = pipelineByStage([
      deal({ id: "1", stage: "discovery", amount: 250 }),
      deal({ id: "2", stage: "procurement", amount: 750 }),
      deal({ id: "3", stage: "lost", amount: 5000 }),
    ]);
    expect(slices.discovery).toEqual({ count: 1, amount: 250, share: 25 });
    expect(slices.evaluation).toEqual({ count: 0, amount: 0, share: 0 });
    expect(slices.procurement).toEqual({ count: 1, amount: 750, share: 75 });
  });

  it("summarizes amount and weighted amount", () => {
    expect(dealSummary([deal({ id: "1", amount: 1000, probability: 25 }), deal({ id: "2", amount: 500, probability: 50 })])).toEqual({ count: 2, amount: 1500, weighted: 500 });
  });
});

describe("moveDeal", () => {
  const deals = [deal({ id: "1", stage: "discovery", probability: 15, closeDate: "2026-12-01" }), deal({ id: "2" })];

  it("resets the probability to the stage default and leaves other deals alone", () => {
    const next = moveDeal(deals, "1", "procurement", TODAY);
    expect(next[0]).toMatchObject({ stage: "procurement", probability: 80, closeDate: "2026-12-01" });
    expect(next[1]).toBe(deals[1]);
  });

  it("stamps today as the close date when a deal is won or lost", () => {
    expect(moveDeal(deals, "1", "won", TODAY)[0]).toMatchObject({ stage: "won", probability: 100, closeDate: TODAY });
    expect(moveDeal(deals, "1", "lost", TODAY)[0]).toMatchObject({ stage: "lost", probability: 0 });
  });

  it("returns the same deal when the stage doesn't change", () => {
    expect(moveDeal(deals, "1", "discovery", TODAY)[0]).toBe(deals[0]);
  });

  it("drops a forecast category override, so the new stage's default applies", () => {
    const [moved] = moveDeal([deal({ id: "1", stage: "discovery", forecast: "commit" })], "1", "evaluation", TODAY);
    expect(moved).not.toHaveProperty("forecast");
    expect(forecastCategory(moved!)).toBe("bestCase");
  });

  it("updates one deal and leaves the rest alone", () => {
    const next = updateDeal(deals, "2", (d) => ({ ...d, amount: 7 }));
    expect(next[1]?.amount).toBe(7);
    expect(next[0]).toBe(deals[0]);
  });
});

describe("forecast categories", () => {
  it("follow the stage unless overridden, and closed deals have none", () => {
    expect(forecastCategory(deal({ id: "1", stage: "discovery" }))).toBe("pipeline");
    expect(forecastCategory(deal({ id: "1", stage: "evaluation" }))).toBe("bestCase");
    expect(forecastCategory(deal({ id: "1", stage: "procurement" }))).toBe("commit");
    expect(forecastCategory(deal({ id: "1", stage: "evaluation", forecast: "omitted" }))).toBe("omitted");
    expect(forecastCategory(deal({ id: "1", stage: "won", forecast: "commit" }))).toBeNull();
  });

  it("store an override only when it differs from the stage's default", () => {
    const evaluation = deal({ id: "1", stage: "evaluation" });
    const committed = withForecastCategory(evaluation, "commit");
    expect(committed.forecast).toBe("commit");
    expect(withForecastCategory(committed, "bestCase")).not.toHaveProperty("forecast");
    expect(withForecastCategory(evaluation, "bestCase")).toBe(evaluation);
    const won = deal({ id: "2", stage: "won" });
    expect(withForecastCategory(won, "commit")).toBe(won);
  });
});

describe("moving a deal between quarters", () => {
  it("pushes the close date to the same point of the next quarter", () => {
    expect(shiftQuarter(deal({ id: "1", closeDate: "2026-11-30" }), 1, TODAY).closeDate).toBe("2027-02-28");
    // Overdue deals move too.
    expect(shiftQuarter(deal({ id: "1", closeDate: "2026-10-02" }), 1, TODAY).closeDate).toBe("2027-01-02");
  });

  it("pulls it in, but never to a date before today", () => {
    expect(shiftQuarter(deal({ id: "1", closeDate: "2027-02-10" }), -1, TODAY).closeDate).toBe("2026-11-10");
    expect(shiftQuarter(deal({ id: "1", closeDate: "2027-01-05" }), -1, TODAY).closeDate).toBe(TODAY);
  });

  it("leaves closed deals alone", () => {
    const won = deal({ id: "1", stage: "won", closeDate: "2026-10-02" });
    expect(shiftQuarter(won, 1, TODAY)).toBe(won);
  });
});

describe("editing a deal", () => {
  const open = deal({ id: "1", stage: "evaluation", amount: 42_000, probability: 55, closeDate: "2026-11-20" });

  it("starts the form from the deal", () => {
    expect(dealForm(open)).toEqual({ amount: "42000", closeDate: "2026-11-20", stage: "evaluation", probability: 55, category: "bestCase" });
  });

  it("resets probability and category with the stage, and stamps today when the deal closes", () => {
    const form = dealForm(open);
    expect(changeFormStage(form, "procurement", TODAY)).toMatchObject({ probability: 80, category: "commit", closeDate: "2026-11-20" });
    expect(changeFormStage(form, "won", TODAY)).toMatchObject({ stage: "won", probability: 100, closeDate: TODAY });
    // Reopening keeps the date: it may be overdue until someone sets a new one.
    expect(changeFormStage({ ...form, stage: "lost", closeDate: "2026-10-01" }, "discovery", TODAY)).toMatchObject({ closeDate: "2026-10-01", category: "pipeline" });
  });

  it("validates the amount and the close date", () => {
    const form = dealForm(open);
    expect(validateDealForm({ ...form, amount: "" }, TODAY)).toEqual({ ok: false, errors: { amount: "amount" } });
    expect(validateDealForm({ ...form, amount: "-5" }, TODAY)).toEqual({ ok: false, errors: { amount: "amount" } });
    expect(validateDealForm({ ...form, amount: "200000000" }, TODAY)).toEqual({ ok: false, errors: { amount: "tooLarge" } });
    expect(validateDealForm({ ...form, closeDate: "" }, TODAY)).toEqual({ ok: false, errors: { closeDate: "date" } });
    expect(validateDealForm({ ...form, stage: "won", closeDate: addDays(TODAY, 1) }, TODAY)).toEqual({ ok: false, errors: { closeDate: "futureClose" } });
    // An open deal can be overdue.
    expect(validateDealForm({ ...form, closeDate: "2026-10-01" }, TODAY).ok).toBe(true);
  });

  it("applies the form: open deals keep their probability and category, closed ones take the stage's", () => {
    const valid = (form: ReturnType<typeof dealForm>) => {
      const result = validateDealForm(form, TODAY);
      if (!result.ok) throw new Error("invalid form");
      return result.value;
    };
    const edited = applyDealForm(open, valid({ ...dealForm(open), amount: "51000.4", probability: 62, category: "commit" }));
    expect(edited).toMatchObject({ amount: 51_000, probability: 62, forecast: "commit", closeDate: "2026-11-20" });

    const won = applyDealForm({ ...open, forecast: "omitted" }, valid(changeFormStage(dealForm(open), "won", TODAY)));
    expect(won).toMatchObject({ stage: "won", probability: 100, closeDate: TODAY });
    expect(won).not.toHaveProperty("forecast");
  });
});

describe("filterDeals and dealsByStage", () => {
  const deals = [
    deal({ id: "late", closeDate: "2026-10-01", owner: "Ada" }),
    deal({ id: "soon", closeDate: "2026-11-20", owner: "Ben" }),
    deal({ id: "next-year", closeDate: "2027-01-10", owner: "Ada" }),
    deal({ id: "won-late", stage: "won", closeDate: "2026-10-02", owner: "Ada" }),
  ];
  const ids = (list: { id: string }[]) => list.map((d) => d.id);

  it("finds overdue deals: open and past their close date", () => {
    expect(isOverdue(deals[0]!, TODAY)).toBe(true);
    expect(isOverdue(deals[3]!, TODAY)).toBe(false);
    expect(ids(filterDeals(deals, { owner: null, close: "overdue" }, TODAY))).toEqual(["late"]);
  });

  it("finds open deals closing this quarter", () => {
    expect(ids(filterDeals(deals, { owner: null, close: "quarter" }, TODAY))).toEqual(["late", "soon"]);
  });

  it("filters by owner", () => {
    expect(ids(filterDeals(deals, { owner: "Ben", close: null }, TODAY))).toEqual(["soon"]);
  });

  it("orders open columns by soonest close and closed columns by most recent", () => {
    const columns = dealsByStage([...deals, deal({ id: "won-early", stage: "won", closeDate: "2026-09-01" })]);
    expect(ids(columns.evaluation)).toEqual(["late", "soon", "next-year"]);
    expect(ids(columns.won)).toEqual(["won-late", "won-early"]);
    expect(columns.lost).toEqual([]);
  });
});

describe("generated deals", () => {
  it("add up exactly to the pipeline and land on the target win probability", () => {
    for (const [count, pipeline, win] of [
      [1, 50_000, 30],
      [3, 446_900, 44],
      [5, 326_100, 86],
      [4, 109_900, 24],
    ] as const) {
      const deals = generateOpenDeals({ companyId: `c-${count}-${win}`, owner: "Ada", count, pipeline, win }, TODAY);
      expect(deals).toHaveLength(count);
      expect(deals.reduce((sum, d) => sum + d.amount, 0)).toBe(pipeline);
      expect(Math.abs(weightedWin(deals)! - win)).toBeLessThanOrEqual(1);
      for (const d of deals) {
        expect(d.probability).toBeGreaterThanOrEqual(5);
        expect(d.probability).toBeLessThanOrEqual(95);
      }
    }
  });

  it("seeds every company with the expected open deals, and is deterministic", () => {
    const first = seedDemo(TODAY);
    expect(seedDemo(TODAY)).toEqual(first);
    const rows = companyRows(first.companies, first.deals);
    for (const seed of COMPANY_SEEDS) {
      const r = rows.find((x) => x.id === seed.id)!;
      expect(r.openDeals).toBe(seed.deals.open);
      expect(r.pipelineValue).toBe(seed.deals.pipeline);
      expect(Math.abs(r.winProbability! - seed.deals.win)).toBeLessThanOrEqual(1);
    }
    expect(new Set(first.deals.map((d) => d.id)).size).toBe(first.deals.length);
  });

  it("includes slipping deals and closed deals so every board column has cards", () => {
    const { deals } = seedDemo(TODAY);
    const columns = dealsByStage(deals);
    for (const stage of Object.keys(columns) as (keyof typeof columns)[]) expect(columns[stage].length).toBeGreaterThan(0);
    expect(deals.some((d) => isOverdue(d, TODAY))).toBe(true);
  });

  it("seeds the reps' calls: likely evaluation deals committed, long shots omitted", () => {
    const { deals } = seedDemo(TODAY);
    const overridden = deals.filter((d) => d.forecast);
    expect(overridden.some((d) => d.forecast === "commit" && d.stage === "evaluation")).toBe(true);
    expect(overridden.some((d) => d.forecast === "omitted" && d.stage === "discovery")).toBe(true);
  });

  it("seeds a quarter of past wins and spreads open deals over the next six months", () => {
    const { deals } = seedDemo(TODAY);
    const won = deals.filter((d) => d.stage === "won");
    expect(won.length).toBeGreaterThan(COMPANY_SEEDS.length);
    for (const d of won) {
      expect(d.closeDate < TODAY).toBe(true);
      expect(d.closeDate >= addDays(TODAY, -92)).toBe(true);
    }
    const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost").map((d) => d.closeDate);
    expect(open.some((date) => date > addDays(TODAY, 120))).toBe(true);
    expect(open.every((date) => date <= addDays(TODAY, 180))).toBe(true);
  });
});

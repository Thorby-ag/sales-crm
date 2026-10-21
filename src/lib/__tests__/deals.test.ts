import { describe, expect, it } from "vitest";
import { COMPANY_SEEDS } from "../data/companies";
import {
  companyRows,
  dealsByStage,
  dealSummary,
  filterDeals,
  generateOpenDeals,
  isOverdue,
  moveDeal,
  pipelineByStage,
  weightedWin,
} from "../deals";
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
});

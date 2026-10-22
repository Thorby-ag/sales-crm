import { describe, expect, it } from "vitest";
import { OWNERS } from "../data/people";
import {
  axisTicks,
  bestCaseForecast,
  commitForecast,
  coverage,
  forecastByRep,
  forecastGroups,
  forecastSeries,
  forecastTotals,
  inQuarter,
  openForecast,
  pastDueDeals,
  quarterFor,
  repsInView,
  shareOfQuota,
  weeklyRows,
} from "../forecast";
import { seedDemo } from "../seed";
import type { Team } from "../types";
import { deal, TODAY } from "./fixtures";

const ids = (list: { id: string }[]) => list.map((d) => d.id);
const q4 = quarterFor("this", TODAY);

// Q4 2026, seen on Oct 16 (day 15 of 92).
const deals = [
  deal({ id: "won", stage: "won", amount: 1000, closeDate: "2026-10-05" }),
  deal({ id: "won-last-quarter", stage: "won", amount: 9999, closeDate: "2026-09-30" }),
  deal({ id: "commit", stage: "procurement", amount: 400, probability: 80, closeDate: "2026-11-10" }),
  deal({ id: "best", stage: "evaluation", amount: 300, probability: 50, closeDate: "2026-12-31" }),
  deal({ id: "pipe", stage: "discovery", amount: 200, probability: 20, closeDate: "2026-10-10" }),
  deal({ id: "omit", stage: "evaluation", forecast: "omitted", amount: 500, probability: 50, closeDate: "2026-12-01" }),
  deal({ id: "lost", stage: "lost", amount: 700, closeDate: "2026-10-12" }),
  deal({ id: "next", stage: "procurement", amount: 800, probability: 80, closeDate: "2027-01-01" }),
];

describe("quarters", () => {
  it("finds this quarter and the next one, across the year end", () => {
    expect(q4).toEqual({ start: "2026-10-01", end: "2027-01-01", quarter: 4, year: 2026 });
    expect(quarterFor("next", TODAY)).toEqual({ start: "2027-01-01", end: "2027-04-01", quarter: 1, year: 2027 });
  });

  it("include their first day but not the next quarter's", () => {
    expect(inQuarter("2026-10-01", q4)).toBe(true);
    expect(inQuarter("2026-12-31", q4)).toBe(true);
    expect(inQuarter("2027-01-01", q4)).toBe(false);
  });

  it("show everyone, a team or one rep", () => {
    const people: { name: string; team: Team }[] = [
      { name: "Ada", team: "sdr" },
      { name: "Ben", team: "strategic" },
    ];
    expect(repsInView(people, { owner: null, team: null })).toEqual(people);
    expect(repsInView(people, { owner: null, team: "sdr" })).toEqual([people[0]]);
    expect(repsInView(people, { owner: "Ben", team: "sdr" })).toEqual([]);
  });
});

describe("forecast totals", () => {
  it("add up the quarter's won deals and open deals per category", () => {
    const totals = forecastTotals(deals, q4, 2000);
    expect(totals).toEqual({
      quota: 2000,
      closed: 1000,
      open: { commit: 400, bestCase: 300, pipeline: 200, omitted: 500 },
      // Won, plus each open deal times its probability; omitted deals don't count.
      weighted: 1000 + 320 + 150 + 40,
    });
    expect(commitForecast(totals)).toBe(1400);
    expect(bestCaseForecast(totals)).toBe(1700);
    expect(openForecast(totals)).toBe(900);
    expect(shareOfQuota(commitForecast(totals), totals.quota)).toBe(70);
  });

  it("measure coverage against the quota still to win", () => {
    expect(coverage(forecastTotals(deals, q4, 2000))).toBe(0.9);
    expect(coverage(forecastTotals(deals, q4, 1000))).toBeNull();
    expect(shareOfQuota(500, 0)).toBeNull();
  });

  it("break down by rep, highest share of quota with Commit first", () => {
    const reps = forecastByRep(
      [
        deal({ id: "1", owner: "Ada", stage: "won", amount: 50, closeDate: "2026-10-05" }),
        deal({ id: "2", owner: "Ben", stage: "procurement", amount: 90, closeDate: "2026-11-05" }),
      ],
      q4,
      [
        { name: "Cy", quota: 100 },
        { name: "Ada", quota: 100 },
        { name: "Ben", quota: 100 },
      ],
    );
    expect(reps.map((r) => [r.owner, commitForecast(r)])).toEqual([
      ["Ben", 90],
      ["Ada", 50],
      ["Cy", 0],
    ]);
  });
});

describe("forecast deals", () => {
  it("group the quarter's deals by category, then the won ones; lost deals are left out", () => {
    const groups = forecastGroups(
      [...deals, deal({ id: "commit-sooner", stage: "procurement", closeDate: "2026-10-20" }), deal({ id: "won-later", stage: "won", closeDate: "2026-10-09" })],
      q4,
    );
    expect(ids(groups.commit)).toEqual(["commit-sooner", "commit"]);
    expect(ids(groups.bestCase)).toEqual(["best"]);
    expect(ids(groups.pipeline)).toEqual(["pipe"]);
    expect(ids(groups.omitted)).toEqual(["omit"]);
    expect(ids(groups.won)).toEqual(["won-later", "won"]);
  });

  it("find open deals stuck before the current quarter", () => {
    const list = [
      deal({ id: "slipped", closeDate: "2026-09-20" }),
      deal({ id: "overdue-this-quarter", closeDate: "2026-10-02" }),
      deal({ id: "won-last-quarter", stage: "won", closeDate: "2026-09-01" }),
    ];
    expect(ids(pastDueDeals(list, TODAY))).toEqual(["slipped"]);
  });
});

describe("progress through the quarter", () => {
  it("adds up wins so far and projects Commit and Best case from today", () => {
    const series = forecastSeries(deals, q4, TODAY);
    expect(series).toMatchObject({ days: 92, elapsed: 16 });
    expect(series.closed).toEqual([
      { day: 0, value: 0 },
      { day: 4, value: 1000 },
    ]);
    expect(series.commit).toEqual([
      { day: 16, value: 1000 },
      { day: 40, value: 1400 },
    ]);
    expect(series.bestCase).toEqual([
      { day: 16, value: 1000 },
      { day: 40, value: 1400 },
      { day: 91, value: 1700 },
    ]);
  });

  it("counts overdue deals from today", () => {
    const series = forecastSeries([deal({ id: "late", stage: "procurement", amount: 50, closeDate: "2026-10-03" })], q4, TODAY);
    expect(series.commit).toEqual([{ day: 16, value: 50 }]);
  });

  it("projects a quarter that hasn't started from its first day", () => {
    const series = forecastSeries(deals, quarterFor("next", TODAY), TODAY);
    expect(series).toMatchObject({ days: 90, elapsed: 0, closed: [{ day: 0, value: 0 }] });
    expect(series.commit).toEqual([{ day: 0, value: 800 }]);
  });

  it("can be read as a weekly table", () => {
    const rows = weeklyRows(forecastSeries(deals, q4, TODAY), q4);
    expect(rows).toHaveLength(14);
    expect(rows[0]).toEqual({ start: "2026-10-01", closed: 1000, commit: null, bestCase: null });
    expect(rows[2]).toEqual({ start: "2026-10-15", closed: 1000, commit: 1000, bestCase: 1000 });
    expect(rows[13]).toEqual({ start: "2026-12-31", closed: null, commit: 1400, bestCase: 1700 });
  });

  it("picks round axis values", () => {
    expect(axisTicks(1_580_000)).toEqual([0, 500_000, 1_000_000, 1_500_000, 2_000_000]);
    expect(axisTicks(90)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(0)).toEqual([0, 1]);
  });
});

describe("the seeded forecast", () => {
  it("lands in a similar place whichever day of the quarter the demo is opened", () => {
    const quota = OWNERS.reduce((sum, owner) => sum + owner.quota, 0);
    for (const today of ["2026-10-01", "2026-11-15", "2026-12-31", "2027-02-14"]) {
      const totals = forecastTotals(seedDemo(today).deals, quarterFor("this", today), quota);
      const weighted = shareOfQuota(totals.weighted, quota)!;
      expect(weighted, today).toBeGreaterThan(65);
      expect(weighted, today).toBeLessThan(125);
    }
  });
});

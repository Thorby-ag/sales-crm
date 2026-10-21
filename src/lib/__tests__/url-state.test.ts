import { describe, expect, it } from "vitest";
import { DEFAULT_DEAL_FILTERS, DEFAULT_FILTERS } from "../constants";
import { parseCompanyFilters, parseDealFilters, toHref, writeCompanyFilters, writeDealFilters } from "../url-state";

const owners = ["Kenji Mori", "Lea Fontaine"];
const params = (query: string) => new URLSearchParams(query);

describe("company filters in the URL", () => {
  it("parses readable values", () => {
    expect(parseCompanyFilters(params("sort=win&owner=kenji-mori&tag=land-expand&activity=30&team=sdr&region=emea"), owners)).toEqual({
      sortBy: "winProbability",
      owner: "Kenji Mori",
      tag: "Land & Expand",
      activityWindow: 30,
      team: "sdr",
      region: "emea",
    });
  });

  it("falls back to defaults for unknown or malformed values", () => {
    expect(parseCompanyFilters(params("sort=price&owner=nobody&tag=x&activity=12&team=ops&region=mars"), owners)).toEqual(DEFAULT_FILTERS);
    expect(parseCompanyFilters(params(""), owners)).toEqual(DEFAULT_FILTERS);
  });

  it("writes only non-default values and keeps unrelated params", () => {
    const written = writeCompanyFilters(params("company=lumenfold&sort=win"), { ...DEFAULT_FILTERS, owner: "Lea Fontaine", tag: "Mid-Market" });
    expect(written.toString()).toBe("company=lumenfold&owner=lea-fontaine&tag=mid-market");
  });

  it("round-trips every filter", () => {
    const filters = { sortBy: "lastInteraction" as const, owner: "Kenji Mori", tag: "New Logo" as const, activityWindow: 7 as const, team: "strategic" as const, region: "apac" as const };
    expect(parseCompanyFilters(writeCompanyFilters(params(""), filters), owners)).toEqual(filters);
  });
});

describe("deal filters in the URL", () => {
  it("parses and writes owner and close window", () => {
    expect(parseDealFilters(params("owner=kenji-mori&close=overdue"), owners)).toEqual({ owner: "Kenji Mori", close: "overdue" });
    expect(parseDealFilters(params("close=someday"), owners)).toEqual(DEFAULT_DEAL_FILTERS);
    expect(writeDealFilters(params("company=x"), { owner: null, close: "quarter" }).toString()).toBe("company=x&close=quarter");
  });
});

describe("toHref", () => {
  it("omits an empty query", () => {
    expect(toHref("/en", params(""))).toBe("/en");
    expect(toHref("/es/deals", params("close=overdue"))).toBe("/es/deals?close=overdue");
  });
});

import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  formatCompactMoney,
  formatMinutesAgo,
  formatMoney,
  formatMonth,
  formatNumber,
  formatShortDate,
  isSameQuarter,
  localToday,
  moneyParts,
  quarterOf,
  quarterStart,
} from "../format";

describe("locale-aware formatting", () => {
  it("formats money for each locale", () => {
    expect(formatMoney(548200, "en")).toBe("$548,200");
    // Intl separates the symbol with a no-break space, so it never wraps apart from the number.
    expect(formatMoney(548200, "es")).toBe("US$ 548.200");
    expect(formatNumber(1234567, "es")).toBe("1.234.567");
    expect(formatCompactMoney(5138594, "en")).toBe("$5.1M");
  });

  it("splits the currency symbol from the amount", () => {
    expect(moneyParts(548200.4, "en")).toEqual({ symbol: "$", amount: "548,200" });
    expect(moneyParts(548200, "es")).toEqual({ symbol: "US$", amount: "548.200" });
  });

  it("formats short dates without the year or time zone drift", () => {
    expect(formatShortDate("2026-01-03", "en")).toBe("Jan 3");
    expect(formatShortDate("2026-10-13", "es")).toBe("13 oct");
    expect(formatMonth("2026-11-01", "en")).toBe("Nov");
    expect(formatMonth("2026-11-01", "es")).toBe("nov");
  });

  it("formats how long ago something happened", () => {
    expect(formatMinutesAgo(18, "en")).toBe("18 min. ago");
    expect(formatMinutesAgo(120, "en")).toBe("2 hr. ago");
    expect(formatMinutesAgo(1440, "en")).toBe("yesterday");
    expect(formatMinutesAgo(1440, "es")).toBe("ayer");
    expect(formatMinutesAgo(4320, "es")).toBe("hace 3 días");
  });
});

describe("dates", () => {
  it("counts and adds whole days", () => {
    expect(daysBetween("2026-10-09", "2026-10-16")).toBe(7);
    expect(daysBetween("2026-10-16", "2026-10-09")).toBe(-7);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds months, keeping the day within the month", () => {
    expect(addMonths("2026-10-21", 3)).toBe("2027-01-21");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2028-11-30", 3)).toBe("2029-02-28");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
    expect(addMonths("2027-01-15", -3)).toBe("2026-10-15");
    expect(addMonths("2026-05-31", -3)).toBe("2026-02-28");
  });

  it("uses the local calendar date for today", () => {
    expect(localToday(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
  });

  it("knows quarters", () => {
    expect(quarterOf("2026-10-16")).toBe(4);
    expect(quarterOf("2026-03-31")).toBe(1);
    expect(isSameQuarter("2026-11-30", "2026-10-01")).toBe(true);
    expect(isSameQuarter("2027-11-30", "2026-11-30")).toBe(false);
    expect(isSameQuarter("2026-09-30", "2026-10-01")).toBe(false);
    expect(quarterStart("2026-11-20")).toBe("2026-10-01");
    expect(quarterStart("2027-03-31")).toBe("2027-01-01");
    expect(quarterStart("2026-07-01")).toBe("2026-07-01");
  });
});

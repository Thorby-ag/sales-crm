"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import {
  formatCompactMoney,
  formatMinutesAgo,
  formatMoney,
  formatNumber,
  formatShortDate,
  moneyParts,
} from "@/lib/format";

/** Formatters bound to the active locale. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      money: (value: number) => formatMoney(value, locale),
      moneyParts: (value: number) => moneyParts(value, locale),
      compactMoney: (value: number) => formatCompactMoney(value, locale),
      number: (value: number) => formatNumber(value, locale),
      date: (isoDate: string) => formatShortDate(isoDate, locale),
      ago: (minutes: number) => formatMinutesAgo(minutes, locale),
    }),
    [locale],
  );
}

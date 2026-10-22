"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Link } from "@/i18n/navigation";
import { OWNER_NAMES, OWNERS } from "@/lib/data/people";
import {
  bestCaseForecast,
  commitForecast,
  coverage,
  forecastByRep,
  forecastGroups,
  forecastSeries,
  forecastTotals,
  pastDueDeals,
  quarterFor,
  repsInView,
  shareOfQuota,
  type ForecastGroup,
  type ForecastTotals,
  type Quarter,
} from "@/lib/forecast";
import { addDays, daysBetween } from "@/lib/format";
import { useCrm } from "@/lib/store";
import { FORECAST_PERIODS, TEAMS, type Deal, type ForecastFilters, type Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL, FilterMenu } from "../filter-menu";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { useForecastFilters } from "../url-state";
import { useFormat } from "../use-format";
import { ForecastChart } from "./forecast-chart";
import { ForecastDeals } from "./forecast-deals";
import { RepTable } from "./rep-table";
import { CARD, GROUP_COLOR } from "./styles";

export function ForecastPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <ForecastView /> : <ContentSkeleton variant="forecast" />;
}

function Toolbar({
  filters,
  setFilters,
  resetFilters,
  quarter,
  quarterLabel,
}: {
  filters: ForecastFilters;
  setFilters: (patch: Partial<ForecastFilters>) => void;
  resetFilters: () => void;
  quarter: Quarter;
  quarterLabel: string;
}) {
  const t = useTranslations();
  const { date } = useFormat();
  const today = useCrm((s) => s.today);
  const active = filters.owner !== null || filters.team !== null;
  const timing =
    filters.period === "this"
      ? t("forecast.daysLeft", { count: daysBetween(today, quarter.end) })
      : t("forecast.startsIn", { count: daysBetween(today, quarter.start) });

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={t("forecast.periodLabel")}
          value={filters.period}
          options={FORECAST_PERIODS.map((period) => ({ value: period, label: t(`forecast.periods.${period}`) }))}
          onChange={(period) => setFilters({ period })}
        />
        <FilterMenu
          label={t("filters.filter")}
          title={t("filters.ownerTitle")}
          groups={[
            { options: [{ value: ALL, label: t("filters.allOwners") }] },
            { label: t("filters.accountOwners"), options: OWNER_NAMES.map((name) => ({ value: name, label: name })) },
          ]}
          value={filters.owner ?? ALL}
          onChange={(v) => setFilters({ owner: v === ALL ? null : v })}
        />
        <FilterMenu
          label={t("forecast.team")}
          title={t("forecast.team")}
          groups={[{ options: [{ value: ALL, label: t("forecast.allTeams") }, ...TEAMS.map((team) => ({ value: team, label: t(`teams.${team}`) }))] }]}
          value={filters.team ?? ALL}
          onChange={(v) => setFilters({ team: v === ALL ? null : (v as Team) })}
        />
        {active && (
          <Button variant="ghost" onClick={resetFilters}>
            <RotateCcw aria-hidden className="size-3" />
            {t("common.reset")}
          </Button>
        )}
      </div>
      <p className="type-caption text-muted-foreground">
        <span className="text-foreground">{quarterLabel}</span>
        <span aria-hidden className="mx-1.5 text-faint">
          ·
        </span>
        {date(quarter.start)} – {date(addDays(quarter.end, -1))}
        <span aria-hidden className="mx-1.5 text-faint">
          ·
        </span>
        {timing}
      </p>
    </div>
  );
}

function Kpis({ totals, reps, quarterLabel }: { totals: ForecastTotals; reps: number; quarterLabel: string }) {
  const t = useTranslations("forecast.kpis");
  const { compactMoney, money } = useFormat();
  const commit = commitForecast(totals);
  const gap = totals.quota - commit;
  const cover = coverage(totals);
  const ofQuota = (value: number) => {
    const share = shareOfQuota(value, totals.quota);
    return share === null ? undefined : t("ofQuota", { value: share });
  };

  const items: { id: string; label: string; value: number; hint?: string; group?: ForecastGroup }[] = [
    { id: "quota", label: t("quota"), value: totals.quota, hint: t("reps", { count: reps }) },
    { id: "closed", label: t("closed"), value: totals.closed, hint: ofQuota(totals.closed), group: "won" },
    { id: "commit", label: t("commit"), value: commit, hint: ofQuota(commit), group: "commit" },
    { id: "bestCase", label: t("bestCase"), value: bestCaseForecast(totals), hint: ofQuota(bestCaseForecast(totals)), group: "bestCase" },
    { id: "weighted", label: t("weighted"), value: totals.weighted, hint: ofQuota(totals.weighted) },
    {
      id: "gap",
      label: gap > 0 ? t("gap") : t("ahead"),
      value: Math.abs(gap),
      hint: cover === null ? t("quotaWon") : t("coverage", { value: cover }),
    },
  ];

  return (
    <section aria-label={t("label", { quarter: quarterLabel })}>
      <dl className="grid grid-cols-2 gap-2 @2xl:grid-cols-3 @5xl:grid-cols-6">
        {items.map((item) => (
          <div key={item.id} className={cn(CARD, "flex min-w-0 flex-col gap-3 p-3.5")}>
            <dt className="type-caption flex items-center gap-1.5 text-muted-foreground">
              {item.group && <span aria-hidden className={cn("size-2 rounded-full", GROUP_COLOR[item.group])} />}
              {item.label}
            </dt>
            <dd className="flex flex-col gap-2">
              <span className="text-[22px] leading-none font-semibold tabular-nums" title={money(item.value)}>
                {compactMoney(item.value)}
              </span>
              {item.hint && <span className="type-caption text-soft">{item.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Open deals whose close date fell in an earlier quarter count nowhere until someone updates them. */
function PastDueNotice({ deals }: { deals: Deal[] }) {
  const t = useTranslations("forecast");
  const { money } = useFormat();
  const amount = deals.reduce((sum, d) => sum + d.amount, 0);
  return (
    <p className="type-caption flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-[#6c4830] bg-[#31221b] px-3.5 py-3 leading-snug text-[#fed7aa]">
      <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
      {t("pastDue", { count: deals.length, amount: money(amount) })}
      <Link href={{ pathname: "/deals", query: { close: "overdue" } }} className="underline underline-offset-2 hover:text-foreground">
        {t("pastDueLink")}
      </Link>
    </p>
  );
}

function ForecastView() {
  const t = useTranslations();
  const { filters, setFilters, resetFilters } = useForecastFilters();
  const allDeals = useCrm((s) => s.deals);
  const today = useCrm((s) => s.today);

  const quarter = useMemo(() => quarterFor(filters.period, today), [filters.period, today]);
  const reps = useMemo(() => repsInView(OWNERS, filters), [filters]);
  const deals = useMemo(() => {
    const names = new Set(reps.map((rep) => rep.name));
    return allDeals.filter((deal) => names.has(deal.owner));
  }, [allDeals, reps]);
  const quota = reps.reduce((sum, rep) => sum + rep.quota, 0);
  const totals = useMemo(() => forecastTotals(deals, quarter, quota), [deals, quarter, quota]);
  const byRep = useMemo(() => forecastByRep(deals, quarter, reps), [deals, quarter, reps]);
  const series = useMemo(() => forecastSeries(deals, quarter, today), [deals, quarter, today]);
  const groups = useMemo(() => forecastGroups(deals, quarter), [deals, quarter]);
  const pastDue = useMemo(() => (filters.period === "this" ? pastDueDeals(deals, today) : []), [deals, filters.period, today]);
  const quarterLabel = t("forecast.quarter", { quarter: quarter.quarter, year: quarter.year });

  return (
    <>
      <PageHeader view="forecast" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="@container flex flex-col gap-3 p-4">
          <Toolbar filters={filters} setFilters={setFilters} resetFilters={resetFilters} quarter={quarter} quarterLabel={quarterLabel} />
          <Kpis totals={totals} reps={reps.length} quarterLabel={quarterLabel} />
          {pastDue.length > 0 && <PastDueNotice deals={pastDue} />}
          <ForecastChart series={series} quarter={quarter} quota={quota} quarterLabel={quarterLabel} />
          <RepTable reps={byRep} quarterLabel={quarterLabel} onSelect={(owner) => setFilters({ owner })} />
          <ForecastDeals groups={groups} quarterLabel={quarterLabel} period={filters.period} />
        </div>
      </div>
    </>
  );
}

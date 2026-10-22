"use client";

import { Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CARD, TEXT_LINK } from "@/components/ui/surface";
import { personByName } from "@/lib/data/people";
import { forecastCategory, isOverdue, shiftQuarter, withForecastCategory } from "@/lib/deals";
import { FORECAST_GROUPS, quarterFor, type ForecastGroup } from "@/lib/forecast";
import { useCrm } from "@/lib/store";
import { FORECAST_CATEGORIES, type Company, type Deal, type ForecastCategory, type ForecastPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StageTag } from "../deals/deal-actions";
import { withUndo } from "../undo";
import { openCompany, openDeal } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { Money } from "../visuals/money";
import { GROUP_COLOR } from "./styles";

const TH = "border-b py-2.5 font-normal whitespace-nowrap";
const TD = "border-b py-2.5";

/** Category, quarter and edit actions for a deal in the forecast. */
function ForecastDealMenu({ deal, company, period }: { deal: Deal; company: Company; period: ForecastPeriod }) {
  const t = useTranslations();
  const category = forecastCategory(deal);
  const name = `${deal.name} · ${company.name}`;

  const recategorize = (next: ForecastCategory) => {
    if (next === category) return;
    withUndo(t("forecast.deals.recategorized", { deal: name, category: t(`forecastCategories.${next}`) }), t("common.undo"), () =>
      useCrm.getState().updateDeal(deal.id, (d) => withForecastCategory(d, next)),
    );
  };

  // From this quarter a deal can be pushed to the next one; from the next quarter, pulled in.
  const moveQuarter = () => {
    const { today, updateDeal } = useCrm.getState();
    const target = quarterFor(period === "this" ? "next" : "this", today);
    const quarter = t("forecast.quarter", { quarter: target.quarter, year: target.year });
    withUndo(t(period === "this" ? "forecast.deals.pushed" : "forecast.deals.pulled", { deal: name, quarter }), t("common.undo"), () =>
      updateDeal(deal.id, (d) => shiftQuarter(d, period === "this" ? 1 : -1, today)),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("deals.actions", { name })}>
          <Ellipsis aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {category && (
          <>
            <DropdownMenuLabel>{t("forecast.deals.category")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={category} onValueChange={(value) => recategorize(value as ForecastCategory)}>
              {FORECAST_CATEGORIES.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>
                  {t(`forecastCategories.${c}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={moveQuarter}>{t(period === "this" ? "forecast.deals.push" : "forecast.deals.pull")}</DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onSelect={() => openDeal(deal.id)}>{t("deals.edit")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openCompany(company.id)}>{t("deals.openCompany", { name: company.name })}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DealRow({ deal, company, period, today }: { deal: Deal; company: Company; period: ForecastPeriod; today: string }) {
  const t = useTranslations();
  const { date } = useFormat();
  const owner = personByName(deal.owner);
  const overdue = isOverdue(deal, today);
  return (
    <tr>
      <td className={cn(TD, "px-4")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo logo={company.logo} size={24} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openDeal(deal.id)}
              className={cn("type-lead", TEXT_LINK)}
            >
              {deal.name}
            </button>
            <p className="type-caption mt-1.5 truncate text-muted-foreground">{company.name}</p>
          </div>
        </div>
      </td>
      <td className={cn(TD, "px-3 max-md:hidden")}>
        <span className="type-caption flex items-center gap-1.5 whitespace-nowrap">
          <Avatar src={owner.avatar} size={18} />
          {owner.name}
        </span>
      </td>
      <td className={cn(TD, "type-caption px-3 whitespace-nowrap tabular-nums", overdue ? "text-danger" : "text-soft")}>
        {overdue ? t("forecast.deals.overdue", { date: date(deal.closeDate) }) : date(deal.closeDate)}
      </td>
      <td className={cn(TD, "px-3 max-sm:hidden")}>
        <StageTag stage={deal.stage} />
      </td>
      <td className={cn(TD, "type-caption px-3 text-right tabular-nums max-sm:hidden")}>{deal.probability}%</td>
      <td className={cn(TD, "px-3 text-right")}>
        <Money value={deal.amount} className="type-lead" />
      </td>
      <td className={cn(TD, "pr-3 pl-1 text-right")}>
        <ForecastDealMenu deal={deal} company={company} period={period} />
      </td>
    </tr>
  );
}

export function ForecastDeals({
  groups,
  quarterLabel,
  period,
}: {
  groups: Record<ForecastGroup, Deal[]>;
  quarterLabel: string;
  period: ForecastPeriod;
}) {
  const t = useTranslations();
  const { money } = useFormat();
  const companies = useCrm((s) => s.companies);
  const today = useCrm((s) => s.today);
  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const shown = FORECAST_GROUPS.filter((group) => groups[group].length > 0);
  const groupName = (group: ForecastGroup) => (group === "won" ? t("dealStages.won") : t(`forecastCategories.${group}`));

  return (
    <section aria-labelledby="forecast-deals-title" className={CARD}>
      <h2 id="forecast-deals-title" className="type-lead px-4 pt-4 pb-2 font-medium">
        {t("forecast.deals.title", { quarter: quarterLabel })}
      </h2>
      {shown.length === 0 ? (
        <p className="type-caption px-4 pt-2 pb-5 text-muted-foreground">{t("forecast.deals.empty")}</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <caption className="sr-only">{t("forecast.deals.caption", { quarter: quarterLabel })}</caption>
            <thead className="type-caption text-muted-foreground">
              <tr>
                <th scope="col" className={cn(TH, "px-4 text-left")}>
                  {t("forecast.deals.deal")}
                </th>
                <th scope="col" className={cn(TH, "px-3 text-left max-md:hidden")}>
                  {t("forecast.deals.owner")}
                </th>
                <th scope="col" className={cn(TH, "px-3 text-left")}>
                  {t("forecast.deals.close")}
                </th>
                <th scope="col" className={cn(TH, "px-3 text-left max-sm:hidden")}>
                  {t("forecast.deals.stage")}
                </th>
                <th scope="col" className={cn(TH, "px-3 text-right max-sm:hidden")}>
                  {t("forecast.deals.probability")}
                </th>
                <th scope="col" className={cn(TH, "px-3 text-right")}>
                  {t("forecast.deals.amount")}
                </th>
                <th scope="col" className={cn(TH, "pr-3")}>
                  <span className="sr-only">{t("table.action")}</span>
                </th>
              </tr>
            </thead>
            {shown.map((group) => {
              const list = groups[group];
              const amount = list.reduce((sum, d) => sum + d.amount, 0);
              return (
                <tbody key={group}>
                  <tr>
                    <th scope="rowgroup" colSpan={7} className="type-caption border-b bg-white/[0.02] px-4 py-2 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2 rounded-full", GROUP_COLOR[group])} />
                        <span className="font-medium text-foreground">{groupName(group)}</span>
                        <span className="text-muted-foreground">{t("forecast.deals.groupSummary", { count: list.length, amount: money(amount) })}</span>
                      </span>
                    </th>
                  </tr>
                  {list.map((deal) => {
                    const company = byId.get(deal.companyId);
                    return company ? <DealRow key={deal.id} deal={deal} company={company} period={period} today={today} /> : null;
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </section>
  );
}

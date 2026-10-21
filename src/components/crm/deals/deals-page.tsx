"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { OWNER_NAMES } from "@/lib/data/people";
import { dealSummary, filterDeals, isOpen } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import type { CloseWindow } from "@/lib/types";
import { ALL, FilterMenu } from "../filter-menu";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { useDealFilters } from "../url-state";
import { useFormat } from "../use-format";
import { DealsBoard } from "./deals-board";

export function DealsPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <DealsView /> : <ContentSkeleton variant="board" />;
}

function DealsView() {
  const t = useTranslations();
  const { money } = useFormat();
  const { filters, setFilters, resetFilters } = useDealFilters();
  const deals = useCrm((s) => s.deals);
  const today = useCrm((s) => s.today);
  const visible = useMemo(() => filterDeals(deals, filters, today), [deals, filters, today]);
  const summary = dealSummary(visible.filter(isOpen));
  const active = filters.owner !== null || filters.close !== null;

  return (
    <>
      <PageHeader view="deals" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
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
            label={t("filters.closeDate")}
            title={t("filters.closeTitle")}
            groups={[
              {
                options: [
                  { value: ALL, label: t("filters.any") },
                  { value: "quarter", label: t("filters.closeQuarter") },
                  { value: "overdue", label: t("filters.closeOverdue") },
                ],
              },
            ]}
            value={filters.close ?? ALL}
            onChange={(v) => setFilters({ close: v === ALL ? null : (v as CloseWindow) })}
          />
          {active && (
            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw aria-hidden className="size-3" />
              {t("common.reset")}
            </Button>
          )}
        </div>
        <p className="type-caption text-muted-foreground max-sm:hidden">
          {t("deals.openPipeline")} <span className="text-foreground tabular-nums">{money(summary.amount)}</span>
          <span aria-hidden className="mx-2 text-faint">
            ·
          </span>
          {t("deals.weighted")} <span className="text-foreground tabular-nums">{money(summary.weighted)}</span>
        </p>
      </div>
      <DealsBoard deals={visible} />
    </>
  );
}

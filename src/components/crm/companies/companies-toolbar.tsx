"use client";

import { Plus, RotateCcw, SlidersHorizontal, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/chips";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { activeFilterCount } from "@/lib/companies";
import { SORT_KEYS } from "@/lib/constants";
import { OWNER_NAMES } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import { ACTIVITY_WINDOWS, SEGMENTS, STAGES, type ActivityWindow, type CompanyFilters, type CompanyRow, type SortKey, type Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL, FilterMenu, FilterSelect, type FilterControl } from "../filter-menu";
import { useExportCompanies } from "./use-export";

function useControls(filters: CompanyFilters, setFilters: (patch: Partial<CompanyFilters>) => void): FilterControl[] {
  const t = useTranslations();
  return useMemo(
    () => [
      {
        id: "sort",
        label: t("filters.sortBy"),
        title: t("filters.sortBy"),
        groups: [{ options: SORT_KEYS.map((key) => ({ value: key, label: t(`sort.${key}`) })) }],
        value: filters.sortBy,
        onChange: (v) => setFilters({ sortBy: v as SortKey }),
      },
      {
        id: "owner",
        label: t("filters.filter"),
        title: t("filters.ownerTitle"),
        groups: [
          { options: [{ value: ALL, label: t("filters.allOwners") }] },
          { label: t("filters.accountOwners"), options: OWNER_NAMES.map((name) => ({ value: name, label: name })) },
        ],
        value: filters.owner ?? ALL,
        onChange: (v) => setFilters({ owner: v === ALL ? null : v }),
      },
      {
        id: "tag",
        label: t("filters.stage"),
        title: t("filters.tagTitle"),
        groups: [
          { options: [{ value: ALL, label: t("filters.any") }] },
          { label: t("filters.segment"), options: SEGMENTS.map((s) => ({ value: s, label: s })) },
          { label: t("filters.stageGroup"), options: STAGES.map((s) => ({ value: s, label: s })) },
        ],
        value: filters.tag ?? ALL,
        onChange: (v) => setFilters({ tag: v === ALL ? null : (v as Tag) }),
      },
      {
        id: "activity",
        label: t("filters.lastActivity"),
        title: t("filters.activityTitle"),
        groups: [{ options: ACTIVITY_WINDOWS.map((days) => ({ value: String(days), label: t("filters.days", { count: days }) })) }],
        value: String(filters.activityWindow),
        onChange: (v) => setFilters({ activityWindow: Number(v) as ActivityWindow }),
      },
    ],
    [t, filters, setFilters],
  );
}

/** A removable chip for filters that come from saved views (team, region). */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("filters");
  return (
    <span className="type-caption inline-flex h-[30px] items-center gap-1 rounded-full border border-primary/40 bg-primary/12 pr-1 pl-3 text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removeFilter", { name: label })}
        className="grid size-6 place-items-center rounded-full text-soft outline-none transition-colors hover:bg-white/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <X aria-hidden className="size-3" />
      </button>
    </span>
  );
}

function MobileFilters({
  controls,
  active,
  visibleCount,
  onReset,
  className,
}: {
  controls: FilterControl[];
  active: number;
  visibleCount: number;
  onReset: () => void;
  className?: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="secondary"
        className={cn("data-[active=true]:bg-muted", className)}
        data-active={active > 0}
        aria-label={active > 0 ? t("filters.filtersActive", { count: active }) : t("filters.filters")}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal aria-hidden className="size-3" />
        {t("filters.filters")}
        {active > 0 && <CountBadge className="min-w-4">{active}</CountBadge>}
      </Button>
      <SheetContent side="bottom">
        <SheetHeader title={t("filters.filters")} description={t("filters.filtersDescription")} className="px-4" />
        <SheetBody className="flex flex-col gap-4 p-4">
          {controls.map((control) => (
            <FilterSelect key={control.id} {...control} />
          ))}
        </SheetBody>
        <SheetFooter className="px-4">
          <Button variant="ghost" disabled={active === 0} onClick={onReset}>
            <RotateCcw aria-hidden className="size-3" />
            {t("common.reset")}
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            {t("filters.showCompanies", { count: visibleCount })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CompaniesToolbar({
  visible,
  filters,
  setFilters,
  resetFilters,
}: {
  visible: CompanyRow[];
  filters: CompanyFilters;
  setFilters: (patch: Partial<CompanyFilters>) => void;
  resetFilters: () => void;
}) {
  const t = useTranslations();
  const setNewCompanyOpen = useCrm((s) => s.setNewCompanyOpen);
  const exportCompanies = useExportCompanies();
  const controls = useControls(filters, setFilters);
  const active = activeFilterCount(filters);

  // Container query: the filter pills need ~880px, which depends on the sidebar, not just the viewport.
  return (
    <div className="@container shrink-0">
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="hidden flex-wrap items-center gap-2 @4xl:flex">
            {controls.map(({ id, ...control }) => (
              <FilterMenu key={id} {...control} />
            ))}
          </div>
          <MobileFilters controls={controls} active={active} visibleCount={visible.length} onReset={resetFilters} className="@4xl:hidden" />
          {filters.team && (
            <FilterChip label={t("filters.team", { name: t(`teams.${filters.team}`) })} onRemove={() => setFilters({ team: null })} />
          )}
          {filters.region && (
            <FilterChip label={t("filters.region", { name: t(`regions.${filters.region}`) })} onRemove={() => setFilters({ region: null })} />
          )}
          {active > 0 && (
            <Button variant="ghost" className="hidden @4xl:inline-flex" onClick={resetFilters}>
              <RotateCcw aria-hidden className="size-3" />
              {t("common.reset")}
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => exportCompanies(visible)}>
            <Upload aria-hidden className="size-3" />
            <span className="max-sm:sr-only">{t("export.button")}</span>
          </Button>
          <Button variant="primary" onClick={() => setNewCompanyOpen(true)}>
            <Plus aria-hidden className="size-3" />
            {t("newCompany.title")}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, Calendar, Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TEXT_LINK } from "@/components/ui/surface";
import { personByName } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import type { CompanyRow, SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openCompany } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { Money } from "../visuals/money";
import { SegmentedMeter } from "../visuals/segmented-meter";
import { Sparkline } from "../visuals/sparkline";
import { TagList } from "../visuals/tag-list";

const CELL =
  "h-[43px] border-b border-border bg-background px-2.5 type-lead whitespace-nowrap transition-colors duration-100 group-hover:bg-[#1a1a1a] group-data-[selected=true]:bg-[#1c1d21]";
const HEAD =
  "h-10 border-b border-border bg-background px-2.5 text-left type-caption font-normal whitespace-nowrap text-muted-foreground";

const stop = (event: MouseEvent) => event.stopPropagation();

function SortHeader({
  label,
  sortKey,
  sortBy,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sortBy: SortKey;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortBy === sortKey;
  const Arrow = sortKey === "name" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "relative -mx-1 rounded px-1 py-0.5 whitespace-nowrap outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25",
        active && "text-foreground",
      )}
    >
      {label}
      {/* Positioned outside the text so the label never wraps. */}
      {active && (
        <Arrow aria-hidden className={cn("absolute top-1/2 size-3 -translate-y-1/2", align === "right" ? "right-full" : "left-full")} />
      )}
    </button>
  );
}

function Th({ children, sorted, className }: { children: ReactNode; sorted?: "ascending" | "descending"; className?: string }) {
  return (
    <th scope="col" aria-sort={sorted} className={cn(HEAD, className)}>
      {children}
    </th>
  );
}

function CompanyRowView({ row, selected }: { row: CompanyRow; selected: boolean }) {
  const t = useTranslations();
  const { date } = useFormat();
  const toggleSelected = useCrm((s) => s.toggleSelected);
  const openProfile = useCrm((s) => s.openProfile);
  const owner = personByName(row.owner);
  const open = () => openCompany(row.id);

  return (
    <tr data-selected={selected} className="group cursor-pointer" onClick={open}>
      <td className={cn(CELL, "sticky left-0 z-10 pr-0 pl-3")} onClick={stop}>
        <Checkbox checked={selected} onCheckedChange={() => toggleSelected(row.id)} aria-label={t("table.select", { name: row.name })} />
      </td>
      <td className={cn(CELL, "sticky left-10 z-10 max-md:shadow-[1px_0_0_var(--border)]")}>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            open();
          }}
          className={TEXT_LINK}
        >
          {row.name}
        </button>
      </td>
      <td className={CELL}>
        <TagList tags={row.tags} />
      </td>
      <td className={CELL}>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            openProfile(owner.name);
          }}
          aria-label={t("table.openProfile", { name: owner.name })}
          className="-ml-1 flex max-w-full items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none transition-colors hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Avatar src={owner.avatar} size={20} />
          <span className="truncate">{owner.name}</span>
        </button>
      </td>
      <td className={cn(CELL, "text-right tabular-nums")}>{row.openDeals}</td>
      <td className={cn(CELL, "text-right")}>
        <Money value={row.pipelineValue} />
      </td>
      <td className={CELL}>
        <div className="flex items-center gap-3">
          <SegmentedMeter value={row.winProbability ?? 0} className="w-[74px] shrink-0" />
          <span className="ml-auto tabular-nums">{row.winProbability === null ? t("common.noValue") : `${row.winProbability}%`}</span>
        </div>
      </td>
      <td className={cn(CELL, "pl-4")}>
        <Sparkline values={row.trend} />
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-1.5">
          <Calendar aria-hidden className="size-3.5 shrink-0" />
          <span className="tabular-nums">{date(row.lastInteraction.date)}</span>
          <span aria-hidden className="mx-0.5 h-2 w-px bg-white/15" />
          <span className="truncate">{t(`interactions.${row.lastInteraction.type}`)}</span>
        </span>
      </td>
      <td className={cn(CELL, "pr-3 text-right")}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-foreground"
          aria-label={t("table.openDetails", { name: row.name })}
          onClick={(e) => {
            stop(e);
            open();
          }}
        >
          <Ellipsis aria-hidden className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export function CompaniesTable({
  visible,
  sortBy,
  onSort,
  onReset,
}: {
  visible: CompanyRow[];
  sortBy: SortKey;
  onSort: (key: SortKey) => void;
  onReset: () => void;
}) {
  const t = useTranslations();
  const selectedIds = useCrm((s) => s.selectedIds);
  const setSelected = useCrm((s) => s.setSelected);

  const selected = new Set(selectedIds);
  const selectedInView = visible.filter((c) => selected.has(c.id)).length;
  const allChecked = visible.length > 0 && selectedInView === visible.length;
  const headerState = allChecked ? true : selectedInView > 0 ? "indeterminate" : false;

  const toggleAll = () => {
    const ids = new Set(visible.map((c) => c.id));
    setSelected(allChecked ? selectedIds.filter((id) => !ids.has(id)) : [...new Set([...selectedIds, ...ids])]);
  };

  const sorted = (key: SortKey) => (sortBy === key ? (key === "name" ? "ascending" : "descending") : undefined);
  const sortHeader = (key: SortKey, label: string, align?: "right") => (
    <SortHeader label={label} sortKey={key} sortBy={sortBy} onSort={onSort} align={align} />
  );

  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0">
        <caption className="sr-only">{t("table.caption")}</caption>
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[210px]" />
          <col className="w-[166px]" />
          <col className="w-[84px]" />
          <col className="w-[110px]" />
          <col className="w-[136px]" />
          <col className="w-[104px]" />
          <col className="w-[172px]" />
          <col className="w-[48px]" />
        </colgroup>
        <thead className="sticky top-0 z-20">
          <tr>
            <th scope="col" className={cn(HEAD, "sticky left-0 z-10 pr-0 pl-3")}>
              <Checkbox checked={headerState} onCheckedChange={toggleAll} aria-label={t("table.selectAll")} />
            </th>
            <Th sorted={sorted("name")} className="sticky left-10 z-10">
              {sortHeader("name", t("table.companies"))}
            </Th>
            <Th>{t("table.segmentStage")}</Th>
            <Th>{t("table.accountOwner")}</Th>
            <Th sorted={sorted("openDeals")} className="text-right">
              {sortHeader("openDeals", t("table.openDeals"), "right")}
            </Th>
            <Th sorted={sorted("pipelineValue")} className="text-right">
              {sortHeader("pipelineValue", t("table.pipelineValue"), "right")}
            </Th>
            <Th sorted={sorted("winProbability")} className="text-right">
              {sortHeader("winProbability", t("table.winProbability"), "right")}
            </Th>
            <Th className="pl-4">{t("table.activityTrend")}</Th>
            <Th sorted={sorted("lastInteraction")}>{sortHeader("lastInteraction", t("table.lastInteraction"))}</Th>
            <Th className="pr-3 text-right">{t("table.action")}</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <CompanyRowView key={row.id} row={row} selected={selected.has(row.id)} />
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={10} className="h-[140px] border-b border-border">
                <div className="sticky left-0 flex w-[min(100%,100vw)] flex-col items-center justify-center gap-2 text-center md:w-full">
                  <p className="type-caption text-muted-foreground">{t("table.empty")}</p>
                  <Button variant="link" size="none" className="type-caption" onClick={onReset}>
                    {t("table.resetFilters")}
                  </Button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

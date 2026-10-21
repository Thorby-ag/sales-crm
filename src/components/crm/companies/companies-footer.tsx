"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pipelineSummary, weightedPipeline } from "@/lib/companies";
import type { CompanyRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFormat } from "../use-format";

const CELL = "flex h-[38px] min-w-0 items-center gap-2 bg-background px-3 type-caption";
const BUTTON_CELL = cn(CELL, "text-muted-foreground outline-none transition-colors hover:bg-[#1a1a1a] hover:text-soft focus-visible:bg-[#1a1a1a]");

const EXTRA_METRICS = ["openDeals", "weighted", "average"] as const;
type ExtraMetric = (typeof EXTRA_METRICS)[number];

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="ml-auto text-foreground tabular-nums">{value}</span>
    </>
  );
}

function AddLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <Plus aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{children}</span>
    </>
  );
}

function ToggleMetric({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <button type="button" aria-pressed={shown} onClick={() => setShown(!shown)} className={BUTTON_CELL}>
      {shown ? <MetricValue label={label} value={value} /> : <AddLabel>{label}</AddLabel>}
    </button>
  );
}

export function CompaniesFooter({ visible }: { visible: CompanyRow[] }) {
  const t = useTranslations("footer");
  const { money, number } = useFormat();
  const [extra, setExtra] = useState<ExtraMetric | null>(null);
  const summary = pipelineSummary(visible);
  const count = visible.length;

  const extraValue = (metric: ExtraMetric) => {
    if (metric === "openDeals") return number(summary.openDeals);
    if (metric === "weighted") return money(weightedPipeline(visible));
    return money(count ? summary.pipeline / count : 0);
  };

  return (
    <div className="grid shrink-0 grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
      <div className={CELL} aria-live="polite">
        <span className="text-foreground tabular-nums">{count}</span>
        <span className="truncate text-muted-foreground">{t("inView", { count })}</span>
      </div>
      <ToggleMetric label={t("sumPipeline")} value={money(summary.pipeline)} />
      <ToggleMetric label={t("avgWin")} value={`${summary.avgWin}%`} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(BUTTON_CELL, "data-[state=open]:bg-[#1a1a1a]")}>
            {extra ? <MetricValue label={t(extra)} value={extraValue(extra)} /> : <AddLabel>{t("addCalculation")}</AddLabel>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-[220px]">
          <DropdownMenuLabel>{t("calculate")}</DropdownMenuLabel>
          {EXTRA_METRICS.map((metric) => (
            <DropdownMenuItem key={metric} onSelect={() => setExtra(metric)} className={cn(extra === metric && "text-foreground")}>
              {t(metric)}
            </DropdownMenuItem>
          ))}
          {extra && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setExtra(null)}>
                <X aria-hidden className="size-3" />
                {t("removeCalculation")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

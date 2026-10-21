"use client";

import { Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chips";
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
import { DEAL_STAGE_TONES } from "@/lib/constants";
import { useCrm } from "@/lib/store";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { withUndo } from "../undo";

export function StageTag({ stage, className }: { stage: DealStage; className?: string }) {
  const t = useTranslations("dealStages");
  return (
    <Tag tone={DEAL_STAGE_TONES[stage]} className={cn("type-caption h-5 px-1.5", className)}>
      {t(stage)}
    </Tag>
  );
}

/** Moves a deal to another stage, with an undo action in the toast. */
export function useMoveDeal() {
  const t = useTranslations();
  return useCallback(
    (deal: Deal, stage: DealStage) => {
      if (deal.stage === stage) return;
      const company = useCrm.getState().companies.find((c) => c.id === deal.companyId);
      const name = company ? `${deal.name} · ${company.name}` : deal.name;
      withUndo(t("deals.moved", { deal: name, stage: t(`dealStages.${stage}`) }), t("common.undo"), () =>
        useCrm.getState().moveDeal(deal.id, stage),
      );
    },
    [t],
  );
}

/**
 * "⋯" menu with "Move to" stages. It's also the way to change stages without dragging
 * (WCAG 2.5.7), for pointer, keyboard and screen reader users alike.
 */
export function DealActions({
  deal,
  companyName,
  onOpenCompany,
  className,
}: {
  deal: Deal;
  companyName?: string;
  onOpenCompany?: () => void;
  className?: string;
}) {
  const t = useTranslations();
  const moveDeal = useMoveDeal();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={cn("text-soft", className)} aria-label={t("deals.actions", { name: deal.name })}>
          <Ellipsis aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel>{t("deals.moveTo")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={deal.stage} onValueChange={(stage) => moveDeal(deal, stage as DealStage)}>
          {DEAL_STAGES.map((stage) => (
            <DropdownMenuRadioItem key={stage} value={stage}>
              {t(`dealStages.${stage}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {onOpenCompany && companyName && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenCompany}>{t("deals.openCompany", { name: companyName })}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

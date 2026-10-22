"use client";

import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { TEXT_LINK } from "@/components/ui/surface";
import { personByName } from "@/lib/data/people";
import { isOpen, isOverdue } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import type { Company, Deal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openCompany, openDeal } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { Money } from "../visuals/money";
import { SegmentedMeter } from "../visuals/segmented-meter";
import { DealActions } from "./deal-actions";

const CARD =
  "relative flex flex-col gap-3 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] p-3 text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]";

// A drop fires a click on whatever is under the pointer; ignore clicks right after a drag.
let lastDragEnd = 0;
export function markDragEnd(): void {
  lastDragEnd = Date.now();
}

/** What a card shows. Used for the cards on the board and for the copy that follows the pointer. */
function DealCardBody({ deal, company, today, controls }: { deal: Deal; company: Company; today: string; controls?: ReactNode }) {
  const t = useTranslations("deals");
  const { date } = useFormat();
  const owner = personByName(deal.owner);
  const overdue = isOverdue(deal, today);
  const when = overdue ? t("overdue") : t(isOpen(deal) ? "closes" : "closed", { date: date(deal.closeDate) });

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CompanyLogo logo={company.logo} size={20} />
          <p className="type-caption min-w-0 flex-1 truncate text-muted-foreground">{company.name}</p>
          {controls}
        </div>
        <button
          type="button"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            openDeal(deal.id);
          }}
          className={cn("type-lead", TEXT_LINK)}
        >
          {deal.name}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Money value={deal.amount} className="type-lead" />
        <span className={cn("type-caption flex items-center gap-1 whitespace-nowrap", overdue ? "text-danger" : "text-muted-foreground")}>
          <CalendarClock aria-hidden className="size-3" />
          {when}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SegmentedMeter value={deal.probability} segments={18} className="h-3 min-w-0 flex-1" segmentClassName="h-2" />
        <span className="type-caption w-8 text-right tabular-nums" aria-label={t("probability", { value: deal.probability })}>
          {deal.probability}%
        </span>
        <Avatar src={owner.avatar} size={18} />
      </div>
    </>
  );
}

export function DealCard({ deal }: { deal: Deal }) {
  const t = useTranslations("deals");
  const company = useCrm((s) => s.companies.find((c) => c.id === deal.companyId));
  const today = useCrm((s) => s.today);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage },
  });
  // dnd-kit types its sensor listeners as plain functions; these are the three sensors in use.
  const on = listeners as Partial<Record<"onMouseDown" | "onTouchStart" | "onKeyDown", (event: SyntheticEvent) => void>> | undefined;
  if (!company) return null;

  return (
    <article
      ref={setNodeRef}
      // Pointer drags start anywhere on the card; keyboard drags start from the handle below.
      onMouseDown={on?.onMouseDown}
      onTouchStart={on?.onTouchStart}
      onClick={() => {
        if (Date.now() - lastDragEnd > 250) openDeal(deal.id);
      }}
      className={cn(CARD, "cursor-grab transition-[border-color,opacity] hover:border-[#3a3a3a] active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <DealCardBody
        deal={deal}
        company={company}
        today={today}
        controls={
          <div className="-my-1 -mr-1.5 flex items-center" onClick={(e) => e.stopPropagation()}>
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              onKeyDown={on?.onKeyDown}
              aria-label={t("dragHandle", { name: `${deal.name} · ${company.name}` })}
              className="grid size-6 cursor-grab place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-white/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <GripVertical aria-hidden className="size-3.5" />
            </button>
            <DealActions deal={deal} companyName={company.name} onOpenCompany={() => openCompany(company.id)} />
          </div>
        }
      />
    </article>
  );
}

/** The copy rendered in the drag overlay. */
export function DealCardPreview({ deal }: { deal: Deal }) {
  const company = useCrm((s) => s.companies.find((c) => c.id === deal.companyId));
  const today = useCrm((s) => s.today);
  if (!company) return null;
  return (
    <div className={cn(CARD, "rotate-[1.5deg] cursor-grabbing border-[#454545] shadow-overlay")}>
      <DealCardBody deal={deal} company={company} today={today} />
    </div>
  );
}

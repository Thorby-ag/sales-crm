"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { CountBadge } from "@/components/ui/chips";
import { DEAL_STAGE_TONES } from "@/lib/constants";
import { dealsByStage, dealSummary } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFormat } from "../use-format";
import { DealCard, DealCardPreview, markDragEnd } from "./deal-card";
import { useMoveDeal } from "./deal-actions";

const TONE_DOT: Record<string, string> = {
  red: "bg-danger",
  amber: "bg-warning",
  green: "bg-success",
  teal: "bg-status",
  neutral: "bg-subtle",
};

// Pointer: the column under the cursor. Keyboard (no pointer): the column the dragged card overlaps.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Left/right arrows jump a whole column, so keyboard dragging moves between stages. */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") return undefined;
  const { droppableRects, collisionRect, over, active } = context;
  const current = (over?.id ?? active?.data.current?.stage) as DealStage | undefined;
  const index = current ? DEAL_STAGES.indexOf(current) : 0;
  const step = event.code === "ArrowRight" ? 1 : -1;
  const target = DEAL_STAGES[Math.min(DEAL_STAGES.length - 1, Math.max(0, index + step))]!;
  const rect = droppableRects.get(target);
  if (!rect || !collisionRect) return currentCoordinates;
  return { x: rect.left + (rect.width - collisionRect.width) / 2, y: currentCoordinates.y };
};

function Column({ stage, deals }: { stage: DealStage; deals: Deal[] }) {
  const t = useTranslations();
  const { money } = useFormat();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const summary = dealSummary(deals);

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`stage-${stage}`}
      className={cn(
        "flex w-[272px] shrink-0 snap-start flex-col rounded-xl border border-border bg-[#181818] transition-colors md:w-auto md:min-w-[214px] md:flex-1 md:basis-0",
        isOver && "border-primary/50 bg-primary/[0.05]",
      )}
    >
      <header className="flex shrink-0 flex-col gap-1.5 px-3 pt-3 pb-2.5">
        <h2 id={`stage-${stage}`} className="type-lead flex items-center gap-2">
          <span aria-hidden className={cn("size-2 rounded-full", TONE_DOT[DEAL_STAGE_TONES[stage]])} />
          {t(`dealStages.${stage}`)}
          <CountBadge className="ml-auto">{deals.length}</CountBadge>
        </h2>
        <p className="type-caption text-muted-foreground tabular-nums">{money(summary.amount)}</p>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 pb-2">
        {deals.map((deal) => (
          <li key={deal.id}>
            <DealCard deal={deal} />
          </li>
        ))}
        {deals.length === 0 && (
          <li className="type-caption grid h-20 place-items-center rounded-lg border border-dashed border-[#333] text-muted-foreground">
            {t("deals.emptyColumn")}
          </li>
        )}
      </ul>
    </section>
  );
}

export function DealsBoard({ deals }: { deals: Deal[] }) {
  const t = useTranslations();
  const allDeals = useCrm((s) => s.deals);
  const moveDeal = useMoveDeal();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // Only announce "over <stage>" when the stage under the card actually changes.
  const lastOver = useRef<UniqueIdentifier | null>(null);
  const columns = useMemo(() => dealsByStage(deals), [deals]);
  const activeDeal = activeId ? allDeals.find((d) => d.id === activeId) : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch screens, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );

  const dealName = (id: UniqueIdentifier) => {
    const deal = allDeals.find((d) => d.id === id);
    const company = useCrm.getState().companies.find((c) => c.id === deal?.companyId);
    return deal ? `${deal.name} · ${company?.name ?? ""}` : String(id);
  };
  const stageName = (stage: UniqueIdentifier) => t(`dealStages.${stage as DealStage}`);

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.data.current?.stage as DealStage;
      return t("deals.announcements.pickedUp", { deal: dealName(active.id), stage: stageName(lastOver.current) });
    },
    onDragOver: ({ active, over }) => {
      if ((over?.id ?? null) === lastOver.current) return undefined;
      lastOver.current = over?.id ?? null;
      return over
        ? t("deals.announcements.over", { deal: dealName(active.id), stage: stageName(over.id) })
        : t("deals.announcements.notOver", { deal: dealName(active.id) });
    },
    onDragEnd: ({ active, over }) => {
      if (!over) return t("deals.announcements.cancelled", { deal: dealName(active.id) });
      const same = over.id === active.data.current?.stage;
      return t(same ? "deals.announcements.droppedSame" : "deals.announcements.dropped", { deal: dealName(active.id), stage: stageName(over.id) });
    },
    onDragCancel: ({ active }) => t("deals.announcements.cancelled", { deal: dealName(active.id) }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("deals.dragHint") } }}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => {
        markDragEnd();
        setActiveId(null);
      }}
      onDragEnd={({ active, over }) => {
        markDragEnd();
        setActiveId(null);
        const deal = allDeals.find((d) => d.id === active.id);
        if (deal && over) moveDeal(deal, over.id as DealStage);
      }}
    >
      <div
        role="region"
        aria-label={t("deals.boardLabel")}
        className="flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4"
      >
        {DEAL_STAGES.map((stage) => (
          <Column key={stage} stage={stage} deals={columns[stage]} />
        ))}
      </div>
      <DragOverlay>{activeDeal ? <DealCardPreview deal={activeDeal} /> : null}</DragOverlay>
    </DndContext>
  );
}

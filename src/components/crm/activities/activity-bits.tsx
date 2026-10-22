"use client";

import { CalendarDays, CircleCheck, Ellipsis, ListTodo, Mail, Phone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCrm } from "@/lib/store";
import type { Activity, ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { withUndo } from "../undo";
import { useFormat } from "../use-format";

const ICONS: Record<ActivityType, LucideIcon> = { call: Phone, meeting: CalendarDays, email: Mail, task: ListTodo };

export const SUBJECT_LINK =
  "block max-w-full truncate text-left outline-none decoration-white/40 underline-offset-4 hover:underline focus-visible:underline";

export function ActivityIcon({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = ICONS[type];
  return (
    <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-lg border border-[#2c2c2c] bg-[#1e1e1e] text-soft", className)}>
      <Icon className="size-3.5" />
    </span>
  );
}

/** Marks an activity done, with undo. */
export function useCompleteActivity() {
  const t = useTranslations();
  return useCallback(
    (activity: Activity) =>
      withUndo(t("activities.completed", { subject: activity.subject }), t("common.undo"), () => useCrm.getState().completeActivity(activity.id)),
    [t],
  );
}

export function useDeleteActivity() {
  const t = useTranslations();
  return useCallback(
    (activity: Activity) =>
      withUndo(t("activities.deleted", { subject: activity.subject }), t("common.undo"), () => useCrm.getState().deleteActivity(activity.id)),
    [t],
  );
}

/** A box to tick off what's planned; what's done shows a check. */
export function DoneToggle({ activity }: { activity: Activity }) {
  const t = useTranslations("activities");
  const complete = useCompleteActivity();
  if (activity.done) {
    return (
      <span className="grid size-4 shrink-0 place-items-center">
        <CircleCheck aria-hidden className="size-4 text-status" />
        <span className="sr-only">{t("isDone")}</span>
      </span>
    );
  }
  return <Checkbox checked={false} onCheckedChange={() => complete(activity)} aria-label={t("markDone", { subject: activity.subject })} />;
}

/** When it's due (or happened), red once it's late. */
export function DueDate({ activity, className }: { activity: Activity; className?: string }) {
  const t = useTranslations("activities");
  const { date } = useFormat();
  const today = useCrm((s) => s.today);
  const planned = !activity.done;
  const overdue = planned && activity.date < today;
  const label = planned && activity.date === today ? t("today") : overdue ? t("overdueSince", { date: date(activity.date) }) : date(activity.date);
  return (
    <span className={cn("type-caption whitespace-nowrap tabular-nums", overdue ? "text-danger" : planned && activity.date === today ? "text-foreground" : "text-soft", className)}>
      {label}
    </span>
  );
}

export function ActivityMenu({ activity }: { activity: Activity }) {
  const t = useTranslations("activities");
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  const complete = useCompleteActivity();
  const remove = useDeleteActivity();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("actions", { subject: activity.subject })}>
          <Ellipsis aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {!activity.done && <DropdownMenuItem onSelect={() => complete(activity)}>{t("markDoneShort")}</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => openActivityDialog({ activityId: activity.id })}>{t("edit")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => remove(activity)} className="text-danger data-[highlighted]:text-danger">
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A compact list for the detail sheets. */
export function ActivityList({ activities, empty }: { activities: Activity[]; empty: string }) {
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  if (activities.length === 0) return <p className="type-caption text-muted-foreground">{empty}</p>;
  return (
    <ul className="-mx-2 flex flex-col">
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
          <DoneToggle activity={activity} />
          <ActivityIcon type={activity.type} className="size-6" />
          <button type="button" onClick={() => openActivityDialog({ activityId: activity.id })} className={cn(SUBJECT_LINK, "type-lead min-w-0 flex-1")}>
            {activity.subject}
          </button>
          <DueDate activity={activity} />
        </li>
      ))}
    </ul>
  );
}

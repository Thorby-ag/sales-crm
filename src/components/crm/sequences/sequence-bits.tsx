"use client";

import { useTranslations } from "next-intl";
import { Tag } from "@/components/ui/chips";
import type { TagTone } from "@/lib/constants";
import { sortedSteps, type EnrollmentStatus } from "@/lib/sequences";
import type { Sequence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityIcon } from "../activities/activity-bits";

const STATUS_TONES: Record<EnrollmentStatus, TagTone> = { active: "green", paused: "amber", replied: "teal", finished: "neutral" };

export function SequenceStatusTag({ active, className }: { active: boolean; className?: string }) {
  const t = useTranslations("sequences");
  return (
    <Tag tone={active ? "green" : "amber"} className={cn("type-caption h-5 px-1.5", className)}>
      {active ? t("running") : t("paused")}
    </Tag>
  );
}

export function EnrollmentStatusTag({ status, className }: { status: EnrollmentStatus; className?: string }) {
  const t = useTranslations("sequences.statuses");
  return (
    <Tag tone={STATUS_TONES[status]} className={cn("type-caption h-5 px-1.5", className)}>
      {t(status)}
    </Tag>
  );
}

/** The steps at a glance: one small icon per step, in order. */
export function StepStrip({ sequence }: { sequence: Sequence }) {
  const t = useTranslations("stepTypes");
  const steps = sortedSteps(sequence);
  return (
    <span className="flex items-center gap-1" aria-label={steps.map((s) => t(s.type)).join(", ")} role="img">
      {steps.map((step) => (
        <ActivityIcon key={step.id} type={step.type} className="size-5 rounded-md [&_svg]:size-3" />
      ))}
    </span>
  );
}

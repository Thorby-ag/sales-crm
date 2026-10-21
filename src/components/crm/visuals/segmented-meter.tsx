import { cn } from "@/lib/utils";

const TONES = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" } as const;

type Tone = keyof typeof TONES | "auto";

function segmentTone(index: number, filled: number, tone: Tone): string {
  if (index >= filled) return "bg-track";
  if (tone !== "auto") return TONES[tone];
  // Auto: the filled run goes red → amber → green in roughly equal thirds.
  if (index < Math.round(filled / 3)) return TONES.danger;
  if (index < Math.round((filled * 2) / 3)) return TONES.warning;
  return TONES.success;
}

export function SegmentedMeter({
  value,
  segments = 17,
  tone = "auto",
  label,
  className,
  segmentClassName,
}: {
  /** 0–100 */
  value: number;
  segments?: number;
  tone?: Tone;
  /** Accessible name. Without it the meter is decorative (hidden from assistive tech). */
  label?: string;
  className?: string;
  segmentClassName?: string;
}) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * segments);
  const a11y = label
    ? { role: "meter", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": value }
    : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      className={cn("flex h-[14px] items-center gap-[2px] overflow-hidden rounded-[2px] bg-white/8 px-[2px]", className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn("h-[10px] min-w-px flex-1 rounded-[1px]", segmentTone(i, filled, tone), segmentClassName)}
        />
      ))}
    </span>
  );
}

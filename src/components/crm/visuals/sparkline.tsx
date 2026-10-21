import { TREND_HIGHLIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX = 14;

/** Tiny bar chart. Bar heights are relative to the container height (14px by default). */
export function Sparkline({ values, className }: { values: readonly number[]; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-[14px] items-end gap-px", className)}>
      {values.map((value, i) => (
        <span
          key={i}
          className={cn(
            "w-1 shrink-0 rounded-[1px]",
            TREND_HIGHLIGHT[i % TREND_HIGHLIGHT.length] ? "bg-trend" : "bg-trend-muted",
          )}
          style={{ height: `${(Math.min(MAX, Math.max(1, Math.round(value))) / MAX) * 100}%` }}
        />
      ))}
    </span>
  );
}

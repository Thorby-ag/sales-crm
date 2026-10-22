import type { ComponentProps, ReactNode } from "react";
import type { TagTone } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CountBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-6 shrink-0 items-center justify-center rounded-full border border-[#3d3d3d] bg-muted px-1.5 text-[11px] leading-none text-chip tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export function Tag({ tone, className, children }: { tone: TagTone; className?: string; children: ReactNode }) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-full border border-(color:--tone-border) bg-(--tone-bg) px-2 type-lead whitespace-nowrap text-(color:--tone-text)",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-[#3a3a3a] bg-muted px-1.5 font-sans text-[11px] leading-none text-soft",
        className,
      )}
      {...props}
    />
  );
}

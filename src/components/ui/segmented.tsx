"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Pill-shaped switch between a few views. A radio group: arrow keys move the selection. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      aria-label={label}
      value={value}
      // Clicking the selected option would clear it; a segmented control always has one.
      onValueChange={(next) => next && onChange(next as T)}
      className={cn("inline-flex h-[30px] shrink-0 items-center gap-0.5 rounded-full bg-secondary p-[3px] shadow-raised", className)}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="type-caption h-6 rounded-full px-2.5 whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25 data-[state=on]:bg-muted data-[state=on]:text-foreground data-[state=on]:shadow-raised"
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

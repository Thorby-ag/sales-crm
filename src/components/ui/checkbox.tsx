"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "group grid size-4 shrink-0 place-items-center rounded-[4px] border border-line-strong text-[#1a1a1a] outline-none transition-colors",
        "hover:border-[#555] focus-visible:ring-2 focus-visible:ring-white/30",
        "data-[state=checked]:border-check data-[state=checked]:bg-check data-[state=indeterminate]:border-check data-[state=indeterminate]:bg-check",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        <Check className="size-3 group-data-[state=indeterminate]:hidden" strokeWidth={3.2} aria-hidden />
        <Minus className="hidden size-3 group-data-[state=indeterminate]:block" strokeWidth={3.2} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

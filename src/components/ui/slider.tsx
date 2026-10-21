"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  thumbLabel,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root> & { thumbLabel: string }) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-4 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] grow overflow-hidden rounded-full bg-track">
        <SliderPrimitive.Range className="absolute h-full bg-soft" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className="block size-4 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.5)] outline-none transition-shadow hover:ring-4 hover:ring-white/10 focus-visible:ring-4 focus-visible:ring-white/20"
      />
    </SliderPrimitive.Root>
  );
}

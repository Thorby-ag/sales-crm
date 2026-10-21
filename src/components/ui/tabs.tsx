"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

/** Underlined tab look, shared by Radix tabs and by navigation links (aria-current="page"). */
export const TAB_CLASSES =
  "group relative inline-grid h-[45px] items-center type-caption text-muted-foreground outline-none transition-colors hover:text-soft focus-visible:text-foreground data-[state=active]:text-foreground aria-[current=page]:text-foreground";

export function TabLabel({ children }: { children: string }) {
  return (
    <>
      <span className="col-start-1 row-start-1 group-data-[state=active]:font-medium group-aria-[current=page]:font-medium">
        {children}
      </span>
      {/* Reserves the bold width so tabs don't shift when they become active. */}
      <span aria-hidden className="invisible col-start-1 row-start-1 font-medium">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-px bg-foreground opacity-0 transition-opacity group-data-[state=active]:opacity-100 group-aria-[current=page]:opacity-100"
      />
    </>
  );
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex items-end gap-4", className)} {...props} />;
}

export function TabsTrigger({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof TabsPrimitive.Trigger>, "children"> & { children: string }) {
  return (
    <TabsPrimitive.Trigger className={cn(TAB_CLASSES, className)} {...props}>
      <TabLabel>{children}</TabLabel>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}

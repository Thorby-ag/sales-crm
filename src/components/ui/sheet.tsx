"use client";

import { X, type LucideIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { DialogOverlay, keepFocusInOtherDialog } from "./dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetClose = DialogPrimitive.Close;

const SIDES = {
  right:
    "inset-y-0 right-0 h-dvh w-full border-l data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right",
  left: "inset-y-0 left-0 h-dvh border-r data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom",
} as const;

export function SheetContent({
  side = "right",
  className,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: keyof typeof SIDES }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn("fixed z-50 flex flex-col bg-popover shadow-overlay outline-none", SIDES[side], className)}
        // Focus the panel itself instead of its first button (the close "×"), so opening
        // doesn't draw a focus ring; Tab still moves through the panel from the top.
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          keepFocusInOtherDialog(event);
        }}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  /** Read by screen readers only. */
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-14 shrink-0 items-center justify-between gap-2 border-b px-5", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-icon" aria-hidden />}
        <DialogPrimitive.Title className="type-lead">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
      </div>
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="icon-sm" className="-mr-1 text-foreground" aria-label="Close">
          <X className="size-4" aria-hidden />
        </Button>
      </DialogPrimitive.Close>
    </div>
  );
}

export function SheetBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>{children}</div>;
}

export function SheetFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3.5", className)}>
      {children}
    </div>
  );
}

export function SheetSection({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-4 border-b px-5 py-5 last:border-b-0", className)}>
      <div className="flex min-h-[30px] items-center justify-between gap-2">
        <h3 className="type-eyebrow">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

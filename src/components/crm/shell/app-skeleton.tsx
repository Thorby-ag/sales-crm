"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Placeholders shown in the static HTML until the browser loads the demo data.
// They mirror the real layout so nothing jumps when the app appears.

function Bar({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-full bg-white/[0.06]", className)} />;
}

const NAV_WIDTHS = ["w-[72%]", "w-[60%]", "w-[50%]", "w-[58%]", "w-[52%]", "w-[66%]"];
const ROW_WIDTHS = ["w-24", "w-20", "w-28", "w-24", "w-16", "w-20"];

export function SidebarSkeleton() {
  return (
    <aside aria-hidden className="hidden w-(--sidebar-width) shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex print:hidden">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-sidebar-accent px-3.5">
        <span className="size-[30px] rounded-lg bg-muted" />
        <div className="flex flex-col gap-1.5">
          <Bar className="h-2.5 w-20" />
          <Bar className="h-2 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-[14px] p-3 pt-5">
        {NAV_WIDTHS.map((w, i) => (
          <Bar key={i} className={cn("h-2.5", w)} />
        ))}
      </div>
    </aside>
  );
}

export function HeaderSkeleton() {
  return (
    <div aria-hidden className="flex h-14 shrink-0 items-center justify-between px-4">
      <Bar className="h-3 w-28" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-[30px] animate-pulse rounded-full bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}

function ForecastBody() {
  return (
    <div aria-hidden className="@container flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
      <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-3 @5xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-[88px] flex-col gap-3 rounded-xl border border-border bg-[#181818] p-3.5">
            <Bar className="h-2 w-16" />
            <Bar className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="h-[300px] shrink-0 animate-pulse rounded-xl border border-border bg-[#181818]" />
      <div className="flex-1 rounded-xl border border-border bg-[#181818]" />
    </div>
  );
}

export function ContentSkeleton({ variant = "table", tabs = true }: { variant?: "table" | "board" | "forecast"; tabs?: boolean }) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <span role="status" className="sr-only">
        {t("loading")}
      </span>
      <HeaderSkeleton />
      {tabs && (
        <div aria-hidden className="flex h-[46px] shrink-0 items-end gap-4 border-b border-border px-4 pb-4">
          <Bar className="h-2.5 w-16" />
          <Bar className="h-2.5 w-10" />
          <Bar className="h-2.5 w-14" />
        </div>
      )}
      <div aria-hidden className="flex shrink-0 gap-2 p-4">
        {["w-40", "w-36", "w-24", "w-40"].map((w, i) => (
          <span key={i} className={cn("h-[30px] animate-pulse rounded-full bg-white/[0.05]", w, i > 1 && "max-md:hidden")} />
        ))}
      </div>
      {variant === "forecast" ? (
        <ForecastBody />
      ) : variant === "table" ? (
        <div aria-hidden className="flex-1 overflow-hidden">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="flex h-[43px] items-center gap-6 border-b border-border px-4">
              <span className="size-4 rounded-[4px] border border-line-strong" />
              <Bar className={cn("h-2.5", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
              <Bar className="h-[18px] w-32 max-sm:hidden" />
              <Bar className="h-2.5 w-24 max-md:hidden" />
              <Bar className="ml-auto h-2.5 w-16 max-lg:hidden" />
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden className="flex flex-1 gap-3 overflow-hidden px-4 pb-4">
          {[4, 5, 4, 3, 2].map((cards, i) => (
            <div key={i} className="flex w-[272px] shrink-0 flex-col gap-2 rounded-xl border border-border bg-[#181818] p-2 md:w-auto md:flex-1">
              <Bar className="m-1.5 h-2.5 w-24" />
              {Array.from({ length: cards }, (_, j) => (
                <span key={j} className="h-[104px] animate-pulse rounded-lg bg-white/[0.035]" />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  BookUser,
  Building2,
  ChartBar,
  ChartColumn,
  CircleHelp,
  CreditCard,
  Crosshair,
  ListChecks,
  Mail,
  RotateCcw,
  SquareKanban,
  Target,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/chips";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { dueCount } from "@/lib/activities";
import { isOpen } from "@/lib/deals";
import { quarterOf } from "@/lib/format";
import { useCrm } from "@/lib/store";
import type { Region, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { withUndo } from "../undo";
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from "./sidebar-config";
import { setSidebarWidth, useSidebarWidth } from "./sidebar-width";

type Href = ComponentProps<typeof Link>["href"];

const ITEM = "group h-[30px] gap-2 py-0 data-[active=true]:h-8";

const TEAMS: { team: Team; icon: LucideIcon }[] = [
  { team: "strategic", icon: Target },
  { team: "mid-market", icon: Crosshair },
  { team: "sdr", icon: Users },
];

const REGIONS: { region: Region; dot: string }[] = [
  { region: "north-america", dot: "#facc15" },
  { region: "emea", dot: "#f43f7a" },
  { region: "apac", dot: "#a78bfa" },
];

function AppMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <rect x="1.5" y="2" width="13" height="3" rx="1.5" fill="currentColor" />
      <rect x="3.5" y="6.5" width="9" height="3" rx="1.5" fill="currentColor" opacity="0.75" />
      <rect x="5.5" y="11" width="5" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function ItemIcon({ icon: Icon, dot }: { icon?: LucideIcon; dot?: string }) {
  if (Icon) {
    return (
      <Icon
        aria-hidden
        className="size-3.5 text-subtle transition-colors group-hover:text-foreground group-data-[active=true]:text-foreground"
      />
    );
  }
  return <span aria-hidden className="mx-[3px] size-2 rounded-full" style={{ background: dot }} />;
}

/** Which nav entry matches the current URL: a page, or a saved view (team, region, close window). */
function useActiveItem(): string {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/forecast") return "forecast";
  if (pathname === "/contacts") return "contacts";
  if (pathname === "/activities") return "activities";
  if (pathname === "/sequences") return "sequences";
  if (pathname === "/deals") return params.get("close") ? `close:${params.get("close")}` : "deals";
  if (pathname === "/") {
    if (params.get("team")) return `team:${params.get("team")}`;
    if (params.get("region")) return `region:${params.get("region")}`;
    return "companies";
  }
  return "";
}

function NavLink({
  id,
  active,
  href,
  label,
  icon,
  dot,
  count,
}: {
  id: string;
  active: string;
  href: Href;
  label: string;
  icon?: LucideIcon;
  dot?: string;
  count?: number;
}) {
  const setMobileNavOpen = useCrm((s) => s.setMobileNavOpen);
  const isActive = active === id;
  return (
    <li className={cn(isActive && "mb-0.5")}>
      <Link
        href={href}
        data-active={isActive}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setMobileNavOpen(false)}
        className={buttonClasses({ variant: "nav", size: "md", className: ITEM })}
      >
        <ItemIcon icon={icon} dot={dot} />
        <span className="truncate">{label}</span>
        {count !== undefined && <CountBadge className="ml-auto">{count}</CountBadge>}
      </Link>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-sidebar-border p-3 last:border-b-0">
      <h2 className="type-eyebrow pt-1 pb-2.5 text-muted-foreground">{title}</h2>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function SidebarContent() {
  const t = useTranslations();
  const active = useActiveItem();
  const companyCount = useCrm((s) => s.companies.length);
  const contactCount = useCrm((s) => s.contacts.length);
  const due = useCrm((s) => dueCount(s.activities, s.today));
  const sequenceCount = useCrm((s) => s.sequences.length);
  const openDeals = useCrm((s) => s.deals.filter(isOpen).length);
  const quarter = useCrm((s) => quarterOf(s.today));

  const comingSoon = (feature: "invite" | "help" | "billing") =>
    toast(t("toasts.comingSoon", { feature: t(`toasts.features.${feature}`) }));
  const resetDemo = () => withUndo(t("toasts.demoReset"), t("common.undo"), () => useCrm.getState().resetDemo());

  return (
    <nav aria-label={t("nav.label")} className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-sidebar-accent px-3.5">
        <span className="grid size-[30px] place-items-center rounded-lg bg-muted text-foreground shadow-raised">
          <AppMark />
        </span>
        <div className="min-w-0">
          <p className="type-lead truncate font-medium">{t("brand.name")}</p>
          <p className="type-caption mt-1 truncate text-muted-foreground">{t("brand.tagline")}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col border-b border-sidebar-border p-3">
          <NavLink id="companies" active={active} href="/" label={t("nav.companies")} icon={Building2} count={companyCount} />
          <NavLink id="deals" active={active} href="/deals" label={t("nav.dealsBoard")} icon={SquareKanban} count={openDeals} />
          <NavLink id="forecast" active={active} href="/forecast" label={t("nav.forecast")} icon={ChartColumn} />
          <NavLink id="activities" active={active} href="/activities" label={t("nav.activities")} icon={ListChecks} count={due || undefined} />
          <NavLink id="contacts" active={active} href="/contacts" label={t("nav.contacts")} icon={BookUser} count={contactCount} />
          <NavLink id="sequences" active={active} href="/sequences" label={t("nav.emailSequences")} icon={Mail} count={sequenceCount} />
        </ul>
        <Section title={t("nav.team")}>
          {TEAMS.map(({ team, icon }) => (
            <NavLink key={team} id={`team:${team}`} active={active} href={{ pathname: "/", query: { team } }} label={t(`teams.${team}`)} icon={icon} />
          ))}
        </Section>
        <Section title={t("nav.reporting")}>
          <NavLink
            id="close:quarter"
            active={active}
            href={{ pathname: "/deals", query: { close: "quarter" } }}
            label={t("nav.closingQuarter", { quarter })}
            icon={ChartBar}
          />
          <NavLink
            id="close:overdue"
            active={active}
            href={{ pathname: "/deals", query: { close: "overdue" } }}
            label={t("nav.slippingDeals")}
            icon={TriangleAlert}
          />
        </Section>
        <Section title={t("nav.pipelines")}>
          {REGIONS.map(({ region, dot }) => (
            <NavLink key={region} id={`region:${region}`} active={active} href={{ pathname: "/", query: { region } }} label={t(`regions.${region}`)} dot={dot} />
          ))}
        </Section>
      </div>

      <ul className="flex shrink-0 flex-col border-t border-sidebar-border p-3">
        {(
          [
            { label: t("nav.invite"), icon: UserPlus, onClick: () => comingSoon("invite") },
            { label: t("nav.help"), icon: CircleHelp, onClick: () => comingSoon("help") },
            { label: t("nav.resetDemo"), icon: RotateCcw, onClick: resetDemo },
          ] as const
        ).map(({ label, icon: Icon, onClick }) => (
          <li key={label}>
            <Button variant="nav" size="md" className="group h-[30px] gap-2 py-0" onClick={onClick}>
              <Icon aria-hidden className="size-3.5 text-subtle group-hover:text-foreground" />
              {label}
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-sidebar-border px-4 py-4">
        <div className="min-w-0">
          <p className="type-lead">{t("nav.trialLeft", { days: 14 })}</p>
          <p className="type-caption mt-1.5 text-muted-foreground">{t("nav.trialHint")}</p>
        </div>
        <Button variant="secondary" size="sm" className="type-lead h-[30px] gap-1.5" onClick={() => comingSoon("billing")}>
          <CreditCard aria-hidden className="size-3.5" />
          {t("nav.addBilling")}
        </Button>
      </div>
    </nav>
  );
}

function ResizeHandle() {
  const t = useTranslations("nav");
  const width = useSidebarWidth();

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = width;
    handle.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    const onMove = (e: PointerEvent) => setSidebarWidth(startWidth + e.clientX - startX);
    const onUp = () => {
      document.body.style.cursor = "";
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("resizeSidebar")}
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 48 : 16;
        if (e.key === "ArrowLeft") setSidebarWidth(width - step);
        else if (e.key === "ArrowRight") setSidebarWidth(width + step);
        else if (e.key === "Home") setSidebarWidth(SIDEBAR_MIN);
        else if (e.key === "End") setSidebarWidth(SIDEBAR_MAX);
        else return;
        e.preventDefault();
      }}
      className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150 group-hover:bg-line-strong group-focus-visible:bg-subtle group-active:bg-subtle" />
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="relative hidden w-(--sidebar-width) shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarContent />
      <ResizeHandle />
    </aside>
  );
}

export function MobileSidebar() {
  const t = useTranslations("nav");
  const open = useCrm((s) => s.mobileNavOpen);
  const setOpen = useCrm((s) => s.setMobileNavOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[254px] max-w-[85vw] border-sidebar-border bg-sidebar lg:hidden">
        <DialogPrimitive.Title className="sr-only">{t("navigationTitle")}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{t("navigationDescription")}</DialogPrimitive.Description>
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

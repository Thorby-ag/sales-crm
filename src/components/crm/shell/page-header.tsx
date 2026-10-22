"use client";

import { Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TAB_CLASSES, TabLabel } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { CURRENT_USER } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import { Avatar } from "../visuals/avatar";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationsPopover } from "./notifications-popover";

/** Pipeline views share tabs; the other pages only have a title. */
const VIEW_PATHS = { companies: "/", deals: "/deals", forecast: "/forecast" } as const;
type PipelineView = keyof typeof VIEW_PATHS;
export type View = PipelineView | "contacts" | "activities";

const isPipelineView = (view: View): view is PipelineView => view in VIEW_PATHS;

function StatusBadge({ children }: { children: string }) {
  return (
    <span className="type-caption inline-flex shrink-0 items-center gap-1 rounded-full border border-[#363636] bg-muted py-[3px] pr-[6px] pl-[4px]">
      <span aria-hidden className="grid size-3 place-items-center">
        <span className="size-[7px] rounded-full bg-status shadow-[0_0_0_2px_rgb(22_200_158/0.18)]" />
      </span>
      {children}
    </span>
  );
}

/** Tabs that switch between the pages. */
function ViewTabs({ view }: { view: PipelineView }) {
  const t = useTranslations();
  return (
    <nav aria-label={t("views.label")} className="shrink-0 border-b border-border px-4">
      <ul className="flex items-end gap-4">
        {(Object.keys(VIEW_PATHS) as PipelineView[]).map((v) => (
          <li key={v}>
            <Link href={VIEW_PATHS[v]} aria-current={v === view ? "page" : undefined} className={TAB_CLASSES}>
              <TabLabel>{t(`views.${v}`)}</TabLabel>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ view }: { view?: View }) {
  const t = useTranslations();
  const setMobileNavOpen = useCrm((s) => s.setMobileNavOpen);
  const setSearchOpen = useCrm((s) => s.setSearchOpen);
  const openProfile = useCrm((s) => s.openProfile);

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-[13px]">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="secondary" size="icon" className="lg:hidden" aria-label={t("nav.openNavigation")} onClick={() => setMobileNavOpen(true)}>
            <Menu className="size-3.5" aria-hidden />
          </Button>
          <h1 className="type-title truncate">{view ? t(`views.${view}`) : t("notFound.title")}</h1>
          {view === "companies" && <StatusBadge>{t("views.active")}</StatusBadge>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label={t("header.search")}
            aria-keyshortcuts="Meta+K Control+K"
            title={t("header.searchHint")}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-3.5" aria-hidden />
          </Button>
          <NotificationsPopover />
          <LanguageSwitcher />
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 pr-3 pl-[5px] max-sm:size-[30px] max-sm:p-[5px]"
            aria-label={t("header.openProfile", { name: CURRENT_USER.name })}
            onClick={() => openProfile(CURRENT_USER.name)}
          >
            <Avatar src={CURRENT_USER.avatar} size={20} />
            <span className="max-md:hidden">{CURRENT_USER.name}</span>
          </Button>
        </div>
      </header>
      {view && isPipelineView(view) && <ViewTabs view={view} />}
    </>
  );
}

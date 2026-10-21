"use client";

import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/chips";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScoreCardId } from "@/lib/companies";
import { NOTIFICATIONS } from "@/lib/data/notifications";
import { personByName } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import type { CrmNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openCompany } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";

function NotificationItem({ notification, unread, onOpen }: { notification: CrmNotification; unread: boolean; onOpen: () => void }) {
  const t = useTranslations();
  const { ago, money } = useFormat();
  const company = useCrm((s) => s.companies.find((c) => c.id === notification.companyId));
  if (!company) return null;
  const actor = notification.actor ? personByName(notification.actor) : null;
  const params = notification.params ?? {};
  const card = params.card as ScoreCardId | undefined;

  const message = t.rich(`notifications.messages.${notification.kind}`, {
    actor: actor?.name ?? "",
    company: company.name,
    stage: String(params.stage ?? ""),
    value: notification.kind === "pipelineUp" ? money(Number(params.value)) : String(params.value ?? ""),
    card: card ? t(`scoreCards.${card}.title`) : "",
    b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
  });

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full gap-3 rounded-lg p-2.5 text-left outline-none transition-colors hover:bg-white/4 focus-visible:bg-white/6",
          unread && "bg-white/[0.025]",
        )}
      >
        <span className="relative mt-px block size-[30px] shrink-0">
          {actor ? (
            <>
              <Avatar src={actor.avatar} size={30} />
              <CompanyLogo logo={company.logo} size={14} className="absolute -right-0.5 -bottom-0.5 ring-2 ring-popover" />
            </>
          ) : (
            <CompanyLogo logo={company.logo} size={30} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("type-body block", actor ? "text-soft" : "text-foreground")}>{message}</span>
          {notification.quoteKey && (
            <span className="type-body mt-2 block rounded-lg border border-[#2f2f2f] bg-[#1d1d1d] px-3 py-2 text-soft">
              {t(`notifications.quotes.${notification.quoteKey}`)}
            </span>
          )}
          <span className="type-caption mt-1.5 block text-muted-foreground">
            {ago(notification.minutesAgo)} · {company.name}
          </span>
        </span>
        {unread && (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger">
            <span className="sr-only">{t("notifications.unread")}</span>
          </span>
        )}
      </button>
    </li>
  );
}

function NotificationList({ items, onOpen }: { items: CrmNotification[]; onOpen: (n: CrmNotification) => void }) {
  const t = useTranslations("notifications");
  const unreadIds = useCrm((s) => s.unreadIds);
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-soft shadow-raised">
          <BellOff className="size-4" aria-hidden />
        </span>
        <p className="type-lead mt-4">{t("emptyTitle")}</p>
        <p className="type-caption mt-2 text-muted-foreground">{t("emptyText")}</p>
      </div>
    );
  }
  return (
    <ul className="flex max-h-[min(440px,60dvh)] flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5">
      {items.map((n) => (
        <NotificationItem key={n.id} notification={n} unread={unreadIds.includes(n.id)} onOpen={() => onOpen(n)} />
      ))}
    </ul>
  );
}

export function NotificationsPopover() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const unreadIds = useCrm((s) => s.unreadIds);
  const companyIds = useCrm((s) => s.companies.map((c) => c.id).join(","));
  const markRead = useCrm((s) => s.markRead);
  const markAllRead = useCrm((s) => s.markAllRead);

  // Notifications about companies that were deleted from the demo disappear with them.
  const available = NOTIFICATIONS.filter((n) => companyIds.split(",").includes(n.companyId));
  const unread = available.filter((n) => unreadIds.includes(n.id)).length;

  const handleOpen = (n: CrmNotification) => {
    markRead(n.id);
    setOpen(false);
    openCompany(n.companyId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative"
          aria-label={unread ? t("header.notificationsUnread", { count: unread }) : t("header.notifications")}
        >
          <Bell className="size-3.5" aria-hidden />
          {unread > 0 && <span aria-hidden className="absolute top-[6px] right-[7px] size-[7px] rounded-full bg-danger ring-2 ring-secondary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby="notifications-title" className="w-[min(400px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <h2 id="notifications-title" className="type-title">
              {t("notifications.title")}
            </h2>
            {unread > 0 && <CountBadge>{unread}</CountBadge>}
          </div>
          <Button variant="ghost" size="sm" className="-mr-2" disabled={unread === 0} onClick={markAllRead}>
            {t("notifications.markAll")}
          </Button>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label={t("notifications.filterLabel")} className="border-b px-4">
            <TabsTrigger value="all">{t("notifications.all")}</TabsTrigger>
            <TabsTrigger value="unread">{t("notifications.unread")}</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <NotificationList items={available} onOpen={handleOpen} />
          </TabsContent>
          <TabsContent value="unread">
            <NotificationList items={available.filter((n) => unreadIds.includes(n.id))} onOpen={handleOpen} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { CalendarPlus, Plus, RotateCcw, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/chips";
import { Segmented } from "@/components/ui/segmented";
import { CARD, TEXT_LINK } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { dealsWithoutNextStep, doneActivities, filterActivities, plannedGroups } from "@/lib/activities";
import { OWNER_NAMES, personByName } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import { ACTIVITY_TYPES, ACTIVITY_VIEWS, type Activity, type ActivityType, type Company, type Contact, type Deal, type Sequence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL, FilterMenu } from "../filter-menu";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { openCompany, openContact, openDeal, useActivityFilters } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { ContactAvatar } from "../visuals/contact-avatar";
import { Money } from "../visuals/money";
import { ActivityIcon, ActivityMenu, DoneToggle, DueDate } from "./activity-bits";

const META_LINK = "min-w-0 truncate outline-none hover:text-foreground focus-visible:text-foreground focus-visible:underline";

interface Lookups {
  companies: Map<string, Company>;
  deals: Map<string, Deal>;
  contacts: Map<string, Contact>;
  /** The sequence each enrollment belongs to. */
  sequences: Map<string, Sequence>;
}

function ActivityRow({ activity, lookups }: { activity: Activity; lookups: Lookups }) {
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  const company = lookups.companies.get(activity.companyId);
  const deal = activity.dealId ? lookups.deals.get(activity.dealId) : undefined;
  const contact = activity.contactId ? lookups.contacts.get(activity.contactId) : undefined;
  const sequence = activity.enrollmentId ? lookups.sequences.get(activity.enrollmentId) : undefined;
  const owner = personByName(activity.owner);

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-[#1a1a1a]">
      <DoneToggle activity={activity} />
      <ActivityIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => openActivityDialog({ activityId: activity.id })} className={cn(TEXT_LINK, "type-lead")}>
          {activity.subject}
        </button>
        <p className="type-caption mt-1.5 flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {company && (
            <button type="button" onClick={() => openCompany(company.id)} className={cn(META_LINK, "flex shrink-0 items-center gap-1.5")}>
              <CompanyLogo logo={company.logo} size={14} />
              {company.name}
            </button>
          )}
          {deal && (
            <>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <button type="button" onClick={() => openDeal(deal.id)} className={META_LINK}>
                {deal.name}
              </button>
            </>
          )}
          {sequence && (
            <>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <Link href={{ pathname: "/sequences", query: { sequence: sequence.id } }} className={cn(META_LINK, "flex items-center gap-1")}>
                <Send aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{sequence.name}</span>
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="w-[170px] shrink-0 max-lg:hidden">
        {contact && (
          <button type="button" onClick={() => openContact(contact.id)} className={cn(META_LINK, "type-caption flex max-w-full items-center gap-2 text-soft")}>
            <ContactAvatar name={contact.name} size={20} />
            <span className="truncate">{contact.name}</span>
          </button>
        )}
      </div>
      <span title={owner.name} className="max-md:hidden">
        <Avatar src={owner.avatar} size={20} />
        <span className="sr-only">{owner.name}</span>
      </span>
      <DueDate activity={activity} className="w-[96px] text-right" />
      <ActivityMenu activity={activity} />
    </li>
  );
}

function Group({ id, title, dot, activities, lookups }: { id: string; title: string; dot: string; activities: Activity[]; lookups: Lookups }) {
  if (activities.length === 0) return null;
  return (
    <section aria-labelledby={`activities-${id}`}>
      <h2
        id={`activities-${id}`}
        className="type-caption sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2.5 text-muted-foreground backdrop-blur-sm"
      >
        <span aria-hidden className={cn("size-2 rounded-full", dot)} />
        <span className="font-medium text-foreground">{title}</span>
        <CountBadge>{activities.length}</CountBadge>
      </h2>
      <ul>
        {activities.map((activity) => (
          <ActivityRow key={activity.id} activity={activity} lookups={lookups} />
        ))}
      </ul>
    </section>
  );
}

/** Deals closing soon with nothing planned: the gaps a manager asks about. */
function NextStepGaps({ deals, companies }: { deals: Deal[]; companies: Map<string, Company> }) {
  const t = useTranslations();
  const { money, date } = useFormat();
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  const amount = deals.reduce((sum, d) => sum + d.amount, 0);
  const shown = deals.slice(0, 6);

  return (
    <section aria-labelledby="activities-gaps" className="flex flex-col gap-3">
      <div>
        <h2 id="activities-gaps" className="type-lead font-medium">
          {t("activities.gapsTitle")}
        </h2>
        <p className="type-caption mt-2 leading-snug text-soft">
          {deals.length > 0 ? t("activities.gapsHint", { count: deals.length, amount: money(amount) }) : t("activities.gapsNone")}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {shown.map((deal) => {
          const company = companies.get(deal.companyId);
          return (
            <li key={deal.id} className={cn(CARD, "flex flex-col gap-2.5 p-3")}>
              <div className="flex min-w-0 items-center gap-2">
                {company && <CompanyLogo logo={company.logo} size={18} />}
                <span className="type-caption truncate text-muted-foreground">{company?.name}</span>
              </div>
              <button type="button" onClick={() => openDeal(deal.id)} className={cn(TEXT_LINK, "type-lead")}>
                {deal.name}
              </button>
              <div className="type-caption flex items-center justify-between gap-2 text-soft">
                <Money value={deal.amount} className="text-foreground" />
                <span>{t("deals.closes", { date: date(deal.closeDate) })}</span>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                aria-label={t("activities.planFor", { deal: `${deal.name} · ${company?.name ?? ""}` })}
                onClick={() => openActivityDialog({ companyId: deal.companyId, dealId: deal.id })}
              >
                <CalendarPlus aria-hidden className="size-3" />
                {t("activities.planNextStep")}
              </Button>
            </li>
          );
        })}
      </ul>
      {deals.length > shown.length && <p className="type-caption text-muted-foreground">{t("activities.gapsMore", { count: deals.length - shown.length })}</p>}
    </section>
  );
}

function ActivitiesView() {
  const t = useTranslations();
  const { filters, setFilters, resetFilters } = useActivityFilters();
  const activities = useCrm((s) => s.activities);
  const companies = useCrm((s) => s.companies);
  const deals = useCrm((s) => s.deals);
  const contacts = useCrm((s) => s.contacts);
  const sequences = useCrm((s) => s.sequences);
  const enrollments = useCrm((s) => s.enrollments);
  const today = useCrm((s) => s.today);
  const openActivityDialog = useCrm((s) => s.openActivityDialog);

  const lookups = useMemo<Lookups>(() => {
    const byId = new Map(sequences.map((s) => [s.id, s]));
    return {
      companies: new Map(companies.map((c) => [c.id, c])),
      deals: new Map(deals.map((d) => [d.id, d])),
      contacts: new Map(contacts.map((c) => [c.id, c])),
      sequences: new Map(enrollments.flatMap((e) => (byId.has(e.sequenceId) ? [[e.id, byId.get(e.sequenceId)!] as const] : []))),
    };
  }, [companies, deals, contacts, sequences, enrollments]);
  const visible = useMemo(() => filterActivities(activities, filters), [activities, filters]);
  const groups = useMemo(() => plannedGroups(visible, today), [visible, today]);
  const done = useMemo(() => doneActivities(visible), [visible]);
  const gaps = useMemo(
    () => dealsWithoutNextStep(filters.owner ? deals.filter((d) => d.owner === filters.owner) : deals, activities, today),
    [deals, activities, filters.owner, today],
  );
  const active = filters.owner !== null || filters.type !== null;
  const nothing = filters.view === "todo" ? groups.overdue.length + groups.today.length + groups.upcoming.length === 0 : done.length === 0;

  return (
    <>
      <PageHeader view="activities" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Segmented
            label={t("activities.viewLabel")}
            value={filters.view}
            options={ACTIVITY_VIEWS.map((view) => ({ value: view, label: t(`activities.views.${view}`) }))}
            onChange={(view) => setFilters({ view })}
          />
          <FilterMenu
            label={t("filters.filter")}
            title={t("filters.ownerTitle")}
            groups={[
              { options: [{ value: ALL, label: t("filters.allOwners") }] },
              { label: t("filters.accountOwners"), options: OWNER_NAMES.map((name) => ({ value: name, label: name })) },
            ]}
            value={filters.owner ?? ALL}
            onChange={(v) => setFilters({ owner: v === ALL ? null : v })}
          />
          <FilterMenu
            label={t("activities.type")}
            title={t("activities.typeTitle")}
            groups={[{ options: [{ value: ALL, label: t("activities.allTypes") }, ...ACTIVITY_TYPES.map((type) => ({ value: type, label: t(`activityTypes.${type}`) }))] }]}
            value={filters.type ?? ALL}
            onChange={(v) => setFilters({ type: v === ALL ? null : (v as ActivityType) })}
          />
          {active && (
            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw aria-hidden className="size-3" />
              {t("common.reset")}
            </Button>
          )}
        </div>
        <Button variant="primary" onClick={() => openActivityDialog({})}>
          <Plus aria-hidden className="size-3" />
          {t("activities.new")}
        </Button>
      </div>
      <div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border">
        <div className="grid @5xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {filters.view === "todo" ? (
              <>
                <Group id="overdue" title={t("activities.groups.overdue")} dot="bg-danger" activities={groups.overdue} lookups={lookups} />
                <Group id="today" title={t("activities.groups.today")} dot="bg-warning" activities={groups.today} lookups={lookups} />
                <Group id="upcoming" title={t("activities.groups.upcoming")} dot="bg-subtle" activities={groups.upcoming} lookups={lookups} />
              </>
            ) : (
              <Group id="done" title={t("activities.groups.done")} dot="bg-status" activities={done} lookups={lookups} />
            )}
            {nothing && (
              <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-center">
                <p className="type-caption text-muted-foreground">{filters.view === "todo" ? t("activities.emptyTodo") : t("activities.emptyDone")}</p>
                {active && (
                  <Button variant="link" size="none" className="type-caption" onClick={resetFilters}>
                    {t("table.resetFilters")}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-border p-4 @5xl:border-t-0 @5xl:border-l">
            <NextStepGaps deals={gaps} companies={lookups.companies} />
          </div>
        </div>
      </div>
    </>
  );
}

export function ActivitiesPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <ActivitiesView /> : <ContentSkeleton variant="table" tabs={false} />;
}

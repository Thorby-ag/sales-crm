"use client";

import { Building2, CalendarDays, ChevronDown, Clock, Mail, MousePointerClick, Phone, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetSection } from "@/components/ui/sheet";
import { activitySummary, scoreCards } from "@/lib/companies";
import { SCORE_CARD_REVIEWERS, personByName } from "@/lib/data/people";
import { companyRows, dealsByStage, isOpen, isOverdue, pipelineByStage } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import { DEAL_STAGES, OPEN_DEAL_STAGES, TREND_WINDOWS, type Company, type Deal, type TrendWindow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DealActions, StageTag } from "../deals/deal-actions";
import { closeCompany, openDeal, useOpenCompanyId } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { Money } from "../visuals/money";
import { SegmentedMeter } from "../visuals/segmented-meter";
import { Sparkline } from "../visuals/sparkline";
import { StarRating } from "../visuals/star-rating";
import { TagList } from "../visuals/tag-list";

const STAGE_TONES = { discovery: "danger", evaluation: "warning", procurement: "success" } as const;

function WindowMenu({ value, onChange }: { value: TrendWindow; onChange: (value: TrendWindow) => void }) {
  const t = useTranslations("detail");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="gap-1" aria-label={t("activityWindow", { days: value })}>
          {t("lastDays", { days: value })}
          <ChevronDown aria-hidden className="size-3 text-soft" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuRadioGroup value={String(value)} onValueChange={(v) => onChange(Number(v) as TrendWindow)}>
          {TREND_WINDOWS.map((days) => (
            <DropdownMenuRadioItem key={days} value={String(days)}>
              {t("lastDays", { days })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DealList({ deals, today }: { deals: Deal[]; today: string }) {
  const t = useTranslations();
  const { date } = useFormat();
  const columns = dealsByStage(deals);
  const ordered = DEAL_STAGES.flatMap((stage) => columns[stage]);
  if (ordered.length === 0) return <p className="type-caption text-muted-foreground">{t("detail.noDeals")}</p>;
  return (
    <ul className="-mx-2 flex flex-col">
      {ordered.map((deal) => {
        const overdue = isOverdue(deal, today);
        return (
          <li key={deal.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
            <StageTag stage={deal.stage} className="w-[104px] justify-center" />
            <button
              type="button"
              onClick={() => openDeal(deal.id)}
              className="type-lead min-w-0 flex-1 truncate text-left outline-none decoration-white/40 underline-offset-4 hover:underline focus-visible:underline"
            >
              {deal.name}
            </button>
            <span className={cn("type-caption whitespace-nowrap", overdue ? "text-danger" : "text-muted-foreground")}>
              {overdue ? t("deals.overdue") : t(isOpen(deal) ? "deals.closes" : "deals.closed", { date: date(deal.closeDate) })}
            </span>
            <Money value={deal.amount} className="type-lead w-[92px] text-right" />
            <DealActions deal={deal} className="-mr-1" />
          </li>
        );
      })}
    </ul>
  );
}

function DetailContent({ company }: { company: Company }) {
  const t = useTranslations();
  const { ago, money } = useFormat();
  const allDeals = useCrm((s) => s.deals);
  const today = useCrm((s) => s.today);
  const saved = useCrm((s) => s.scoreOverrides[company.id]);
  const openProfile = useCrm((s) => s.openProfile);
  const setScoreOverride = useCrm((s) => s.setScoreOverride);

  const deals = useMemo(() => allDeals.filter((d) => d.companyId === company.id), [allDeals, company.id]);
  const row = useMemo(() => companyRows([company], deals)[0]!, [company, deals]);
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(30);
  const [draft, setDraft] = useState(() => scoreCards(row, saved).map((card) => card.stars));

  const owner = personByName(company.owner);
  const stages = pipelineByStage(deals);
  const activity = activitySummary(row, trendWindow);
  const cards = scoreCards(row, draft);
  const savedStars = scoreCards(row, saved).map((card) => card.stars);
  const dirty = draft.some((stars, i) => stars !== savedStars[i]);

  const stats = [
    { label: t("detail.totalTouches"), value: activity.touches, icon: MousePointerClick },
    { label: t("detail.emails"), value: activity.emails, icon: Mail },
    { label: t("detail.meetings"), value: activity.meetings, icon: CalendarDays },
    { label: t("detail.calls"), value: activity.calls, icon: PhoneCall },
  ];

  const save = () => {
    setScoreOverride(company.id, draft);
    closeCompany();
    toast.success(t("detail.saved", { name: company.name }));
  };

  return (
    <>
      <SheetHeader icon={Building2} title={t("detail.title")} description={t("detail.description")} />
      <SheetBody>
        <section className="flex items-center gap-3.5 border-b px-5 py-5">
          <CompanyLogo logo={company.logo} size={50} className="rounded-xl" />
          <div className="min-w-0">
            <h3 className="type-title truncate">{company.name}</h3>
            <TagList tags={company.tags} wrap className="mt-2.5" />
          </div>
        </section>

        <SheetSection title={t("detail.accountSummary")}>
          <div className="type-lead flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              onClick={() => {
                closeCompany();
                openProfile(owner.name);
              }}
              className="-ml-1 flex items-center gap-2 rounded-full py-0.5 pr-2 pl-1 outline-none transition-colors hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <Avatar src={owner.avatar} size={20} />
              {owner.name}
            </button>
            <a href={`mailto:${owner.email}`} className="flex items-center gap-1.5 text-foreground hover:text-soft">
              <Mail aria-hidden className="size-3 text-soft" />
              {owner.email}
            </a>
            <a href={`tel:${owner.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 text-foreground hover:text-soft">
              <Phone aria-hidden className="size-3 text-soft" />
              {owner.phone}
            </a>
          </div>
        </SheetSection>

        <SheetSection title={t("detail.pipelineHealth")}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[28px] leading-none font-semibold tabular-nums">
              {row.winProbability === null ? t("common.noValue") : `${row.winProbability}%`}
            </span>
            <span className="type-caption text-soft">{row.winProbability === null ? t("detail.noOpenDeals") : t("detail.winAcross")}</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {OPEN_DEAL_STAGES.map((stage) => {
              const slice = stages[stage];
              return (
                <div key={stage} className="flex flex-col gap-2">
                  <div className="type-caption flex items-center justify-between gap-3">
                    <span>{t(`dealStages.${stage}`)}</span>
                    <span className="text-soft tabular-nums">{t("detail.stageLine", { count: slice.count, amount: money(slice.amount) })}</span>
                  </div>
                  <SegmentedMeter
                    value={slice.share}
                    segments={40}
                    tone={STAGE_TONES[stage]}
                    label={t("detail.stageMeter", { stage: t(`dealStages.${stage}`), share: slice.share })}
                    className="h-3 w-full border border-white/4 px-px"
                    segmentClassName="h-2"
                  />
                </div>
              );
            })}
          </div>
        </SheetSection>

        <SheetSection title={t("detail.deals")} className="gap-2">
          <DealList deals={deals} today={today} />
        </SheetSection>

        <SheetSection title={t("detail.activityTrend")} action={<WindowMenu value={trendWindow} onChange={setTrendWindow} />}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-1.5">
              <span className="text-[24px] leading-none tabular-nums">{activity.score}</span>
              <Sparkline values={company.trend} className="h-[22px]" />
            </div>
            <span className="type-caption text-soft">{t(`insights.${company.lastInteraction.type}`)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col gap-3 rounded-lg border border-line-strong p-[11px]">
                <dt className="type-caption flex items-center gap-1 text-soft">
                  <Icon aria-hidden className="size-3 shrink-0" />
                  {label}
                </dt>
                <dd className="type-lead tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </SheetSection>

        <SheetSection title={t("detail.scoreCard")}>
          <ul className="flex flex-col gap-2">
            {cards.map((card, i) => {
              const reviewer = SCORE_CARD_REVIEWERS[i % SCORE_CARD_REVIEWERS.length]!;
              const title = t(`scoreCards.${card.id}.title`);
              return (
                <li key={card.id} className="rounded-lg border border-line-strong bg-white/[0.025] p-4">
                  <h4 className="type-title font-normal">{title}</h4>
                  <p className="type-body mt-2 text-soft">{t(`scoreCards.${card.id}.description`)}</p>
                  <div className="type-caption mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <Avatar src={personByName(reviewer.name).avatar} size={14} />
                        {reviewer.name}
                      </span>
                      <span className="flex items-center gap-1 text-soft">
                        <Clock aria-hidden className="size-3" />
                        {t("detail.updated", { time: ago(reviewer.updatedMinutesAgo) })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{t(`verdicts.${card.verdict}`)}</span>
                      <span className="rounded-full bg-white/6 px-1.5 py-0.5">
                        <StarRating
                          value={card.stars}
                          label={t("detail.rating", { title })}
                          optionLabel={(value) => t("detail.starOf", { value })}
                          onChange={(stars) => setDraft((d) => d.map((s, j) => (j === i ? stars : s)))}
                        />
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SheetSection>
      </SheetBody>
      <SheetFooter>
        <a href="mailto:support@salescrm.example" className="type-lead underline decoration-from-font underline-offset-2 hover:text-soft">
          {t("detail.needHelp")}
        </a>
        <div className="flex items-center gap-2">
          <SheetClose asChild>
            <Button variant="subtle">{t("common.cancel")}</Button>
          </SheetClose>
          <Button variant="primary" disabled={!dirty} onClick={save}>
            {t("detail.save")}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

export function CompanyDetailSheet() {
  const id = useOpenCompanyId();
  const company = useCrm((s) => (id ? s.companies.find((c) => c.id === id) : undefined));
  // Keep showing the last company while the sheet animates out.
  const [shown, setShown] = useState(company);
  if (company && company !== shown) setShown(company);

  return (
    <Sheet open={company !== undefined} onOpenChange={(next) => !next && closeCompany()}>
      <SheetContent side="right" className="sm:w-[560px] sm:max-w-[560px]">
        {shown && <DetailContent key={shown.id} company={shown} />}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { CalendarPlus, Handshake } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetSection } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { nextStep } from "@/lib/activities";
import { personByName } from "@/lib/data/people";
import {
  applyDealForm,
  changeFormStage,
  dealForm,
  isOpen,
  validateDealForm,
  type DealErrors,
  type DealField,
  type DealForm,
} from "@/lib/deals";
import { quarterOf } from "@/lib/format";
import { useCrm } from "@/lib/store";
import { DEAL_STAGES, FORECAST_CATEGORIES, type Deal, type DealStage, type ForecastCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityIcon, DueDate, SUBJECT_LINK } from "../activities/activity-bits";
import { StageTag } from "../deals/deal-actions";
import { withUndo } from "../undo";
import { closeDeal, openCompany, useOpenDealId } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { SegmentedMeter } from "../visuals/segmented-meter";

const FIELD_ORDER: DealField[] = ["amount", "closeDate"];
const FIELD_IDS: Record<DealField, string> = { amount: "deal-amount", closeDate: "deal-close-date" };

function errorProps(field: DealField, errors: DealErrors) {
  return errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {};
}

function Stat({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-strong p-3">
      <dt className="type-caption text-soft">{label}</dt>
      <dd className="type-lead tabular-nums">{children}</dd>
    </div>
  );
}

function DealContent({ deal }: { deal: Deal }) {
  const t = useTranslations();
  const { money, moneyParts } = useFormat();
  const currency = moneyParts(0).symbol;
  const today = useCrm((s) => s.today);
  const company = useCrm((s) => s.companies.find((c) => c.id === deal.companyId));
  const openProfile = useCrm((s) => s.openProfile);
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  const next = useCrm((s) => nextStep(s.activities, deal.id));
  const [initial] = useState(() => dealForm(deal));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<DealErrors>({});

  const owner = personByName(deal.owner);
  const open = isOpen(form);
  const dirty = (Object.keys(initial) as (keyof DealForm)[]).some((key) => form[key] !== initial[key]);

  const update = <K extends keyof DealForm>(key: K, value: DealForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  };
  const errorText = (field: DealField) => {
    const code = errors[field];
    return code ? t(`dealSheet.errors.${code}`) : undefined;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateDealForm(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    const name = company ? `${deal.name} · ${company.name}` : deal.name;
    withUndo(t("dealSheet.saved", { deal: name }), t("common.undo"), () =>
      useCrm.getState().updateDeal(deal.id, (d) => applyDealForm(d, result.value)),
    );
    closeDeal();
  };

  // Where the deal lands in the forecast with what's in the form right now.
  const quarter = /^\d{4}-\d{2}-\d{2}$/.test(form.closeDate)
    ? t("forecast.quarter", { quarter: quarterOf(form.closeDate), year: Number(form.closeDate.slice(0, 4)) })
    : null;
  const placement =
    quarter === null
      ? t("common.noValue")
      : form.stage === "lost"
        ? t("dealSheet.lost")
        : form.stage === "won"
          ? t("dealSheet.wonIn", { quarter })
          : t("dealSheet.countsIn", { quarter, category: t(`forecastCategories.${form.category}`) });
  const amount = Number(form.amount);
  const weighted = open && Number.isFinite(amount) && amount > 0 ? money((amount * form.probability) / 100) : t("common.noValue");

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader icon={Handshake} title={t("dealSheet.title")} description={t("dealSheet.description")} />
      <SheetBody>
        <section className="flex items-center gap-3.5 border-b px-5 py-5">
          {company && <CompanyLogo logo={company.logo} size={44} className="rounded-xl" />}
          <div className="min-w-0 flex-1">
            <h3 className="type-title truncate">{deal.name}</h3>
            {company && (
              <button
                type="button"
                onClick={() => openCompany(company.id)}
                className="type-caption mt-2 text-soft underline decoration-white/30 underline-offset-2 outline-none hover:text-foreground focus-visible:text-foreground"
              >
                {company.name}
              </button>
            )}
          </div>
          <StageTag stage={deal.stage} />
        </section>

        <SheetSection title={t("dealSheet.summary")}>
          <button
            type="button"
            onClick={() => {
              closeDeal();
              openProfile(owner.name);
            }}
            className="type-lead -ml-1 flex w-fit items-center gap-2 rounded-full py-0.5 pr-2 pl-1 outline-none transition-colors hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <Avatar src={owner.avatar} size={20} />
            {owner.name}
          </button>
          <dl className="grid grid-cols-2 gap-2">
            <Stat label={t("dealSheet.forecast")}>{placement}</Stat>
            <Stat label={t("dealSheet.weighted")}>{weighted}</Stat>
          </dl>
          <div className="flex items-center gap-3 rounded-lg border border-line-strong p-3">
            {next ? (
              <>
                <ActivityIcon type={next.type} />
                <div className="min-w-0 flex-1">
                  <p className="type-caption text-soft">{t("dealSheet.nextStep")}</p>
                  <button
                    type="button"
                    onClick={() => openActivityDialog({ activityId: next.id })}
                    className={`${SUBJECT_LINK} type-lead mt-2`}
                  >
                    {next.subject}
                  </button>
                </div>
                <DueDate activity={next} />
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="type-caption text-soft">{t("dealSheet.nextStep")}</p>
                  <p className="type-lead mt-2">{t("dealSheet.noNextStep")}</p>
                </div>
                {isOpen(deal) && (
                  <Button variant="secondary" onClick={() => openActivityDialog({ companyId: deal.companyId, dealId: deal.id })}>
                    <CalendarPlus aria-hidden className="size-3" />
                    {t("activities.planNextStep")}
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetSection>

        <SheetSection title={t("dealSheet.details")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("dealSheet.amount")} htmlFor={FIELD_IDS.amount} error={errorText("amount")}>
              <div className="relative">
                <span aria-hidden className="type-lead pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id={FIELD_IDS.amount}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  className={cn("tabular-nums", currency.length > 1 ? "pl-11" : "pl-6")}
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                  {...errorProps("amount", errors)}
                />
              </div>
            </Field>
            <Field label={t("dealSheet.closeDate")} htmlFor={FIELD_IDS.closeDate} error={errorText("closeDate")}>
              <Input
                id={FIELD_IDS.closeDate}
                type="date"
                max={open ? undefined : today}
                className="tabular-nums"
                value={form.closeDate}
                onChange={(e) => update("closeDate", e.target.value)}
                {...errorProps("closeDate", errors)}
              />
            </Field>
          </div>

          <Field label={t("dealSheet.stage")} htmlFor="deal-stage">
            <Select value={form.stage} onValueChange={(stage) => setForm((f) => changeFormStage(f, stage as DealStage, today))}>
              <SelectTrigger id="deal-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {t(`dealStages.${stage}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t("dealSheet.probability")}
            htmlFor="deal-probability"
            trailing={<span className="type-caption tabular-nums">{form.probability}%</span>}
          >
            <div className="flex flex-col gap-3">
              <Slider
                id="deal-probability"
                thumbLabel={t("dealSheet.probability")}
                disabled={!open}
                min={0}
                max={100}
                step={1}
                value={[form.probability]}
                onValueChange={([value]) => update("probability", value ?? 0)}
              />
              <SegmentedMeter value={form.probability} segments={40} className="h-3 w-full border border-white/4 px-px" segmentClassName="h-2" />
            </div>
          </Field>

          <Field label={t("dealSheet.category")} htmlFor="deal-category">
            <Select value={form.category} onValueChange={(category) => update("category", category as ForecastCategory)} disabled={!open}>
              <SelectTrigger id="deal-category" aria-describedby="deal-category-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORECAST_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`forecastCategories.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="deal-category-hint" className="type-caption text-soft">
              {open ? t("dealSheet.categoryHint") : t("dealSheet.closedHint")}
            </p>
          </Field>
        </SheetSection>
      </SheetBody>
      <SheetFooter className="justify-end">
        <SheetClose asChild>
          <Button variant="subtle">{t("common.cancel")}</Button>
        </SheetClose>
        <Button type="submit" variant="primary" disabled={!dirty}>
          {t("dealSheet.save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function DealSheet() {
  const id = useOpenDealId();
  const deal = useCrm((s) => (id ? s.deals.find((d) => d.id === id) : undefined));
  // Keep showing the last deal while the sheet animates out.
  const [shown, setShown] = useState(deal);
  if (deal && deal !== shown) setShown(deal);

  return (
    <Sheet open={deal !== undefined} onOpenChange={(next) => !next && closeDeal()}>
      <SheetContent side="right" className="sm:w-[480px] sm:max-w-[480px]">
        {shown && <DealContent key={shown.id} deal={shown} />}
      </SheetContent>
    </Sheet>
  );
}

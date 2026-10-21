"use client";

import { ImagePlus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  createCompany,
  MAX_NEW_DEALS,
  validateLogoFile,
  validateNewCompany,
  type NewCompanyErrors,
  type NewCompanyField,
  type NewCompanyForm,
} from "@/lib/companies";
import { LOGO_STORED_SIZE, LOGO_TYPES } from "@/lib/constants";
import { OWNERS } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import { INTERACTION_TYPES, REGIONS, SEGMENTS, STAGES, type InteractionType, type Region, type Segment, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downscaleImage } from "../downscale-image";
import { openCompany } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { SegmentedMeter } from "../visuals/segmented-meter";

const FIELD_ORDER: NewCompanyField[] = ["name", "pipelineValue", "openDeals", "interactionDate"];
const FIELD_IDS: Record<NewCompanyField, string> = {
  name: "company-name",
  pipelineValue: "company-pipeline",
  openDeals: "company-deals",
  interactionDate: "company-interaction-date",
};

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-b px-6 py-5 last:border-b-0">
      <legend className="type-eyebrow float-left mb-1 text-soft">{title}</legend>
      {children}
    </fieldset>
  );
}

function errorProps(field: NewCompanyField, errors: NewCompanyErrors) {
  return errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {};
}

function SimpleSelect<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NewCompanyFormBody() {
  const t = useTranslations();
  const currency = useFormat().moneyParts(0).symbol;
  const companies = useCrm((s) => s.companies);
  const today = useCrm((s) => s.today);
  const addCompany = useCrm((s) => s.addCompany);
  const [form, setForm] = useState<NewCompanyForm>(() => ({
    name: "",
    segment: "Enterprise",
    stage: "New Logo",
    region: "north-america",
    owner: OWNERS[0]!.name,
    pipelineValue: "",
    openDeals: "1",
    winProbability: 50,
    interactionDate: today,
    interactionType: "discovery",
    logoSrc: null,
  }));
  const [errors, setErrors] = useState<NewCompanyErrors>({});
  const [logoError, setLogoError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = <K extends keyof NewCompanyForm>(key: K, value: NewCompanyForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  };
  const errorText = (field: NewCompanyField) => {
    const code = errors[field];
    return code ? t(`newCompany.errors.${code}`) : undefined;
  };

  const readLogo = async (file: File) => {
    const error = validateLogoFile(file);
    if (error) {
      setLogoError(t(`newCompany.logoErrors.${error}`));
      return;
    }
    try {
      update("logoSrc", await downscaleImage(file, LOGO_STORED_SIZE));
      setLogoError(null);
    } catch {
      setLogoError(t("newCompany.logoErrors.read"));
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readLogo(file);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateNewCompany(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    const { company, deals } = createCompany(result.value, companies, today);
    addCompany(company, deals);
    toast.success(t("newCompany.created", { name: company.name }), {
      action: { label: t("newCompany.view"), onClick: () => openCompany(company.id) },
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-6 pt-6 pr-14 pb-5">
        <DialogTitle>{t("newCompany.title")}</DialogTitle>
        <DialogDescription className="mt-2">{t("newCompany.description")}</DialogDescription>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <FormSection title={t("newCompany.company")}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn("-m-2 flex items-center gap-4 rounded-xl p-2 transition-colors", dragging && "bg-primary/10 ring-1 ring-primary/60")}
          >
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label={form.logoSrc ? t("newCompany.replaceLogo") : t("newCompany.uploadLogo")}
              className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#333] bg-[#222] text-soft outline-none transition-colors hover:border-[#4a4a4a] hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25"
            >
              {form.logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoSrc} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus aria-hidden className="size-4" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <Button variant="subtle" size="sm" onClick={() => fileInput.current?.click()}>
                  {form.logoSrc ? t("newCompany.replaceLogo") : t("newCompany.uploadLogo")}
                </Button>
                {form.logoSrc && (
                  <Button variant="ghost" size="sm" onClick={() => update("logoSrc", null)}>
                    {t("newCompany.removeLogo")}
                  </Button>
                )}
              </div>
              <p className="type-caption mt-2 text-soft">{t("newCompany.logoHint")}</p>
              {logoError && (
                <p role="alert" className="type-caption mt-1.5 text-danger">
                  {logoError}
                </p>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={LOGO_TYPES.join(",")}
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readLogo(file);
                e.target.value = "";
              }}
            />
          </div>

          <Field label={t("newCompany.name")} htmlFor={FIELD_IDS.name} required error={errorText("name")}>
            <Input
              id={FIELD_IDS.name}
              autoFocus
              autoComplete="off"
              maxLength={80}
              placeholder={t("newCompany.namePlaceholder")}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              {...errorProps("name", errors)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("newCompany.segment")} htmlFor="company-segment">
              <SimpleSelect<Segment>
                id="company-segment"
                value={form.segment}
                options={SEGMENTS.map((s) => ({ value: s, label: s }))}
                onChange={(v) => update("segment", v)}
              />
            </Field>
            <Field label={t("newCompany.stage")} htmlFor="company-stage">
              <SimpleSelect<Stage> id="company-stage" value={form.stage} options={STAGES.map((s) => ({ value: s, label: s }))} onChange={(v) => update("stage", v)} />
            </Field>
            <Field label={t("newCompany.region")} htmlFor="company-region">
              <SimpleSelect<Region>
                id="company-region"
                value={form.region}
                options={REGIONS.map((r) => ({ value: r, label: t(`regions.${r}`) }))}
                onChange={(v) => update("region", v)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title={t("newCompany.ownership")}>
          <Field label={t("newCompany.owner")} htmlFor="company-owner">
            <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
              <SelectTrigger id="company-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNERS.map((owner) => (
                  <SelectItem key={owner.name} value={owner.name}>
                    <Avatar src={owner.avatar} size={18} />
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("newCompany.pipelineValue")} htmlFor={FIELD_IDS.pipelineValue} error={errorText("pipelineValue")}>
              <div className="relative">
                <span aria-hidden className="type-lead pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id={FIELD_IDS.pipelineValue}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  placeholder="250000"
                  className={cn("tabular-nums", currency.length > 1 ? "pl-11" : "pl-6")}
                  value={form.pipelineValue}
                  onChange={(e) => update("pipelineValue", e.target.value)}
                  {...errorProps("pipelineValue", errors)}
                />
              </div>
            </Field>
            <Field label={t("newCompany.openDeals")} htmlFor={FIELD_IDS.openDeals} error={errorText("openDeals")}>
              <Input
                id={FIELD_IDS.openDeals}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_NEW_DEALS}
                step={1}
                className="tabular-nums"
                value={form.openDeals}
                onChange={(e) => update("openDeals", e.target.value)}
                {...errorProps("openDeals", errors)}
              />
            </Field>
          </div>

          <Field
            label={t("newCompany.winProbability")}
            htmlFor="company-win"
            trailing={<span className="type-caption tabular-nums">{form.winProbability}%</span>}
          >
            <div className="flex flex-col gap-3">
              <Slider
                id="company-win"
                thumbLabel={t("newCompany.winProbability")}
                min={0}
                max={100}
                step={1}
                value={[form.winProbability]}
                onValueChange={([value]) => update("winProbability", value ?? 0)}
              />
              <SegmentedMeter value={form.winProbability} segments={40} className="h-3 w-full border border-white/4 px-px" segmentClassName="h-2" />
            </div>
          </Field>
        </FormSection>

        <FormSection title={t("newCompany.lastInteraction")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("newCompany.date")} htmlFor={FIELD_IDS.interactionDate} error={errorText("interactionDate")}>
              <Input
                id={FIELD_IDS.interactionDate}
                type="date"
                max={today}
                className="tabular-nums"
                value={form.interactionDate}
                onChange={(e) => update("interactionDate", e.target.value)}
                {...errorProps("interactionDate", errors)}
              />
            </Field>
            <Field label={t("newCompany.type")} htmlFor="company-interaction-type">
              <SimpleSelect<InteractionType>
                id="company-interaction-type"
                value={form.interactionType}
                options={INTERACTION_TYPES.map((type) => ({ value: type, label: t(`interactions.${type}`) }))}
                onChange={(v) => update("interactionType", v)}
              />
            </Field>
          </div>
        </FormSection>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
        <DialogClose asChild>
          <Button variant="subtle">{t("common.cancel")}</Button>
        </DialogClose>
        <Button type="submit" variant="primary">
          <Plus aria-hidden className="size-3" />
          {t("newCompany.create")}
        </Button>
      </div>
    </form>
  );
}

export function NewCompanyDialog() {
  const open = useCrm((s) => s.newCompanyOpen);
  const setOpen = useCrm((s) => s.setNewCompanyOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <NewCompanyFormBody />
      </DialogContent>
    </Dialog>
  );
}

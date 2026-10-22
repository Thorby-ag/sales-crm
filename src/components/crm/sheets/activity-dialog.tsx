"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD } from "@/components/ui/surface";
import {
  activityForm,
  activityFromForm,
  validateActivity,
  type ActivityErrors,
  type ActivityField,
  type ActivityForm,
} from "@/lib/activities";
import { contactsAt } from "@/lib/contacts";
import { OWNERS } from "@/lib/data/people";
import { isOpen } from "@/lib/deals";
import { useCrm, type ActivityDialogTarget } from "@/lib/store";
import { ACTIVITY_TYPES, INTERACTION_TYPES, type ActivityType, type DealStage, type InteractionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDeleteActivity } from "../activities/activity-bits";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { ContactAvatar } from "../visuals/contact-avatar";

/** Radix selects need a value for "nothing chosen". */
const NONE = "__none__";

const FIELD_ORDER: ActivityField[] = ["subject", "companyId", "date"];
const FIELD_IDS: Record<ActivityField, string> = { subject: "activity-subject", companyId: "activity-company", date: "activity-date" };

/** A sensible next conversation for a deal at each stage. */
const STAGE_TOPIC: Partial<Record<DealStage, InteractionType>> = { discovery: "demo", evaluation: "pricing", procurement: "legal" };

function errorProps(field: ActivityField, errors: ActivityErrors) {
  return errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {};
}

function ActivityFormBody({ target }: { target: ActivityDialogTarget }) {
  const t = useTranslations();
  const { date: formatDate } = useFormat();
  const today = useCrm((s) => s.today);
  const activities = useCrm((s) => s.activities);
  const companies = useCrm((s) => s.companies);
  const deals = useCrm((s) => s.deals);
  const contacts = useCrm((s) => s.contacts);
  const saveActivity = useCrm((s) => s.saveActivity);
  const close = useCrm((s) => s.closeActivityDialog);
  const remove = useDeleteActivity();

  const [editing] = useState(() => (target.activityId ? activities.find((a) => a.id === target.activityId) : undefined));
  const [form, setForm] = useState<ActivityForm>(() => {
    if (editing) return activityForm(editing);
    const deal = target.dealId ? deals.find((d) => d.id === target.dealId) : undefined;
    const contact = target.contactId ? contacts.find((c) => c.id === target.contactId) : undefined;
    const companyId = target.companyId ?? deal?.companyId ?? contact?.companyId ?? "";
    const company = companies.find((c) => c.id === companyId);
    return {
      type: "call",
      subject: "",
      topic: (deal && STAGE_TOPIC[deal.stage]) ?? "discovery",
      companyId,
      dealId: deal?.id ?? "",
      contactId: contact?.id ?? "",
      owner: company?.owner ?? OWNERS[0]!.name,
      date: today,
      done: false,
      notes: "",
    };
  });
  const [errors, setErrors] = useState<ActivityErrors>({});

  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));
  const companyDeals = deals.filter((d) => d.companyId === form.companyId && (isOpen(d) || d.id === form.dealId));
  const companyContacts = contactsAt(contacts, form.companyId);

  const update = <K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  };
  // Another company: its deals and people differ, and its owner usually does the work.
  const changeCompany = (companyId: string) => {
    setForm((f) => ({ ...f, companyId, dealId: "", contactId: "", owner: companies.find((c) => c.id === companyId)?.owner ?? f.owner }));
    setErrors((e) => ({ ...e, companyId: undefined }));
  };
  const errorText = (field: ActivityField) => {
    const code = errors[field];
    return code ? t(`activityDialog.errors.${code}`) : undefined;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateActivity(form, new Set(companies.map((c) => c.id)), today);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    saveActivity(activityFromForm(result.value, activities, editing));
    const message = editing ? "saved" : result.value.done ? "logged" : "planned";
    toast.success(t(`activityDialog.${message}`, { subject: result.value.subject, date: formatDate(result.value.date) }));
    close();
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-6 pt-6 pr-14 pb-5">
        <DialogTitle>{editing ? t("activityDialog.editTitle") : t("activityDialog.newTitle")}</DialogTitle>
        <DialogDescription className="mt-2">{t("activityDialog.description")}</DialogDescription>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-5">
        <div className="flex flex-col gap-2">
          <span aria-hidden className="type-caption text-soft">
            {t("activityDialog.type")}
          </span>
          <Segmented<ActivityType>
            label={t("activityDialog.type")}
            value={form.type}
            options={ACTIVITY_TYPES.map((type) => ({ value: type, label: t(`activityTypes.${type}`) }))}
            onChange={(type) => update("type", type)}
            className="self-start"
          />
        </div>

        <Field label={t("activityDialog.subject")} htmlFor={FIELD_IDS.subject} required error={errorText("subject")}>
          <Input
            id={FIELD_IDS.subject}
            autoFocus
            autoComplete="off"
            maxLength={100}
            placeholder={t("activityDialog.subjectPlaceholder")}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            {...errorProps("subject", errors)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("activityDialog.company")} htmlFor={FIELD_IDS.companyId} required error={errorText("companyId")}>
            <Select value={form.companyId} onValueChange={changeCompany}>
              <SelectTrigger id={FIELD_IDS.companyId} {...errorProps("companyId", errors)}>
                <SelectValue placeholder={t("contactDialog.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sortedCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <CompanyLogo logo={company.logo} size={18} />
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("activityDialog.topic")} htmlFor="activity-topic">
            <Select value={form.topic} onValueChange={(v) => update("topic", v as InteractionType)}>
              <SelectTrigger id="activity-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {t(`interactions.${topic}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("activityDialog.deal")} htmlFor="activity-deal">
            <Select value={form.dealId || NONE} onValueChange={(v) => update("dealId", v === NONE ? "" : v)} disabled={!form.companyId}>
              <SelectTrigger id="activity-deal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("activityDialog.none")}</SelectItem>
                {companyDeals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("activityDialog.contact")} htmlFor="activity-contact">
            <Select value={form.contactId || NONE} onValueChange={(v) => update("contactId", v === NONE ? "" : v)} disabled={!form.companyId}>
              <SelectTrigger id="activity-contact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("activityDialog.none")}</SelectItem>
                {companyContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <ContactAvatar name={contact.name} size={18} />
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("activityDialog.date")} htmlFor={FIELD_IDS.date} required error={errorText("date")}>
            <Input
              id={FIELD_IDS.date}
              type="date"
              max={form.done ? today : undefined}
              className="tabular-nums"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              {...errorProps("date", errors)}
            />
          </Field>
          <Field label={t("activityDialog.owner")} htmlFor="activity-owner">
            <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
              <SelectTrigger id="activity-owner">
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
        </div>

        <label htmlFor="activity-done" className="type-lead flex w-fit cursor-pointer items-center gap-2.5">
          <Checkbox
            id="activity-done"
            checked={form.done}
            onCheckedChange={(checked) => {
              update("done", checked === true);
              if (checked === true && form.date > today) update("date", today);
            }}
          />
          {t("activityDialog.done")}
        </label>

        <Field label={t("activityDialog.notes")} htmlFor="activity-notes">
          <textarea
            id="activity-notes"
            rows={3}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={cn(FIELD, "h-auto resize-y py-2 leading-snug")}
          />
        </Field>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
        {editing ? (
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={() => {
              close();
              remove(editing);
            }}
          >
            {t("activities.delete")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <DialogClose asChild>
            <Button variant="subtle">{t("common.cancel")}</Button>
          </DialogClose>
          <Button type="submit" variant="primary">
            {editing ? t("activityDialog.save") : form.done ? t("activityDialog.log") : t("activityDialog.plan")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ActivityDialog() {
  const target = useCrm((s) => s.activityDialog);
  const close = useCrm((s) => s.closeActivityDialog);
  // Keep the last form on screen while the dialog animates out.
  const [shown, setShown] = useState(target);
  if (target && target !== shown) setShown(target);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        {shown && <ActivityFormBody key={JSON.stringify(shown)} target={shown} />}
      </DialogContent>
    </Dialog>
  );
}

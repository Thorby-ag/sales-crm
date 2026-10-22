"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD } from "@/components/ui/surface";
import { filterContacts } from "@/lib/contacts";
import { OWNERS } from "@/lib/data/people";
import {
  createSequence,
  MAX_STEP_DAY,
  newStepId,
  saveStep,
  TEMPLATE_VARIABLES,
  validateSequenceName,
  validateStep,
  type StepErrors,
  type StepForm,
} from "@/lib/sequences";
import { useCrm } from "@/lib/store";
import { INTERACTION_TYPES, STEP_TYPES, type InteractionType, type Sequence, type StepType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RoleTag } from "../contacts/role-tag";
import { openSequence } from "../url-state";
import { Avatar } from "../visuals/avatar";
import { ContactAvatar } from "../visuals/contact-avatar";

function DialogHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="shrink-0 border-b px-6 pt-6 pr-14 pb-5">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription className="mt-2">{description}</DialogDescription>
    </div>
  );
}

function DialogActions({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
      <DialogClose asChild>
        <Button variant="subtle">{t("cancel")}</Button>
      </DialogClose>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New sequence / edit its name, sender and topic
// ---------------------------------------------------------------------------

function SequenceForm({ sequence, onDone }: { sequence?: Sequence; onDone: () => void }) {
  const t = useTranslations();
  const sequences = useCrm((s) => s.sequences);
  const saveSequence = useCrm((s) => s.saveSequence);
  const [name, setName] = useState(sequence?.name ?? "");
  const [owner, setOwner] = useState(sequence?.owner ?? OWNERS[0]!.name);
  const [topic, setTopic] = useState<InteractionType>(sequence?.topic ?? "discovery");
  const [error, setError] = useState<"nameRequired" | "nameTooLong" | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateSequenceName(name);
    if (!result.ok) {
      setError(result.error);
      document.getElementById("sequence-name")?.focus();
      return;
    }
    if (sequence) {
      saveSequence({ ...sequence, name: result.value, owner, topic });
      toast.success(t("sequenceDialog.saved", { name: result.value }));
    } else {
      // The starter steps are written in the visitor's language, with the template variables in place.
      const tokens = { first_name: "{{first_name}}", company: "{{company}}", sender: "{{sender}}" };
      const created = createSequence({ name: result.value, owner, topic }, sequences, {
        emailSubject: t("sequenceDialog.starter.emailSubject", tokens),
        emailBody: t("sequenceDialog.starter.emailBody", tokens),
        callSubject: t("sequenceDialog.starter.callSubject", tokens),
        followUpSubject: t("sequenceDialog.starter.followUpSubject"),
        followUpBody: t("sequenceDialog.starter.followUpBody", tokens),
      });
      saveSequence(created);
      openSequence(created.id);
      toast.success(t("sequenceDialog.created", { name: created.name }));
    }
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeading title={sequence ? t("sequenceDialog.editTitle") : t("sequenceDialog.newTitle")} description={t("sequenceDialog.description")} />
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label={t("sequenceDialog.name")} htmlFor="sequence-name" required error={error ? t(`sequenceDialog.errors.${error}`) : undefined}>
          <Input
            id="sequence-name"
            autoFocus
            autoComplete="off"
            maxLength={80}
            placeholder={t("sequenceDialog.namePlaceholder")}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            {...(error ? { "aria-invalid": true, "aria-describedby": "sequence-name-error" } : {})}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("sequenceDialog.owner")} htmlFor="sequence-owner">
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger id="sequence-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNERS.map((person) => (
                  <SelectItem key={person.name} value={person.name}>
                    <Avatar src={person.avatar} size={18} />
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("sequenceDialog.topic")} htmlFor="sequence-topic">
            <Select value={topic} onValueChange={(v) => setTopic(v as InteractionType)}>
              <SelectTrigger id="sequence-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`interactions.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      <DialogActions>
        <Button type="submit" variant="primary">
          {sequence ? t("sequenceDialog.save") : t("sequenceDialog.create")}
        </Button>
      </DialogActions>
    </form>
  );
}

export function SequenceDialog({ open, sequence, onOpenChange }: { open: boolean; sequence?: Sequence; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <SequenceForm sequence={sequence} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add or edit a step
// ---------------------------------------------------------------------------

const STEP_FIELDS = { day: "step-day", subject: "step-subject" } as const;

function StepFormBody({ sequence, stepId, onDone }: { sequence: Sequence; stepId: string | null; onDone: () => void }) {
  const t = useTranslations();
  const saveSequence = useCrm((s) => s.saveSequence);
  const step = stepId ? sequence.steps.find((s) => s.id === stepId) : undefined;
  const lastDay = Math.max(-2, ...sequence.steps.map((s) => s.day));
  const [form, setForm] = useState<StepForm>(() =>
    step ? { day: String(step.day), type: step.type, subject: step.subject, body: step.body } : { day: String(lastDay + 2), type: "email", subject: "", body: "" },
  );
  const [errors, setErrors] = useState<StepErrors>({});
  const body = useRef<HTMLTextAreaElement>(null);

  const update = <K extends keyof StepForm>(key: K, value: StepForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  };

  /** Puts a variable where the cursor is in the message. */
  const insert = (variable: string) => {
    const field = body.current;
    const token = `{{${variable}}}`;
    const start = field?.selectionStart ?? form.body.length;
    const end = field?.selectionEnd ?? form.body.length;
    update("body", form.body.slice(0, start) + token + form.body.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateStep(form);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["day", "subject"] as const).find((field) => result.errors[field]);
      if (first) document.getElementById(STEP_FIELDS[first])?.focus();
      return;
    }
    saveSequence(saveStep(sequence, { id: step?.id ?? newStepId(sequence), ...result.value }));
    onDone();
  };

  const errorProps = (field: keyof typeof STEP_FIELDS) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `${STEP_FIELDS[field]}-error` } : {};

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeading title={step ? t("stepDialog.editTitle") : t("stepDialog.newTitle")} description={t("stepDialog.description")} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Field label={t("stepDialog.day")} htmlFor={STEP_FIELDS.day} required error={errors.day ? t(`stepDialog.errors.${errors.day}`) : undefined}>
            <Input
              id={STEP_FIELDS.day}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_STEP_DAY}
              className="tabular-nums"
              value={form.day}
              onChange={(e) => update("day", e.target.value)}
              {...errorProps("day")}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span aria-hidden className="type-caption text-soft">
              {t("stepDialog.type")}
            </span>
            <Segmented<StepType>
              label={t("stepDialog.type")}
              value={form.type}
              options={STEP_TYPES.map((type) => ({ value: type, label: t(`stepTypes.${type}`) }))}
              onChange={(type) => update("type", type)}
              className="self-start"
            />
          </div>
        </div>
        <p className="type-caption -mt-2 text-soft">{t("stepDialog.dayHint")}</p>

        <Field label={t("stepDialog.subject")} htmlFor={STEP_FIELDS.subject} required error={errors.subject ? t(`stepDialog.errors.${errors.subject}`) : undefined}>
          <Input
            id={STEP_FIELDS.subject}
            autoFocus
            autoComplete="off"
            maxLength={140}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            {...errorProps("subject")}
          />
        </Field>

        <Field label={form.type === "email" ? t("stepDialog.body") : t("stepDialog.notes")} htmlFor="step-body">
          <textarea
            id="step-body"
            ref={body}
            rows={6}
            maxLength={2000}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className={cn(FIELD, "h-auto resize-y py-2 leading-snug")}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="type-caption mr-1 text-soft">{t("stepDialog.insert")}</span>
          {TEMPLATE_VARIABLES.map((variable) => (
            <Button
              key={variable}
              variant="subtle"
              size="sm"
              className="h-6 px-2 font-mono text-[11px]"
              aria-label={t("stepDialog.insertVariable", { variable })}
              onClick={() => insert(variable)}
            >
              {`{{${variable}}}`}
            </Button>
          ))}
        </div>
      </div>
      <DialogActions>
        <Button type="submit" variant="primary">
          {step ? t("stepDialog.save") : t("stepDialog.add")}
        </Button>
      </DialogActions>
    </form>
  );
}

export function StepDialog({
  sequence,
  stepId,
  open,
  onOpenChange,
}: {
  sequence: Sequence;
  stepId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <StepFormBody sequence={sequence} stepId={stepId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Enroll contacts
// ---------------------------------------------------------------------------

function EnrollBody({ sequence, onDone }: { sequence: Sequence; onDone: () => void }) {
  const t = useTranslations();
  const contacts = useCrm((s) => s.contacts);
  const companies = useCrm((s) => s.companies);
  const enrollments = useCrm((s) => s.enrollments);
  const enrollContacts = useCrm((s) => s.enrollContacts);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const names = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const available = useMemo(() => {
    const enrolled = new Set(enrollments.filter((e) => e.sequenceId === sequence.id).map((e) => e.contactId));
    return filterContacts(
      contacts.filter((c) => !enrolled.has(c.id)),
      { query, role: null },
      (id) => names.get(id) ?? "",
    );
  }, [contacts, enrollments, sequence.id, query, names]);

  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const submit = () => {
    enrollContacts(sequence.id, picked);
    toast.success(t("enrollDialog.enrolled", { count: picked.length, sequence: sequence.name }));
    onDone();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeading title={t("enrollDialog.title")} description={t("enrollDialog.description")} />
      <div className="relative shrink-0 border-b px-6 py-3">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-9 size-3.5 -translate-y-1/2 text-soft" />
        <Input
          type="search"
          autoFocus
          aria-label={t("enrollDialog.search")}
          placeholder={t("contacts.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2" aria-label={t("enrollDialog.title")}>
        {available.map((contact) => (
          <li key={contact.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.04]">
              <Checkbox checked={picked.includes(contact.id)} onCheckedChange={() => toggle(contact.id)} aria-label={contact.name} />
              <ContactAvatar name={contact.name} size={28} />
              <span className="min-w-0 flex-1">
                <span className="type-lead block truncate">{contact.name}</span>
                <span className="type-caption mt-1.5 block truncate text-muted-foreground">
                  {contact.title} · {names.get(contact.companyId)}
                </span>
              </span>
              <RoleTag role={contact.role} />
            </label>
          </li>
        ))}
        {available.length === 0 && <li className="type-caption px-3 py-8 text-center text-muted-foreground">{t("enrollDialog.none")}</li>}
      </ul>
      <DialogActions>
        <Button variant="primary" disabled={picked.length === 0} onClick={submit}>
          {t("enrollDialog.enroll", { count: picked.length })}
        </Button>
      </DialogActions>
    </div>
  );
}

export function EnrollDialog({ sequence, open, onOpenChange }: { sequence: Sequence; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(640px,calc(100dvh-32px))]">{open && <EnrollBody sequence={sequence} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

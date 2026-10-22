"use client";

import { ArrowLeft, Ellipsis, Pause, Play, Plus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personByName } from "@/lib/data/people";
import {
  enrollmentProgress,
  removeStep,
  sequenceStats,
  sortedSteps,
  templateParts,
  templateValues,
  type EnrollmentProgress,
  type SequenceStats,
} from "@/lib/sequences";
import { useCrm } from "@/lib/store";
import type { Contact, Enrollment, Sequence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityIcon } from "../activities/activity-bits";
import { CARD } from "../forecast/styles";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { withUndo } from "../undo";
import { closeSequence, openContact, openSequence, useOpenSequenceId } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { ContactAvatar } from "../visuals/contact-avatar";
import { EnrollmentStatusTag, SequenceStatusTag, StepStrip } from "./sequence-bits";
import { EnrollDialog, SequenceDialog, StepDialog } from "./sequence-dialogs";

const HEAD = "h-10 border-b border-border px-3 text-left type-caption font-normal whitespace-nowrap text-muted-foreground";
const CELL = "h-[52px] border-b border-border px-3 type-lead whitespace-nowrap";

const stop = (event: MouseEvent) => event.stopPropagation();

/** Pause or resume, delete: the same actions from the list and the detail view. */
function useSequenceActions() {
  const t = useTranslations();
  return {
    toggle: (sequence: Sequence) =>
      withUndo(t(sequence.active ? "sequences.pausedToast" : "sequences.resumedToast", { name: sequence.name }), t("common.undo"), () =>
        useCrm.getState().setSequenceActive(sequence.id, !sequence.active),
      ),
    remove: (sequence: Sequence) => {
      closeSequence();
      withUndo(t("sequences.deleted", { name: sequence.name }), t("common.undo"), () => useCrm.getState().deleteSequence(sequence.id));
    },
  };
}

function SequenceMenu({ sequence, onEdit }: { sequence: Sequence; onEdit?: () => void }) {
  const t = useTranslations("sequences");
  const { toggle, remove } = useSequenceActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("actions", { name: sequence.name })}>
          <Ellipsis aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {onEdit ? <DropdownMenuItem onSelect={onEdit}>{t("edit")}</DropdownMenuItem> : <DropdownMenuItem onSelect={() => openSequence(sequence.id)}>{t("open")}</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => toggle(sequence)}>{sequence.active ? t("pause") : t("resume")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => remove(sequence)} className="text-danger data-[highlighted]:text-danger">
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

function SequencesList() {
  const t = useTranslations();
  const sequences = useCrm((s) => s.sequences);
  const enrollments = useCrm((s) => s.enrollments);
  const today = useCrm((s) => s.today);
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => sequences.map((sequence) => ({ sequence, stats: sequenceStats(sequence, enrollments, today) })), [sequences, enrollments, today]);
  const noValue = t("common.noValue");

  return (
    <>
      <PageHeader view="sequences" />
      <div className="flex shrink-0 items-center justify-between gap-2 p-4">
        <p className="type-caption text-muted-foreground">{t("sequences.count", { count: sequences.length })}</p>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus aria-hidden className="size-3" />
          {t("sequences.new")}
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <caption className="sr-only">{t("sequences.caption")}</caption>
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th scope="col" className={cn(HEAD, "pl-4")}>
                {t("sequences.name")}
              </th>
              <th scope="col" className={HEAD}>
                {t("sequences.owner")}
              </th>
              <th scope="col" className={HEAD}>
                {t("sequences.status")}
              </th>
              {(["enrolled", "active", "replied", "replyRate", "emailsSent"] as const).map((key) => (
                <th key={key} scope="col" className={cn(HEAD, "text-right")}>
                  {t(`sequences.${key}`)}
                </th>
              ))}
              <th scope="col" className={cn(HEAD, "pr-3")}>
                <span className="sr-only">{t("table.action")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sequence, stats }) => {
              const owner = personByName(sequence.owner);
              return (
                <tr key={sequence.id} className="group cursor-pointer hover:bg-[#1a1a1a]" onClick={() => openSequence(sequence.id)}>
                  <td className={cn(CELL, "pl-4")}>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          stop(e);
                          openSequence(sequence.id);
                        }}
                        className="block max-w-full truncate text-left outline-none decoration-white/40 underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {sequence.name}
                      </button>
                      <StepStrip sequence={sequence} />
                    </div>
                  </td>
                  <td className={CELL}>
                    <span className="flex items-center gap-2">
                      <Avatar src={owner.avatar} size={20} />
                      {owner.name}
                    </span>
                  </td>
                  <td className={CELL}>
                    <SequenceStatusTag active={sequence.active} />
                  </td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{stats.enrolled}</td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{stats.active}</td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{stats.replied}</td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{stats.replyRate === null ? noValue : `${stats.replyRate}%`}</td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{stats.emailsSent}</td>
                  <td className={cn(CELL, "pr-3 text-right")} onClick={stop}>
                    <SequenceMenu sequence={sequence} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="type-caption h-[140px] border-b border-border text-center text-muted-foreground">
                  {t("sequences.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SequenceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

function Stats({ stats }: { stats: SequenceStats }) {
  const t = useTranslations("sequences");
  const items = [
    { label: t("enrolled"), value: String(stats.enrolled) },
    { label: t("active"), value: String(stats.active) },
    { label: t("replied"), value: String(stats.replied) },
    { label: t("replyRate"), value: stats.replyRate === null ? "—" : `${stats.replyRate}%` },
    { label: t("emailsSent"), value: String(stats.emailsSent) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 @2xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className={cn(CARD, "flex flex-col gap-3 p-3.5")}>
          <dt className="type-caption text-muted-foreground">{item.label}</dt>
          <dd className="text-[22px] leading-none font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A template with its variables filled in and highlighted; unknown ones stand out in red. */
function Rendered({ template, values }: { template: string; values: ReturnType<typeof templateValues> }) {
  const t = useTranslations("sequences");
  return (
    <>
      {templateParts(template, values).map((part, i) =>
        part.variable ? (
          <mark
            key={i}
            title={part.missing ? t("missingVariable", { name: part.variable }) : undefined}
            className={cn("rounded px-0.5", part.missing ? "bg-danger/15 text-danger" : "bg-primary/25 text-foreground")}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function SequenceDetail({ sequence }: { sequence: Sequence }) {
  const t = useTranslations();
  const { date } = useFormat();
  const today = useCrm((s) => s.today);
  const enrollments = useCrm((s) => s.enrollments);
  const contacts = useCrm((s) => s.contacts);
  const companies = useCrm((s) => s.companies);
  const { toggle } = useSequenceActions();

  const steps = sortedSteps(sequence);
  const own = useMemo(() => enrollments.filter((e) => e.sequenceId === sequence.id), [enrollments, sequence.id]);
  const stats = useMemo(() => sequenceStats(sequence, enrollments, today), [sequence, enrollments, today]);
  const people = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const names = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const enrolled = own.map((e) => people.get(e.contactId)).filter((c): c is Contact => c !== undefined);
  const previewChoices = enrolled.length > 0 ? enrolled : contacts.slice(0, 10);
  const owner = personByName(sequence.owner);

  const [selectedId, setSelectedId] = useState<string | null>(steps[0]?.id ?? null);
  const [previewId, setPreviewId] = useState<string>(previewChoices[0]?.id ?? "");
  const [stepDialog, setStepDialog] = useState<{ stepId: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const step = steps.find((s) => s.id === selectedId) ?? steps[0];
  const previewContact = people.get(previewId) ?? previewChoices[0];
  const values = templateValues(previewContact, previewContact ? (names.get(previewContact.companyId) ?? "") : "", sequence.owner);

  const deleteStep = (stepId: string) =>
    withUndo(t("sequences.stepDeleted"), t("common.undo"), () => useCrm.getState().saveSequence(removeStep(sequence, stepId)));
  const reply = (enrollment: Enrollment, name: string) =>
    withUndo(t("sequences.repliedToast", { name }), t("common.undo"), () => useCrm.getState().markReplied(enrollment.id));
  const remove = (enrollment: Enrollment, name: string) =>
    withUndo(t("sequences.removed", { name, sequence: sequence.name }), t("common.undo"), () => useCrm.getState().unenroll(enrollment.id));
  const progressText = (progress: EnrollmentProgress, enrollment: Enrollment) => {
    if (progress.status === "replied") return t("sequences.repliedOn", { date: date(enrollment.repliedAt!) });
    if (progress.status === "finished") return t("sequences.allDone", { total: progress.total });
    const next = progress.next!;
    return t("sequences.progress", { completed: progress.completed, total: progress.total, type: t(`stepTypes.${next.step.type}`), date: date(next.date) });
  };

  return (
    <>
      <PageHeader view="sequences" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button variant="ghost" onClick={closeSequence}>
            <ArrowLeft aria-hidden className="size-3.5" />
            {t("sequences.back")}
          </Button>
          <h2 className="type-title truncate">{sequence.name}</h2>
          <SequenceStatusTag active={sequence.active} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => toggle(sequence)}>
            {sequence.active ? <Pause aria-hidden className="size-3" /> : <Play aria-hidden className="size-3" />}
            {sequence.active ? t("sequences.pause") : t("sequences.resume")}
          </Button>
          <Button variant="primary" disabled={!sequence.active} onClick={() => setEnrolling(true)}>
            <UserPlus aria-hidden className="size-3" />
            {t("sequences.enroll")}
          </Button>
          <SequenceMenu sequence={sequence} onEdit={() => setEditing(true)} />
        </div>
      </div>

      <div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="type-caption -mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-soft">
            <Avatar src={owner.avatar} size={16} />
            {t("sequences.sentBy", { name: owner.name })}
            <span aria-hidden className="text-faint">
              ·
            </span>
            {t("sequences.about", { topic: t(`interactions.${sequence.topic}`) })}
            {!sequence.active && (
              <>
                <span aria-hidden className="text-faint">
                  ·
                </span>
                <span className="text-warning">{t("sequences.enrollPaused")}</span>
              </>
            )}
          </p>

          <Stats stats={stats} />

          <div className="grid gap-3 @4xl:grid-cols-2">
            <section aria-labelledby="sequence-steps" className={cn(CARD, "flex flex-col")}>
              <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                <h3 id="sequence-steps" className="type-lead font-medium">
                  {t("sequences.steps")}
                </h3>
                <Button variant="secondary" onClick={() => setStepDialog({ stepId: null })}>
                  <Plus aria-hidden className="size-3" />
                  {t("sequences.addStep")}
                </Button>
              </div>
              <ol className="flex flex-col p-2">
                {steps.map((s) => (
                  <li key={s.id} className={cn("flex items-center gap-1 rounded-lg pr-1", s.id === step?.id && "bg-white/[0.05]")}>
                    <button
                      type="button"
                      aria-pressed={s.id === step?.id}
                      onClick={() => setSelectedId(s.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                    >
                      <span className="type-caption w-12 shrink-0 text-soft tabular-nums">{t("sequences.day", { day: s.day })}</span>
                      <ActivityIcon type={s.type} />
                      <span className="type-lead min-w-0 flex-1 truncate">{s.subject}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("sequences.stepActions", { subject: s.subject })}>
                          <Ellipsis aria-hidden className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem onSelect={() => setStepDialog({ stepId: s.id })}>{t("sequences.editStep")}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => deleteStep(s.id)} className="text-danger data-[highlighted]:text-danger">
                          {t("sequences.deleteStep")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
                {steps.length === 0 && <li className="type-caption px-2 py-6 text-center text-muted-foreground">{t("sequences.noSteps")}</li>}
              </ol>
            </section>

            <section aria-labelledby="sequence-preview" className={cn(CARD, "flex flex-col gap-3 p-4")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="sequence-preview" className="type-lead font-medium">
                  {t("sequences.preview")}
                </h3>
                {previewChoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="sequence-preview-contact" className="type-caption text-soft">
                      {t("sequences.previewAs")}
                    </label>
                    <Select value={previewContact?.id ?? ""} onValueChange={setPreviewId}>
                      <SelectTrigger id="sequence-preview-contact" className="h-[30px] w-[190px] rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {previewChoices.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            <ContactAvatar name={contact.name} size={18} />
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {step ? (
                <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-[#151515] p-4">
                  {step.type === "email" ? (
                    <dl className="type-caption grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-border pb-3">
                      <dt className="text-soft">{t("sequences.from")}</dt>
                      <dd className="truncate">
                        {owner.name} &lt;{owner.email}&gt;
                      </dd>
                      <dt className="text-soft">{t("sequences.to")}</dt>
                      <dd className="truncate">{previewContact ? `${previewContact.name} <${previewContact.email}>` : "—"}</dd>
                      <dt className="text-soft">{t("sequences.subject")}</dt>
                      <dd className="type-lead">
                        <Rendered template={step.subject} values={values} />
                      </dd>
                    </dl>
                  ) : (
                    <p className="type-caption flex items-center gap-2 border-b border-border pb-3 text-soft">
                      <ActivityIcon type={step.type} className="size-6" />
                      {t("sequences.taskFor", { type: t(`stepTypes.${step.type}`), name: owner.name })}
                      <span className="type-lead ml-1 text-foreground">
                        <Rendered template={step.subject} values={values} />
                      </span>
                    </p>
                  )}
                  <p className="type-body leading-relaxed whitespace-pre-line text-soft">
                    {step.body ? <Rendered template={step.body} values={values} /> : t("common.noValue")}
                  </p>
                </div>
              ) : (
                <p className="type-caption text-muted-foreground">{t("sequences.noSteps")}</p>
              )}
            </section>
          </div>

          <section aria-labelledby="sequence-people" className={CARD}>
            <h3 id="sequence-people" className="type-lead px-4 pt-4 pb-2 font-medium">
              {t("sequences.people")}
            </h3>
            {own.length === 0 ? (
              <p className="type-caption px-4 pt-1 pb-5 text-muted-foreground">{t("sequences.noPeople")}</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0">
                  <caption className="sr-only">{t("sequences.people")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={cn(HEAD, "pl-4")}>
                        {t("sequences.contact")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("sequences.status")}
                      </th>
                      <th scope="col" className={HEAD}>
                        {t("sequences.enrolledOn")}
                      </th>
                      <th scope="col" className={cn(HEAD, "pr-3")}>
                        <span className="sr-only">{t("table.action")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {own.map((enrollment) => {
                      const contact = people.get(enrollment.contactId);
                      if (!contact) return null;
                      const progress = enrollmentProgress(sequence, enrollment, today);
                      const ongoing = progress.status === "active" || progress.status === "paused";
                      return (
                        <tr key={enrollment.id}>
                          <td className={cn(CELL, "pl-4")}>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <ContactAvatar name={contact.name} size={26} />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openContact(contact.id)}
                                  className="block max-w-full truncate text-left outline-none decoration-white/40 underline-offset-4 hover:underline focus-visible:underline"
                                >
                                  {contact.name}
                                </button>
                                <p className="type-caption mt-1.5 truncate text-muted-foreground">
                                  {contact.title} · {names.get(contact.companyId)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={CELL}>
                            <div className="flex items-center gap-2.5">
                              <EnrollmentStatusTag status={progress.status} />
                              <span className="type-caption text-soft">{progressText(progress, enrollment)}</span>
                            </div>
                          </td>
                          <td className={cn(CELL, "type-caption text-soft tabular-nums")}>{date(enrollment.enrolledAt)}</td>
                          <td className={cn(CELL, "pr-3 text-right")}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("sequences.enrollmentActions", { name: contact.name })}>
                                  <Ellipsis aria-hidden className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[190px]">
                                {ongoing && <DropdownMenuItem onSelect={() => reply(enrollment, contact.name)}>{t("sequences.markReplied")}</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => remove(enrollment, contact.name)} className="text-danger data-[highlighted]:text-danger">
                                  {t("sequences.remove")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <StepDialog sequence={sequence} stepId={stepDialog?.stepId ?? null} open={stepDialog !== null} onOpenChange={(open) => !open && setStepDialog(null)} />
      <SequenceDialog open={editing} sequence={sequence} onOpenChange={setEditing} />
      <EnrollDialog sequence={sequence} open={enrolling} onOpenChange={setEnrolling} />
    </>
  );
}

function SequencesView() {
  const id = useOpenSequenceId();
  const sequence = useCrm((s) => (id ? s.sequences.find((x) => x.id === id) : undefined));
  return sequence ? <SequenceDetail key={sequence.id} sequence={sequence} /> : <SequencesList />;
}

export function SequencesPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <SequencesView /> : <ContentSkeleton variant="table" tabs={false} />;
}

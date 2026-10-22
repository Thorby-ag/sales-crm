import { ENROLLMENT_SEEDS, SEQUENCE_SEEDS } from "./data/sequences";
import { addDays, daysBetween } from "./format";
import { uniqueSlug } from "./text";
import type { Activity, Company, Contact, Enrollment, InteractionType, Sequence, SequenceStep, StepType } from "./types";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATE_VARIABLES = ["first_name", "last_name", "company", "title", "sender"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/** A piece of rendered text: plain, a filled variable, or a variable nobody knows. */
export interface TemplatePart {
  text: string;
  variable?: string;
  missing?: boolean;
}

const VARIABLE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Splits a template into parts, filling in the variables it knows. */
export function templateParts(template: string, values: Partial<Record<TemplateVariable, string>>): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let last = 0;
  for (const match of template.matchAll(VARIABLE)) {
    if (match.index > last) parts.push({ text: template.slice(last, match.index) });
    const name = match[1]!;
    const value = (values as Record<string, string | undefined>)[name];
    parts.push(value ? { text: value, variable: name } : { text: match[0], variable: name, missing: true });
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

export function renderTemplate(template: string, values: Partial<Record<TemplateVariable, string>>): string {
  return templateParts(template, values)
    .map((part) => part.text)
    .join("");
}

/** What the variables stand for when writing to `contact`. */
export function templateValues(contact: Contact | undefined, companyName: string, sender: string): Record<TemplateVariable, string> {
  const [first = "", ...rest] = (contact?.name ?? "").split(" ");
  return { first_name: first, last_name: rest.join(" "), company: companyName, title: contact?.title ?? "", sender: sender.split(" ")[0] ?? sender };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function sortedSteps(sequence: Pick<Sequence, "steps">): SequenceStep[] {
  return [...sequence.steps].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
}

export type EnrollmentStatus = "active" | "paused" | "replied" | "finished";

export interface EnrollmentProgress {
  status: EnrollmentStatus;
  /** Steps already run: sent, or due by now (until a reply stops the sequence). */
  completed: number;
  total: number;
  /** The next step and the day it's due; null once replied or finished. */
  next: { step: SequenceStep; date: string } | null;
}

export function enrollmentProgress(sequence: Sequence, enrollment: Enrollment, today: string): EnrollmentProgress {
  const steps = sortedSteps(sequence);
  const elapsed = daysBetween(enrollment.enrolledAt, enrollment.repliedAt ?? today);
  const completed = steps.filter((step) => step.day <= elapsed).length;
  const total = steps.length;
  if (enrollment.repliedAt) return { status: "replied", completed, total, next: null };
  if (completed >= total) return { status: "finished", completed, total, next: null };
  const step = steps[completed]!;
  return { status: sequence.active ? "active" : "paused", completed, total, next: { step, date: addDays(enrollment.enrolledAt, step.day) } };
}

export interface SequenceStats {
  enrolled: number;
  active: number;
  replied: number;
  finished: number;
  /** Replied over enrolled, as a whole percentage; null with nobody enrolled. */
  replyRate: number | null;
  emailsSent: number;
}

export function sequenceStats(sequence: Sequence, enrollments: readonly Enrollment[], today: string): SequenceStats {
  const own = enrollments.filter((e) => e.sequenceId === sequence.id);
  const emails = sortedSteps(sequence).filter((s) => s.type === "email");
  const stats: SequenceStats = { enrolled: own.length, active: 0, replied: 0, finished: 0, replyRate: null, emailsSent: 0 };
  for (const enrollment of own) {
    const { status } = enrollmentProgress(sequence, enrollment, today);
    if (status === "replied") stats.replied++;
    else if (status === "finished") stats.finished++;
    else stats.active++;
    const elapsed = daysBetween(enrollment.enrolledAt, enrollment.repliedAt ?? today);
    stats.emailsSent += emails.filter((s) => s.day <= elapsed).length;
  }
  stats.replyRate = own.length ? Math.round((stats.replied / own.length) * 100) : null;
  return stats;
}

// ---------------------------------------------------------------------------
// Enrolling
// ---------------------------------------------------------------------------

interface SequenceRecords {
  enrollments: Enrollment[];
  activities: Activity[];
}

/** The activity a call or task step becomes for one contact. */
function stepActivity(sequence: Sequence, step: SequenceStep, enrollment: Enrollment, contact: Contact, companyName: string): Activity {
  const values = templateValues(contact, companyName, sequence.owner);
  return {
    id: `${enrollment.id}-${step.id}`,
    type: step.type === "call" ? "call" : "task",
    subject: renderTemplate(step.subject, values),
    topic: sequence.topic,
    companyId: contact.companyId,
    dealId: null,
    contactId: contact.id,
    owner: sequence.owner,
    date: addDays(enrollment.enrolledAt, step.day),
    done: false,
    notes: renderTemplate(step.body, values),
    enrollmentId: enrollment.id,
  };
}

/**
 * Enrolls contacts that aren't in the sequence yet. Emails go out on their own; each call
 * or task step still ahead becomes a planned activity for the sequence owner.
 */
export function enroll(
  records: SequenceRecords,
  sequence: Sequence,
  contacts: readonly Contact[],
  companyName: (companyId: string) => string,
  today: string,
): SequenceRecords {
  const taken = new Set(records.enrollments.filter((e) => e.sequenceId === sequence.id).map((e) => e.contactId));
  const enrollments: Enrollment[] = [];
  const activities: Activity[] = [];
  for (const contact of contacts) {
    if (taken.has(contact.id)) continue;
    taken.add(contact.id);
    const enrollment: Enrollment = { id: `${sequence.id}--${contact.id}`, sequenceId: sequence.id, contactId: contact.id, enrolledAt: today, repliedAt: null };
    enrollments.push(enrollment);
    for (const step of sortedSteps(sequence)) {
      if (step.type !== "email") activities.push(stepActivity(sequence, step, enrollment, contact, companyName(contact.companyId)));
    }
  }
  return { enrollments: [...records.enrollments, ...enrollments], activities: [...activities, ...records.activities] };
}

/** Drops what an enrollment still had planned. Done activities stay: they happened. */
function dropPlanned(activities: readonly Activity[], enrollmentIds: ReadonlySet<string>): Activity[] {
  return activities.filter((a) => a.done || !a.enrollmentId || !enrollmentIds.has(a.enrollmentId));
}

/** The contact replied: the sequence stops for them. */
export function markReplied(records: SequenceRecords, enrollmentId: string, today: string): SequenceRecords {
  return {
    enrollments: records.enrollments.map((e) => (e.id === enrollmentId && !e.repliedAt ? { ...e, repliedAt: today } : e)),
    activities: dropPlanned(records.activities, new Set([enrollmentId])),
  };
}

export function unenroll(records: SequenceRecords, enrollmentId: string): SequenceRecords {
  return {
    enrollments: records.enrollments.filter((e) => e.id !== enrollmentId),
    activities: dropPlanned(records.activities, new Set([enrollmentId])),
  };
}

/** Deletes sequences with their enrollments and whatever those still had planned. */
export function deleteSequences(records: SequenceRecords & { sequences: Sequence[] }, ids: readonly string[]): SequenceRecords & { sequences: Sequence[] } {
  const set = new Set(ids);
  const gone = new Set(records.enrollments.filter((e) => set.has(e.sequenceId)).map((e) => e.id));
  return {
    sequences: records.sequences.filter((s) => !set.has(s.id)),
    enrollments: records.enrollments.filter((e) => !gone.has(e.id)),
    activities: dropPlanned(records.activities, gone),
  };
}

/**
 * Pausing drops what the sequence's active enrollments had planned; resuming plans the
 * call and task steps still ahead of them again.
 */
export function setSequenceActive(
  records: SequenceRecords & { sequences: Sequence[] },
  sequenceId: string,
  active: boolean,
  contacts: readonly Contact[],
  companyName: (companyId: string) => string,
  today: string,
): SequenceRecords & { sequences: Sequence[] } {
  const sequence = records.sequences.find((s) => s.id === sequenceId);
  if (!sequence || sequence.active === active) return records;
  const updated = { ...sequence, active };
  const running = records.enrollments.filter((e) => e.sequenceId === sequenceId && !e.repliedAt);
  const activities = dropPlanned(records.activities, new Set(running.map((e) => e.id)));
  if (active) {
    const people = new Map(contacts.map((c) => [c.id, c]));
    const taken = new Set(activities.map((a) => a.id));
    for (const enrollment of running) {
      const contact = people.get(enrollment.contactId);
      if (!contact) continue;
      for (const step of sortedSteps(updated)) {
        const planned = stepActivity(updated, step, enrollment, contact, companyName(contact.companyId));
        if (step.type !== "email" && planned.date >= today && !taken.has(planned.id)) activities.unshift(planned);
      }
    }
  }
  return { sequences: records.sequences.map((s) => (s.id === sequenceId ? updated : s)), enrollments: records.enrollments, activities };
}

/** Enrollments of contacts that no longer exist go too, with what they had planned. */
export function forgetContacts(records: SequenceRecords, contactIds: ReadonlySet<string>): SequenceRecords {
  const gone = new Set(records.enrollments.filter((e) => contactIds.has(e.contactId)).map((e) => e.id));
  return { enrollments: records.enrollments.filter((e) => !gone.has(e.id)), activities: dropPlanned(records.activities, gone) };
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

/**
 * The seeded sequences and who's in them. Active enrollments in running sequences get
 * their call and task steps still ahead as planned activities; past steps aren't logged,
 * so each company's last interaction stays the one in its seed.
 */
export function seedSequences(
  contacts: readonly Contact[],
  companies: readonly Company[],
  today: string,
): { sequences: Sequence[]; enrollments: Enrollment[]; activities: Activity[] } {
  const people = new Map(contacts.map((c) => [c.id, c]));
  const names = new Map(companies.map((c) => [c.id, c.name]));
  const enrollments: Enrollment[] = [];
  const activities: Activity[] = [];
  for (const [sequenceId, contactId, daysAgo, repliedAfter] of ENROLLMENT_SEEDS) {
    const sequence = SEQUENCE_SEEDS.find((s) => s.id === sequenceId)!;
    const contact = people.get(contactId);
    if (!contact || !names.has(contact.companyId)) continue;
    const enrolledAt = addDays(today, -daysAgo);
    const enrollment: Enrollment = {
      id: `${sequenceId}--${contactId}`,
      sequenceId,
      contactId,
      enrolledAt,
      repliedAt: repliedAfter === null ? null : addDays(enrolledAt, repliedAfter),
    };
    enrollments.push(enrollment);
    if (enrollment.repliedAt || !sequence.active) continue;
    for (const step of sortedSteps(sequence)) {
      if (step.type !== "email" && addDays(enrolledAt, step.day) >= today) {
        activities.push(stepActivity(sequence, step, enrollment, contact, names.get(contact.companyId)!));
      }
    }
  }
  return { sequences: SEQUENCE_SEEDS, enrollments, activities };
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export interface StepForm {
  /** Raw input value. */
  day: string;
  type: StepType;
  subject: string;
  body: string;
}

export type StepField = "day" | "subject";
/** Error codes, translated by the UI. */
export type StepError = "day" | "subjectRequired" | "subjectTooLong";
export type StepErrors = Partial<Record<StepField, StepError>>;

export const MAX_STEP_DAY = 90;

export function validateStep(form: StepForm): { ok: true; value: Omit<SequenceStep, "id"> } | { ok: false; errors: StepErrors } {
  const errors: StepErrors = {};
  const day = Number(form.day);
  if (form.day.trim() === "" || !Number.isInteger(day) || day < 0 || day > MAX_STEP_DAY) errors.day = "day";
  const subject = form.subject.trim().replace(/\s+/g, " ");
  if (!subject) errors.subject = "subjectRequired";
  else if (subject.length > 120) errors.subject = "subjectTooLong";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { day, type: form.type, subject, body: form.body.trim() } };
}

/** Adds a step, or replaces the one with the same id. */
export function saveStep(sequence: Sequence, step: SequenceStep): Sequence {
  const exists = sequence.steps.some((s) => s.id === step.id);
  return { ...sequence, steps: exists ? sequence.steps.map((s) => (s.id === step.id ? step : s)) : [...sequence.steps, step] };
}

export function removeStep(sequence: Sequence, stepId: string): Sequence {
  return { ...sequence, steps: sequence.steps.filter((s) => s.id !== stepId) };
}

/** A step id that isn't taken in the sequence. */
export function newStepId(sequence: Sequence): string {
  return uniqueSlug("step", new Set(sequence.steps.map((s) => s.id)), "step");
}

/** A new sequence starts with an email, a call and a follow-up email. */
export function createSequence(
  input: { name: string; owner: string; topic: InteractionType },
  existing: readonly Sequence[],
  starter: { emailSubject: string; emailBody: string; callSubject: string; followUpSubject: string; followUpBody: string },
): Sequence {
  return {
    id: uniqueSlug(input.name, new Set(existing.map((s) => s.id)), "sequence"),
    name: input.name,
    owner: input.owner,
    topic: input.topic,
    active: true,
    steps: [
      { id: "step", day: 0, type: "email", subject: starter.emailSubject, body: starter.emailBody },
      { id: "step-2", day: 3, type: "call", subject: starter.callSubject, body: "" },
      { id: "step-3", day: 7, type: "email", subject: starter.followUpSubject, body: starter.followUpBody },
    ],
  };
}

/** Sequence names: required, at most 60 characters. Returns the cleaned name or an error code. */
export function validateSequenceName(name: string): { ok: true; value: string } | { ok: false; error: "nameRequired" | "nameTooLong" } {
  const value = name.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, error: "nameRequired" };
  if (value.length > 60) return { ok: false, error: "nameTooLong" };
  return { ok: true, value };
}

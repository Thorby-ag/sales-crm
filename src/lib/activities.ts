import { contactsAt } from "./contacts";
import { COMPANY_SEEDS } from "./data/companies";
import { isOpen } from "./deals";
import { addDays, isSameQuarter } from "./format";
import { hashString, uniqueSlug } from "./text";
import type { Activity, ActivityFilters, ActivityType, Company, Contact, Deal, InteractionType } from "./types";

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

/** Seeded subjects are records (data), so they stay in English in every locale. */
export const TOPIC_SUBJECTS: Record<InteractionType, string> = {
  discovery: "Discovery call",
  demo: "Product demo",
  pricing: "Pricing review",
  security: "Security questionnaire",
  legal: "Contract review",
  product: "Product deep-dive",
  pilot: "Pilot check-in",
  exec: "Executive alignment",
  qbr: "Quarterly business review",
  partner: "Partner co-sell sync",
  renewal: "Renewal discussion",
  expansion: "Expansion planning",
};

/** How each kind of conversation usually happens. */
export const TOPIC_TYPE: Record<InteractionType, ActivityType> = {
  discovery: "call",
  demo: "meeting",
  pricing: "call",
  security: "email",
  legal: "email",
  product: "meeting",
  pilot: "meeting",
  exec: "meeting",
  qbr: "meeting",
  partner: "call",
  renewal: "call",
  expansion: "meeting",
};

/** What usually comes after each kind of conversation. */
const NEXT_TOPIC: Record<InteractionType, InteractionType> = {
  discovery: "demo",
  demo: "pricing",
  pricing: "legal",
  security: "legal",
  legal: "exec",
  product: "pilot",
  pilot: "pricing",
  exec: "legal",
  qbr: "renewal",
  partner: "demo",
  renewal: "pricing",
  expansion: "pricing",
};

const FOLLOW_UP_TASKS = ["Send the proposal", "Update the mutual action plan", "Share the security docs", "Prepare the business case", "Send the order form"];

/** Days from today for each account's next step: a few overdue, a few today, most within three weeks. */
const NEXT_STEP_OFFSETS = [-6, -2, 0, 0, 1, 2, 3, 5, 7, 9, 12, 14, 16, 21];

const SEEDED = new Set(COMPANY_SEEDS.map((seed) => seed.id));

/**
 * Each seeded account's history and next steps: the conversation shown as its last
 * interaction, the one before it, and the next step on the deal closing soonest.
 */
export function seedActivities(companies: readonly Company[], deals: readonly Deal[], contacts: readonly Contact[], today: string): Activity[] {
  const activities: Activity[] = [];
  for (const company of companies) {
    if (!SEEDED.has(company.id)) continue;
    const h = hashString(company.id);
    const people = contactsAt(contacts, company.id);
    const champion = people.find((c) => c.role === "champion") ?? people[0];
    const decider = people.find((c) => c.role === "decisionMaker") ?? champion;
    const open = deals.filter((d) => d.companyId === company.id && isOpen(d)).sort((a, b) => a.closeDate.localeCompare(b.closeDate));
    const last = company.lastInteraction;
    const earlier: InteractionType = last.type === "discovery" ? "partner" : "discovery";
    const next = NEXT_TOPIC[last.type];
    const base = { companyId: company.id, owner: company.owner, notes: "" };

    activities.push(
      { ...base, id: `${company.id}-a1`, type: TOPIC_TYPE[earlier], subject: TOPIC_SUBJECTS[earlier], topic: earlier, dealId: null, contactId: champion?.id ?? null, date: addDays(last.date, -(7 + (h % 12))), done: true },
      { ...base, id: `${company.id}-a2`, type: TOPIC_TYPE[last.type], subject: TOPIC_SUBJECTS[last.type], topic: last.type, dealId: open[0]?.id ?? null, contactId: champion?.id ?? null, date: last.date, done: true },
      { ...base, id: `${company.id}-a3`, type: TOPIC_TYPE[next], subject: TOPIC_SUBJECTS[next], topic: next, dealId: open[0]?.id ?? null, contactId: decider?.id ?? null, date: addDays(today, NEXT_STEP_OFFSETS[h % NEXT_STEP_OFFSETS.length]!), done: false },
    );
    if (h % 3 === 0) {
      activities.push({
        ...base,
        id: `${company.id}-a4`,
        type: "task",
        subject: FOLLOW_UP_TASKS[h % FOLLOW_UP_TASKS.length]!,
        topic: next,
        dealId: (open[1] ?? open[0])?.id ?? null,
        contactId: champion?.id ?? null,
        date: addDays(today, NEXT_STEP_OFFSETS[(h + 5) % NEXT_STEP_OFFSETS.length]!),
        done: false,
      });
    }
  }
  return activities;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function filterActivities(activities: readonly Activity[], filters: Pick<ActivityFilters, "owner" | "type">): Activity[] {
  return activities.filter((a) => (filters.owner === null || a.owner === filters.owner) && (filters.type === null || a.type === filters.type));
}

const byDate = (a: Activity, b: Activity) => a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject);

/** Planned activities by when they're due, soonest first. */
export function plannedGroups(activities: readonly Activity[], today: string): { overdue: Activity[]; today: Activity[]; upcoming: Activity[] } {
  const groups = { overdue: [] as Activity[], today: [] as Activity[], upcoming: [] as Activity[] };
  for (const activity of activities) {
    if (activity.done) continue;
    groups[activity.date < today ? "overdue" : activity.date === today ? "today" : "upcoming"].push(activity);
  }
  for (const list of Object.values(groups)) list.sort(byDate);
  return groups;
}

/** Done activities, most recent first. */
export function doneActivities(activities: readonly Activity[]): Activity[] {
  return activities.filter((a) => a.done).sort((a, b) => -byDate(a, b));
}

/** What's on the plate: overdue plus due today. */
export function dueCount(activities: readonly Activity[], today: string): number {
  return activities.filter((a) => !a.done && a.date <= today).length;
}

/** The earliest planned activity on a deal. */
export function nextStep(activities: readonly Activity[], dealId: string): Activity | undefined {
  return activities.filter((a) => !a.done && a.dealId === dealId).sort(byDate)[0];
}

/** Open deals closing this quarter (or already overdue) with nothing planned, biggest first. */
export function dealsWithoutNextStep(deals: readonly Deal[], activities: readonly Activity[], today: string): Deal[] {
  const planned = new Set(activities.filter((a) => !a.done && a.dealId).map((a) => a.dealId));
  return deals
    .filter((d) => isOpen(d) && !planned.has(d.id) && (d.closeDate < today || isSameQuarter(d.closeDate, today)))
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

/** A done activity newer than the company's last interaction becomes it. */
export function logInteraction(companies: readonly Company[], activity: Activity): Company[] {
  if (!activity.done) return companies as Company[];
  return companies.map((c) =>
    c.id === activity.companyId && activity.date >= c.lastInteraction.date ? { ...c, lastInteraction: { date: activity.date, type: activity.topic } } : c,
  );
}

/** Marks an activity done today and logs it as the company's last interaction. */
export function completeActivity(
  records: { activities: readonly Activity[]; companies: readonly Company[] },
  id: string,
  today: string,
): { activities: Activity[]; companies: Company[] } {
  const activity = records.activities.find((a) => a.id === id);
  if (!activity || activity.done) return { activities: [...records.activities], companies: [...records.companies] };
  const done: Activity = { ...activity, done: true, date: today };
  return {
    activities: records.activities.map((a) => (a.id === id ? done : a)),
    companies: logInteraction(records.companies, done),
  };
}

/** Replaces the activity with the same id, or adds it. */
export function upsertActivity(activities: readonly Activity[], activity: Activity): Activity[] {
  return activities.some((a) => a.id === activity.id) ? activities.map((a) => (a.id === activity.id ? activity : a)) : [activity, ...activities];
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

export interface ActivityForm {
  type: ActivityType;
  subject: string;
  topic: InteractionType;
  companyId: string;
  /** "" for none. */
  dealId: string;
  /** "" for none. */
  contactId: string;
  owner: string;
  date: string;
  done: boolean;
  notes: string;
}

export type ActivityField = "subject" | "companyId" | "date";
/** Error codes, translated by the UI. */
export type ActivityError = "subjectRequired" | "subjectTooLong" | "company" | "date" | "futureDone";
export type ActivityErrors = Partial<Record<ActivityField, ActivityError>>;

export function activityForm(activity: Activity): ActivityForm {
  const { type, subject, topic, companyId, owner, date, done, notes } = activity;
  return { type, subject, topic, companyId, dealId: activity.dealId ?? "", contactId: activity.contactId ?? "", owner, date, done, notes };
}

export function validateActivity(
  form: ActivityForm,
  companyIds: ReadonlySet<string>,
  today: string,
): { ok: true; value: ActivityForm } | { ok: false; errors: ActivityErrors } {
  const errors: ActivityErrors = {};
  const subject = form.subject.trim().replace(/\s+/g, " ");
  if (!subject) errors.subject = "subjectRequired";
  else if (subject.length > 80) errors.subject = "subjectTooLong";
  if (!companyIds.has(form.companyId)) errors.companyId = "company";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(Date.parse(form.date))) errors.date = "date";
  else if (form.done && form.date > today) errors.date = "futureDone";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { ...form, subject, notes: form.notes.trim() } };
}

/** The activity a valid form describes, keeping `id` (or a new one unique among `existing`). */
export function activityFromForm(form: ActivityForm, existing: readonly Activity[], id?: string): Activity {
  return {
    id: id ?? uniqueSlug(`${form.companyId} ${form.subject}`, new Set(existing.map((a) => a.id)), "activity"),
    type: form.type,
    subject: form.subject,
    topic: form.topic,
    companyId: form.companyId,
    dealId: form.dealId || null,
    contactId: form.contactId || null,
    owner: form.owner,
    date: form.date,
    done: form.done,
    notes: form.notes,
  };
}

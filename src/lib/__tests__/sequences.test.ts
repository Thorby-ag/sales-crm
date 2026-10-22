import { describe, expect, it } from "vitest";
import { addDays } from "../format";
import { seedDemo } from "../seed";
import {
  createSequence,
  deleteSequences,
  enroll,
  enrollmentProgress,
  forgetContacts,
  markReplied,
  newStepId,
  removeStep,
  renderTemplate,
  setSequenceActive,
  saveStep,
  sequenceStats,
  templateParts,
  templateValues,
  unenroll,
  validateSequenceName,
  validateStep,
} from "../sequences";
import type { Enrollment, Sequence } from "../types";
import { activity, contact, TODAY } from "./fixtures";

const sequence: Sequence = {
  id: "outreach",
  name: "Outreach",
  owner: "Nina Petrova",
  topic: "discovery",
  active: true,
  steps: [
    { id: "bump", day: 4, type: "email", subject: "Re: {{company}}", body: "" },
    { id: "intro", day: 0, type: "email", subject: "Hi {{first_name}}", body: "Hello {{first_name}} at {{company}}, {{sender}}" },
    { id: "call", day: 2, type: "call", subject: "Call {{first_name}}", body: "Ask about {{company}}" },
    { id: "task", day: 7, type: "task", subject: "Connect with {{first_name}}", body: "" },
  ],
};
const ann = contact({ id: "ann", name: "Ann Lee", title: "CTO", companyId: "acme" });
const bob = contact({ id: "bob", name: "Bob Ray", companyId: "acme" });
const companyName = () => "Acme";
const enrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: "outreach--ann",
  sequenceId: "outreach",
  contactId: "ann",
  enrolledAt: TODAY,
  repliedAt: null,
  ...overrides,
});

describe("templates", () => {
  const values = templateValues(ann, "Acme", "Nina Petrova");

  it("fill in what they know and point out what they don't", () => {
    expect(values).toEqual({ first_name: "Ann", last_name: "Lee", company: "Acme", title: "CTO", sender: "Nina" });
    expect(renderTemplate("Hi {{ first_name }}, about {{company}}", values)).toBe("Hi Ann, about Acme");
    expect(templateParts("{{first_name}} / {{budget}}!", values)).toEqual([
      { text: "Ann", variable: "first_name" },
      { text: " / " },
      { text: "{{budget}}", variable: "budget", missing: true },
      { text: "!" },
    ]);
  });
});

describe("progress", () => {
  it("runs the steps by day until the last one", () => {
    expect(enrollmentProgress(sequence, enrollment(), TODAY)).toMatchObject({ status: "active", completed: 1, total: 4 });
    expect(enrollmentProgress(sequence, enrollment(), TODAY).next).toEqual({ step: sequence.steps[2], date: addDays(TODAY, 2) });
    const lateStart = enrollment({ enrolledAt: addDays(TODAY, -5) });
    expect(enrollmentProgress(sequence, lateStart, TODAY)).toMatchObject({ completed: 3, next: { date: addDays(TODAY, 2) } });
    expect(enrollmentProgress(sequence, enrollment({ enrolledAt: addDays(TODAY, -7) }), TODAY)).toMatchObject({ status: "finished", next: null });
  });

  it("stops at a reply, and pauses with the sequence", () => {
    const replied = enrollment({ enrolledAt: addDays(TODAY, -6), repliedAt: addDays(TODAY, -3) });
    expect(enrollmentProgress(sequence, replied, TODAY)).toMatchObject({ status: "replied", completed: 2, next: null });
    expect(enrollmentProgress({ ...sequence, active: false }, enrollment(), TODAY).status).toBe("paused");
  });

  it("adds up who's in, who replied and the emails sent", () => {
    const list = [
      enrollment(),
      enrollment({ id: "b", contactId: "bob", enrolledAt: addDays(TODAY, -6), repliedAt: addDays(TODAY, -3) }),
      enrollment({ id: "c", contactId: "cy", enrolledAt: addDays(TODAY, -9) }),
      enrollment({ id: "other", sequenceId: "other" }),
    ];
    expect(sequenceStats(sequence, list, TODAY)).toEqual({ enrolled: 3, active: 1, replied: 1, finished: 1, replyRate: 33, emailsSent: 1 + 1 + 2 });
  });
});

describe("enrolling", () => {
  const records = { enrollments: [enrollment({ contactId: "bob", id: "outreach--bob" })], activities: [activity({ id: "keep" })] };

  it("adds new contacts only, with their calls and tasks as planned activities", () => {
    const next = enroll(records, sequence, [ann, bob], companyName, TODAY);
    expect(next.enrollments.map((e) => e.id)).toEqual(["outreach--bob", "outreach--ann"]);
    const planned = next.activities.filter((a) => a.enrollmentId === "outreach--ann");
    expect(planned.map((a) => [a.type, a.subject, a.date])).toEqual([
      ["call", "Call Ann", addDays(TODAY, 2)],
      ["task", "Connect with Ann", addDays(TODAY, 7)],
    ]);
    expect(planned[0]).toMatchObject({ owner: "Nina Petrova", contactId: "ann", companyId: "acme", topic: "discovery", notes: "Ask about Acme", done: false });
    expect(next.activities.at(-1)?.id).toBe("keep");
  });

  it("a reply or removal drops what's still planned, and keeps what's done", () => {
    const enrolled = enroll({ enrollments: [], activities: [] }, sequence, [ann], companyName, TODAY);
    const withDone = { ...enrolled, activities: [...enrolled.activities, activity({ id: "done", enrollmentId: "outreach--ann", done: true })] };

    const replied = markReplied(withDone, "outreach--ann", TODAY);
    expect(replied.enrollments[0]?.repliedAt).toBe(TODAY);
    expect(replied.activities.map((a) => a.id)).toEqual(["done"]);

    const removed = unenroll(withDone, "outreach--ann");
    expect(removed.enrollments).toEqual([]);
    expect(removed.activities.map((a) => a.id)).toEqual(["done"]);
  });

  it("deleting a sequence or a contact takes their enrollments with them", () => {
    const enrolled = enroll({ enrollments: [], activities: [] }, sequence, [ann, bob], companyName, TODAY);
    const gone = deleteSequences({ ...enrolled, sequences: [sequence] }, ["outreach"]);
    expect(gone).toEqual({ sequences: [], enrollments: [], activities: [] });
    const withoutAnn = forgetContacts(enrolled, new Set(["ann"]));
    expect(withoutAnn.enrollments.map((e) => e.contactId)).toEqual(["bob"]);
    expect(withoutAnn.activities.every((a) => a.contactId === "bob")).toBe(true);
  });
});

describe("pausing", () => {
  it("drops what's planned and plans the steps still ahead again on resume", () => {
    const enrolled = enroll({ enrollments: [], activities: [] }, sequence, [ann], companyName, addDays(TODAY, -3));
    const records = { ...enrolled, sequences: [sequence] };
    const paused = setSequenceActive(records, "outreach", false, [ann], companyName, TODAY);
    expect(paused.sequences[0]?.active).toBe(false);
    expect(paused.activities).toEqual([]);

    // Three days in, only the task on day 7 is still ahead.
    const resumed = setSequenceActive(paused, "outreach", true, [ann], companyName, TODAY);
    expect(resumed.activities.map((a) => [a.subject, a.date])).toEqual([["Connect with Ann", addDays(TODAY, 4)]]);
    expect(setSequenceActive(resumed, "outreach", true, [ann], companyName, TODAY)).toBe(resumed);
  });
});

describe("editing sequences", () => {
  it("validates steps", () => {
    expect(validateStep({ day: "3", type: "call", subject: "  Call  them ", body: " notes " })).toEqual({
      ok: true,
      value: { day: 3, type: "call", subject: "Call them", body: "notes" },
    });
    expect(validateStep({ day: "-1", type: "email", subject: "", body: "" })).toEqual({ ok: false, errors: { day: "day", subject: "subjectRequired" } });
    expect(validateStep({ day: "2.5", type: "email", subject: "x".repeat(121), body: "" })).toEqual({ ok: false, errors: { day: "day", subject: "subjectTooLong" } });
  });

  it("adds, replaces and removes steps with ids of their own", () => {
    const id = newStepId(sequence);
    expect(id).toBe("step");
    const added = saveStep(sequence, { id, day: 1, type: "task", subject: "Research", body: "" });
    expect(added.steps).toHaveLength(5);
    expect(saveStep(added, { id, day: 9, type: "task", subject: "Research", body: "" }).steps.find((s) => s.id === id)?.day).toBe(9);
    expect(removeStep(added, id).steps).toHaveLength(4);
  });

  it("creates new sequences with starter steps and validates names", () => {
    const starter = { emailSubject: "Hello", emailBody: "Hi {{first_name}}", callSubject: "Call", followUpSubject: "Again", followUpBody: "" };
    const created = createSequence({ name: "Outreach", owner: "Ada", topic: "demo" }, [sequence], starter);
    expect(created).toMatchObject({ id: "outreach-2", active: true });
    expect(created.steps.map((s) => [s.day, s.type])).toEqual([
      [0, "email"],
      [3, "call"],
      [7, "email"],
    ]);
    expect(validateSequenceName("  Big   push ")).toEqual({ ok: true, value: "Big push" });
    expect(validateSequenceName(" ")).toEqual({ ok: false, error: "nameRequired" });
    expect(validateSequenceName("x".repeat(61))).toEqual({ ok: false, error: "nameTooLong" });
  });
});

describe("seeded sequences", () => {
  const demo = seedDemo(TODAY);

  it("enroll existing contacts once per sequence and cover every status", () => {
    const contacts = new Set(demo.contacts.map((c) => c.id));
    const pairs = new Set<string>();
    const statuses = new Set<string>();
    for (const e of demo.enrollments) {
      expect(contacts.has(e.contactId), e.contactId).toBe(true);
      pairs.add(`${e.sequenceId}:${e.contactId}`);
      statuses.add(enrollmentProgress(demo.sequences.find((s) => s.id === e.sequenceId)!, e, TODAY).status);
    }
    expect(pairs.size).toBe(demo.enrollments.length);
    expect([...statuses].sort()).toEqual(["active", "finished", "paused", "replied"]);
  });

  it("plan only the calls and tasks still ahead of active enrollments", () => {
    const planned = demo.activities.filter((a) => a.enrollmentId);
    expect(planned.length).toBeGreaterThan(0);
    for (const a of planned) {
      const e = demo.enrollments.find((x) => x.id === a.enrollmentId)!;
      const s = demo.sequences.find((x) => x.id === e.sequenceId)!;
      expect(e.repliedAt).toBeNull();
      expect(s.active).toBe(true);
      expect(a.done).toBe(false);
      expect(a.date >= TODAY).toBe(true);
      expect(a.subject).not.toMatch(/\{\{/);
    }
  });
});

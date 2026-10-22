import { describe, expect, it } from "vitest";
import {
  contactEmail,
  contactForm,
  contactsAt,
  createContact,
  filterContacts,
  initials,
  searchContacts,
  seedContacts,
  upsertContact,
  validateContact,
  type ContactForm,
} from "../contacts";
import { COMPANY_SEEDS } from "../data/companies";
import { OWNERS, CURRENT_USER } from "../data/people";
import { contact } from "./fixtures";

const companyNames: Record<string, string> = { a: "Acme", b: "Brightwave" };
const companyName = (id: string) => companyNames[id] ?? id;

const people = [
  contact({ id: "zoe", name: "Zoe Park", title: "CFO", role: "decisionMaker", companyId: "b" }),
  contact({ id: "ana", name: "Ana Torres", title: "Head of IT", role: "influencer" }),
  contact({ id: "bo", name: "Bo Lund", title: "Analyst", role: "endUser", email: "bo@acme.example" }),
  contact({ id: "kai", name: "Kai Moreno", title: "Ops Lead", role: "champion" }),
];
const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe("seeded contacts", () => {
  const contacts = seedContacts();

  it("belong to seeded companies, with unique ids, emails and phone numbers", () => {
    const companies = new Set(COMPANY_SEEDS.map((c) => c.id));
    expect(contacts.length).toBeGreaterThanOrEqual(COMPANY_SEEDS.length * 2);
    for (const c of contacts) expect(companies.has(c.companyId), c.id).toBe(true);
    for (const key of ["id", "email", "phone"] as const) expect(new Set(contacts.map((c) => c[key])).size).toBe(contacts.length);
  });

  it("use fictional emails and phone numbers that don't clash with the sales team's", () => {
    const team = new Set([...OWNERS, CURRENT_USER].map((p) => p.phone));
    for (const c of contacts) {
      expect(c.email).toMatch(/^[a-z.]+@[a-z-]+\.example$/);
      expect(c.phone).toMatch(/^\+1 \(415\) 555-01\d\d$/);
      expect(team.has(c.phone), c.phone).toBe(false);
    }
  });

  it("can be limited to the companies that still exist", () => {
    expect(seedContacts(new Set(["kestrel"])).map((c) => c.companyId)).toEqual(["kestrel", "kestrel", "kestrel"]);
  });
});

describe("contact helpers", () => {
  it("build emails and initials from names", () => {
    expect(contactEmail("Liam O'Connor", "kestrel")).toBe("liam.oconnor@kestrel.example");
    expect(contactEmail("Amélie Schmidt", "veridian")).toBe("amelie.schmidt@veridian.example");
    expect(initials("Liam O'Connor")).toBe("LO");
    expect(initials("Pieter de Vries")).toBe("PV");
    expect(initials("Cher")).toBe("CH");
  });

  it("filter by text across name, title, email and company, and by role", () => {
    expect(ids(filterContacts(people, { query: "", role: null }, companyName))).toEqual(["ana", "bo", "kai", "zoe"]);
    expect(ids(filterContacts(people, { query: "brightwave", role: null }, companyName))).toEqual(["zoe"]);
    expect(ids(filterContacts(people, { query: "head of", role: null }, companyName))).toEqual(["ana"]);
    expect(ids(filterContacts(people, { query: "bo@", role: null }, companyName))).toEqual(["bo"]);
    expect(ids(filterContacts(people, { query: "", role: "champion" }, companyName))).toEqual(["kai"]);
  });

  it("list an account's buying committee, decision makers first", () => {
    expect(ids(contactsAt([...people, contact({ id: "dm", name: "Dee", role: "decisionMaker" })], "a"))).toEqual(["dm", "kai", "ana", "bo"]);
  });

  it("search names first and return nothing for an empty query", () => {
    const many = [...people, contact({ id: "kat", name: "Kat Bo", title: "CTO" })];
    expect(ids(searchContacts(many, "bo", companyName))).toEqual(["bo", "kat"]);
    expect(searchContacts(many, "  ", companyName)).toEqual([]);
    expect(searchContacts(many, "a", companyName, 2)).toHaveLength(2);
  });
});

describe("creating and editing contacts", () => {
  const form: ContactForm = { name: "  Ana   Torres ", title: " Head of IT ", companyId: "a", role: "champion", email: " Ana@Acme.example ", phone: "" };
  const companies = new Set(["a", "b"]);

  it("cleans up valid input", () => {
    expect(validateContact(form, companies)).toEqual({
      ok: true,
      value: { ...form, name: "Ana Torres", title: "Head of IT", email: "ana@acme.example", phone: "" },
    });
  });

  it("reports each problem with a code", () => {
    expect(validateContact({ ...form, name: " ", companyId: "x", email: "", phone: "call me" }, companies)).toEqual({
      ok: false,
      errors: { name: "nameRequired", companyId: "company", email: "emailRequired", phone: "phone" },
    });
    expect(validateContact({ ...form, name: "x".repeat(61), email: "ana@acme" }, companies)).toEqual({
      ok: false,
      errors: { name: "nameTooLong", email: "email" },
    });
    expect(validateContact({ ...form, phone: "+1 (415) 555-0199" }, companies).ok).toBe(true);
  });

  it("creates unique ids and replaces or adds on save", () => {
    const created = createContact({ ...form, name: "Ana Torres" }, people);
    expect(created.id).toBe("ana-torres");
    expect(createContact({ ...form, name: "Ana" }, people).id).toBe("ana-2");
    expect(contactForm(created)).toEqual({ ...form, name: "Ana Torres" });

    const added = upsertContact(people, created);
    expect(ids(added)).toEqual(["ana-torres", "zoe", "ana", "bo", "kai"]);
    const edited = upsertContact(added, { ...created, title: "CIO" });
    expect(edited).toHaveLength(5);
    expect(edited[0]?.title).toBe("CIO");
  });
});

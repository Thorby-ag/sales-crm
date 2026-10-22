import { CONTACT_SEEDS } from "./data/contacts";
import { normalize, slugify, uniqueSlug } from "./text";
import { BUYING_ROLES, type BuyingRole, type Contact, type ContactFilters } from "./types";

/** "Liam O'Connor" at kestrel → "liam.oconnor@kestrel.example" */
export function contactEmail(name: string, companyId: string): string {
  const local = normalize(name)
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(".");
  return `${local}@${companyId}.example`;
}

/** "Liam O'Connor" → "LO", "Pieter de Vries" → "PV", "Cher" → "CH" */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  return (words.length > 1 ? first[0]! + words.at(-1)![0]! : first.slice(0, 2)).toUpperCase();
}

/** 555-0100…0125 belong to the sales team (see people.ts); contacts take the next numbers. */
const FIRST_PHONE = 26;

/** Seeded contacts, for the given companies only when `companyIds` is passed. */
export function seedContacts(companyIds?: ReadonlySet<string>): Contact[] {
  const contacts: Contact[] = [];
  let n = 0;
  for (const [companyId, people] of Object.entries(CONTACT_SEEDS)) {
    for (const [name, title, role] of people) {
      // Numbered across every seed, so a contact keeps its number whatever is filtered out.
      const phone = `+1 (415) 555-01${String(FIRST_PHONE + n++).padStart(2, "0")}`;
      if (companyIds && !companyIds.has(companyId)) continue;
      contacts.push({ id: slugify(name), companyId, name, title, email: contactEmail(name, companyId), phone, role });
    }
  }
  return contacts;
}

// ---------------------------------------------------------------------------
// Lists & search
// ---------------------------------------------------------------------------

const ROLE_ORDER = new Map<BuyingRole, number>(BUYING_ROLES.map((role, i) => [role, i]));

function matches(contact: Contact, query: string, companyName: string): boolean {
  return [contact.name, contact.title, contact.email, companyName].some((value) => normalize(value).includes(query));
}

/** Contacts matching the text (name, title, email or company) and role, A–Z. */
export function filterContacts(
  contacts: readonly Contact[],
  filters: ContactFilters,
  companyName: (companyId: string) => string,
): Contact[] {
  const query = normalize(filters.query);
  return contacts
    .filter((c) => (filters.role === null || c.role === filters.role) && (!query || matches(c, query, companyName(c.companyId))))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** An account's buying committee, decision makers first. */
export function contactsAt(contacts: readonly Contact[], companyId: string): Contact[] {
  return contacts
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => ROLE_ORDER.get(a.role)! - ROLE_ORDER.get(b.role)! || a.name.localeCompare(b.name));
}

/** Search results: names starting with the query first, then other matches. Nothing for an empty query. */
export function searchContacts(
  contacts: readonly Contact[],
  query: string,
  companyName: (companyId: string) => string,
  limit = 6,
): Contact[] {
  const q = normalize(query);
  if (!q) return [];
  const score = (c: Contact) => (normalize(c.name).startsWith(q) ? 2 : normalize(c.name).includes(q) ? 1 : 0);
  return contacts
    .filter((c) => matches(c, q, companyName(c.companyId)))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Creating & editing
// ---------------------------------------------------------------------------

export interface ContactForm {
  name: string;
  title: string;
  companyId: string;
  role: BuyingRole;
  email: string;
  phone: string;
}

export type ContactField = "name" | "companyId" | "email" | "phone";
/** Error codes, translated by the UI. */
export type ContactError = "nameRequired" | "nameTooLong" | "company" | "emailRequired" | "email" | "phone";
export type ContactErrors = Partial<Record<ContactField, ContactError>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;

export function contactForm(contact: Contact): ContactForm {
  const { name, title, companyId, role, email, phone } = contact;
  return { name, title, companyId, role, email, phone };
}

export function validateContact(
  form: ContactForm,
  companyIds: ReadonlySet<string>,
): { ok: true; value: ContactForm } | { ok: false; errors: ContactErrors } {
  const errors: ContactErrors = {};
  const name = form.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "nameRequired";
  else if (name.length > 60) errors.name = "nameTooLong";

  if (!companyIds.has(form.companyId)) errors.companyId = "company";

  const email = form.email.trim().toLowerCase();
  if (!email) errors.email = "emailRequired";
  else if (!EMAIL.test(email)) errors.email = "email";

  const phone = form.phone.trim();
  if (phone && !PHONE.test(phone)) errors.phone = "phone";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { ...form, name, title: form.title.trim().replace(/\s+/g, " "), email, phone } };
}

/** A new contact whose id comes from its name, unique among `existing`. */
export function createContact(form: ContactForm, existing: readonly Contact[]): Contact {
  return { id: uniqueSlug(form.name, new Set(existing.map((c) => c.id)), "contact"), ...form };
}

/** Replaces the contact with the same id, or adds it first. */
export function upsertContact(contacts: readonly Contact[], contact: Contact): Contact[] {
  return contacts.some((c) => c.id === contact.id) ? contacts.map((c) => (c.id === contact.id ? contact : c)) : [contact, ...contacts];
}

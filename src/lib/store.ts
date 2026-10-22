import { create } from "zustand";
import { completeActivity, logInteraction, upsertActivity } from "./activities";
import { assignOwner, deleteCompanies } from "./companies";
import { upsertContact } from "./contacts";
import { deleteSequences, enroll, forgetContacts, markReplied, setSequenceActive, unenroll } from "./sequences";
import { NOTIFICATIONS } from "./data/notifications";
import { moveDeal, updateDeal } from "./deals";
import { localToday } from "./format";
import { LEGACY_STORAGE_KEYS, restoreDemo, serializeDemo, STORAGE_KEY, type DemoState } from "./persistence";
import { seedDemo } from "./seed";
import type { Activity, Company, Contact, Deal, DealStage, Sequence } from "./types";

interface CrmState extends DemoState {
  /** False until the browser has loaded saved data (or seeded fresh data). */
  hydrated: boolean;
  /** The visitor's local date; every "days ago" in the demo is relative to it. */
  today: string;
  selectedIds: string[];
  profileName: string | null;
  profileOpen: boolean;
  newCompanyOpen: boolean;
  /** The contact dialog: a contact to edit, or a new one (optionally at a given company). */
  contactDialog: { contactId: string | null; companyId: string | null } | null;
  /** The activity dialog: an activity to edit, or a new one with whatever it's planned for. */
  activityDialog: ActivityDialogTarget | null;
  searchOpen: boolean;
  mobileNavOpen: boolean;
}

export interface ActivityDialogTarget {
  activityId?: string;
  companyId?: string;
  dealId?: string;
  contactId?: string;
}

interface CrmActions {
  hydrate: () => void;
  snapshot: () => DemoState;
  restore: (snapshot: DemoState) => void;
  resetDemo: () => void;
  addCompany: (company: Company, deals: Deal[]) => void;
  moveDeal: (dealId: string, stage: DealStage) => void;
  /** Replaces a deal with `update(deal)`; the change functions live in lib/deals. */
  updateDeal: (dealId: string, update: (deal: Deal) => Deal) => void;
  saveContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
  /** Adds or replaces an activity; a done one may become its company's last interaction. */
  saveActivity: (activity: Activity) => void;
  completeActivity: (activityId: string) => void;
  deleteActivity: (activityId: string) => void;
  saveSequence: (sequence: Sequence) => void;
  deleteSequence: (sequenceId: string) => void;
  /** Enrolls the contacts that aren't in the sequence yet. */
  enrollContacts: (sequenceId: string, contactIds: string[]) => void;
  markReplied: (enrollmentId: string) => void;
  unenroll: (enrollmentId: string) => void;
  setSequenceActive: (sequenceId: string, active: boolean) => void;
  assignOwner: (companyIds: string[], owner: string) => void;
  deleteCompanies: (companyIds: string[]) => void;
  setScoreOverride: (companyId: string, stars: number[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toggleSelected: (id: string) => void;
  setSelected: (ids: string[]) => void;
  openProfile: (name: string) => void;
  closeProfile: () => void;
  setNewCompanyOpen: (open: boolean) => void;
  openContactDialog: (target: { contactId?: string; companyId?: string }) => void;
  closeContactDialog: () => void;
  openActivityDialog: (target: ActivityDialogTarget) => void;
  closeActivityDialog: () => void;
  setSearchOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

const freshDemo = (today: string): DemoState => ({
  ...seedDemo(today),
  scoreOverrides: {},
  unreadIds: NOTIFICATIONS.filter((n) => n.unread).map((n) => n.id),
});

function readSaved(): string | null {
  try {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // Storage can be unavailable (private mode, blocked site data).
  }
}

// A module-level store is fine here: it only holds data once it hydrates in the
// browser, so nothing is ever shared between server requests.
export const useCrm = create<CrmState & CrmActions>()((set, get) => ({
  hydrated: false,
  today: "",
  companies: [],
  deals: [],
  contacts: [],
  activities: [],
  sequences: [],
  enrollments: [],
  scoreOverrides: {},
  unreadIds: [],
  selectedIds: [],
  profileName: null,
  profileOpen: false,
  newCompanyOpen: false,
  contactDialog: null,
  activityDialog: null,
  searchOpen: false,
  mobileNavOpen: false,

  hydrate: () => {
    if (get().hydrated) return;
    const today = localToday();
    set({ ...(restoreDemo(readSaved(), today) ?? freshDemo(today)), today, hydrated: true });
  },
  snapshot: () => {
    const { companies, deals, contacts, activities, sequences, enrollments, scoreOverrides, unreadIds } = get();
    return { companies, deals, contacts, activities, sequences, enrollments, scoreOverrides, unreadIds };
  },
  restore: (snapshot) => set({ ...snapshot }),
  resetDemo: () => set({ ...freshDemo(get().today), selectedIds: [] }),
  addCompany: (company, deals) =>
    set((s) => ({ companies: [company, ...s.companies], deals: [...deals, ...s.deals], newCompanyOpen: false })),
  moveDeal: (dealId, stage) => set((s) => ({ deals: moveDeal(s.deals, dealId, stage, s.today) })),
  updateDeal: (dealId, update) => set((s) => ({ deals: updateDeal(s.deals, dealId, update) })),
  saveContact: (contact) => set((s) => ({ contacts: upsertContact(s.contacts, contact) })),
  // A deleted contact leaves their sequences; their other activities stay, unlinked.
  deleteContact: (contactId) =>
    set((s) => {
      const { enrollments, activities } = forgetContacts(s, new Set([contactId]));
      return {
        contacts: s.contacts.filter((c) => c.id !== contactId),
        enrollments,
        activities: activities.map((a) => (a.contactId === contactId ? { ...a, contactId: null } : a)),
      };
    }),
  saveActivity: (activity) =>
    set((s) => ({ activities: upsertActivity(s.activities, activity), companies: logInteraction(s.companies, activity) })),
  completeActivity: (activityId) => set((s) => completeActivity(s, activityId, s.today)),
  deleteActivity: (activityId) => set((s) => ({ activities: s.activities.filter((a) => a.id !== activityId) })),
  saveSequence: (sequence) =>
    set((s) => ({
      sequences: s.sequences.some((x) => x.id === sequence.id) ? s.sequences.map((x) => (x.id === sequence.id ? sequence : x)) : [sequence, ...s.sequences],
    })),
  deleteSequence: (sequenceId) => set((s) => deleteSequences(s, [sequenceId])),
  enrollContacts: (sequenceId, contactIds) =>
    set((s) => {
      const sequence = s.sequences.find((x) => x.id === sequenceId);
      if (!sequence) return {};
      const ids = new Set(contactIds);
      const names = new Map(s.companies.map((c) => [c.id, c.name]));
      return enroll(s, sequence, s.contacts.filter((c) => ids.has(c.id)), (id) => names.get(id) ?? "", s.today);
    }),
  markReplied: (enrollmentId) => set((s) => markReplied(s, enrollmentId, s.today)),
  unenroll: (enrollmentId) => set((s) => unenroll(s, enrollmentId)),
  setSequenceActive: (sequenceId, active) =>
    set((s) => {
      const names = new Map(s.companies.map((c) => [c.id, c.name]));
      return setSequenceActive(s, sequenceId, active, s.contacts, (id) => names.get(id) ?? "", s.today);
    }),
  assignOwner: (companyIds, owner) => set((s) => assignOwner(s, companyIds, owner)),
  deleteCompanies: (companyIds) =>
    set((s) => ({
      ...deleteCompanies(s, companyIds),
      selectedIds: s.selectedIds.filter((id) => !companyIds.includes(id)),
    })),
  setScoreOverride: (companyId, stars) => set((s) => ({ scoreOverrides: { ...s.scoreOverrides, [companyId]: stars } })),
  markRead: (id) => set((s) => ({ unreadIds: s.unreadIds.filter((x) => x !== id) })),
  markAllRead: () => set({ unreadIds: [] }),
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id],
    })),
  setSelected: (ids) => set({ selectedIds: ids }),
  openProfile: (name) => set({ profileName: name, profileOpen: true }),
  closeProfile: () => set({ profileOpen: false }),
  setNewCompanyOpen: (open) => set({ newCompanyOpen: open }),
  openContactDialog: ({ contactId, companyId }) => set({ contactDialog: { contactId: contactId ?? null, companyId: companyId ?? null } }),
  closeContactDialog: () => set({ contactDialog: null }),
  openActivityDialog: (target) => set({ activityDialog: target }),
  closeActivityDialog: () => set({ activityDialog: null }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));

/**
 * Saves demo data to localStorage whenever it changes (debounced). Call after `hydrate()`,
 * so saved data is never overwritten by the empty initial state. Returns a cleanup function.
 */
export function startPersistence(onError: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timer = undefined;
    const state = useCrm.getState();
    try {
      localStorage.setItem(STORAGE_KEY, serializeDemo(state.snapshot(), state.today));
    } catch {
      onError();
    }
  };
  const flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      save();
    }
  };
  const unsubscribe = useCrm.subscribe((state, prev) => {
    if (!state.hydrated) return;
    const changed =
      state.companies !== prev.companies ||
      state.deals !== prev.deals ||
      state.contacts !== prev.contacts ||
      state.activities !== prev.activities ||
      state.sequences !== prev.sequences ||
      state.enrollments !== prev.enrollments ||
      state.scoreOverrides !== prev.scoreOverrides ||
      state.unreadIds !== prev.unreadIds;
    if (!changed) return;
    clearTimeout(timer);
    timer = setTimeout(save, 150);
  });
  window.addEventListener("pagehide", flush);
  return () => {
    flush();
    unsubscribe();
    window.removeEventListener("pagehide", flush);
  };
}

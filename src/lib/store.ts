import { create } from "zustand";
import { completeActivity, logInteraction, upsertActivity } from "./activities";
import { assignOwner, deleteCompanies } from "./companies";
import { upsertContact } from "./contacts";
import { NOTIFICATIONS } from "./data/notifications";
import { moveDeal, updateDeal } from "./deals";
import { localToday } from "./format";
import { LEGACY_STORAGE_KEYS, restoreDemo, serializeDemo, STORAGE_KEY, type DemoState } from "./persistence";
import { seedDemo } from "./seed";
import type { Activity, Company, Contact, Deal, DealStage } from "./types";

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
    const { companies, deals, contacts, activities, scoreOverrides, unreadIds } = get();
    return { companies, deals, contacts, activities, scoreOverrides, unreadIds };
  },
  restore: (snapshot) => set({ ...snapshot }),
  resetDemo: () => set({ ...freshDemo(get().today), selectedIds: [] }),
  addCompany: (company, deals) =>
    set((s) => ({ companies: [company, ...s.companies], deals: [...deals, ...s.deals], newCompanyOpen: false })),
  moveDeal: (dealId, stage) => set((s) => ({ deals: moveDeal(s.deals, dealId, stage, s.today) })),
  updateDeal: (dealId, update) => set((s) => ({ deals: updateDeal(s.deals, dealId, update) })),
  saveContact: (contact) => set((s) => ({ contacts: upsertContact(s.contacts, contact) })),
  // Activities with a deleted contact stay: they happened, or still need doing.
  deleteContact: (contactId) =>
    set((s) => ({
      contacts: s.contacts.filter((c) => c.id !== contactId),
      activities: s.activities.map((a) => (a.contactId === contactId ? { ...a, contactId: null } : a)),
    })),
  saveActivity: (activity) =>
    set((s) => ({ activities: upsertActivity(s.activities, activity), companies: logInteraction(s.companies, activity) })),
  completeActivity: (activityId) => set((s) => completeActivity(s, activityId, s.today)),
  deleteActivity: (activityId) => set((s) => ({ activities: s.activities.filter((a) => a.id !== activityId) })),
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

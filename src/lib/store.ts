import { create } from "zustand";
import { assignOwner, deleteCompanies } from "./companies";
import { NOTIFICATIONS } from "./data/notifications";
import { moveDeal } from "./deals";
import { localToday } from "./format";
import { restoreDemo, serializeDemo, STORAGE_KEY, type DemoState } from "./persistence";
import { seedDemo } from "./seed";
import type { Company, Deal, DealStage } from "./types";

interface CrmState extends DemoState {
  /** False until the browser has loaded saved data (or seeded fresh data). */
  hydrated: boolean;
  /** The visitor's local date; every "days ago" in the demo is relative to it. */
  today: string;
  selectedIds: string[];
  profileName: string | null;
  profileOpen: boolean;
  newCompanyOpen: boolean;
  searchOpen: boolean;
  mobileNavOpen: boolean;
}

interface CrmActions {
  hydrate: () => void;
  snapshot: () => DemoState;
  restore: (snapshot: DemoState) => void;
  resetDemo: () => void;
  addCompany: (company: Company, deals: Deal[]) => void;
  moveDeal: (dealId: string, stage: DealStage) => void;
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
  scoreOverrides: {},
  unreadIds: [],
  selectedIds: [],
  profileName: null,
  profileOpen: false,
  newCompanyOpen: false,
  searchOpen: false,
  mobileNavOpen: false,

  hydrate: () => {
    if (get().hydrated) return;
    const today = localToday();
    set({ ...(restoreDemo(readSaved(), today) ?? freshDemo(today)), today, hydrated: true });
  },
  snapshot: () => {
    const { companies, deals, scoreOverrides, unreadIds } = get();
    return { companies, deals, scoreOverrides, unreadIds };
  },
  restore: (snapshot) => set({ ...snapshot }),
  resetDemo: () => set({ ...freshDemo(get().today), selectedIds: [] }),
  addCompany: (company, deals) =>
    set((s) => ({ companies: [company, ...s.companies], deals: [...deals, ...s.deals], newCompanyOpen: false })),
  moveDeal: (dealId, stage) => set((s) => ({ deals: moveDeal(s.deals, dealId, stage, s.today) })),
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

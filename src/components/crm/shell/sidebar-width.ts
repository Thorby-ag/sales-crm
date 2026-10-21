"use client";

import { useSyncExternalStore } from "react";
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, SIDEBAR_STORAGE_KEY } from "./sidebar-config";

const listeners = new Set<() => void>();
let current: number | null = null;

const clamp = (value: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));

function read(): number {
  if (current === null) {
    let stored = NaN;
    try {
      stored = Number.parseInt(localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? "", 10);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies).
    }
    current = Number.isFinite(stored) ? clamp(stored) : SIDEBAR_DEFAULT;
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSidebarWidth(): number {
  return useSyncExternalStore(subscribe, read, () => SIDEBAR_DEFAULT);
}

export function setSidebarWidth(value: number): void {
  current = clamp(value);
  document.documentElement.style.setProperty("--sidebar-width", `${current}px`);
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(current));
  } catch {
    // Not persisted; the width still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

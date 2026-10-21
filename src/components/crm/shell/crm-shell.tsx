"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { toast, Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startPersistence, useCrm } from "@/lib/store";
import { CompanyDetailSheet } from "../sheets/company-detail-sheet";
import { NewCompanyDialog } from "../sheets/new-company-dialog";
import { ProfileSheet } from "../sheets/profile-sheet";
import { SidebarSkeleton } from "./app-skeleton";
import { SearchDialog } from "./search-dialog";
import { DesktopSidebar, MobileSidebar } from "./sidebar";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** ⌘K / Ctrl+K toggles search anywhere; "/" opens it when not typing. */
function useSearchShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { searchOpen, setSearchOpen } = useCrm.getState();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(!searchOpen);
      } else if (event.key === "/" && !searchOpen && !isTyping(event.target) && !document.querySelector("[role=dialog]")) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/**
 * Demo data lives in the browser, so the server (and the static HTML) renders skeletons.
 * The page is always rendered, even before hydration: that's how a `notFound()` in a page
 * reaches the server render and gets a real 404 status. Pages show their own skeleton
 * until `hydrated` flips on the client.
 */
export function CrmShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const hydrated = useCrm((s) => s.hydrated);
  useSearchShortcut();

  useEffect(() => {
    useCrm.getState().hydrate();
    return startPersistence(() => toast.error(t("toasts.storageError"), { id: "storage-error" }));
  }, [t]);

  if (!hydrated) {
    return (
      <div className="flex h-dvh max-w-full overflow-hidden">
        <SidebarSkeleton />
        <main id="main" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <a
        href="#main"
        className="sr-only rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        {t("common.skipToContent")}
      </a>
      <div className="flex h-dvh max-w-full overflow-hidden">
        <DesktopSidebar />
        <MobileSidebar />
        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          {children}
        </main>
      </div>
      <CompanyDetailSheet />
      <ProfileSheet />
      <NewCompanyDialog />
      <SearchDialog />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1b1b1b",
            border: "1px solid #2a2a2a",
            color: "var(--foreground)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </TooltipProvider>
  );
}

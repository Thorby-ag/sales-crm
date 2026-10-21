"use client";

import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useCrm } from "@/lib/store";
import { HeaderSkeleton } from "./app-skeleton";
import { PageHeader } from "./page-header";

/** Localized 404 inside the app. The message renders on the server too (no demo data needed). */
export function NotFoundView() {
  const t = useTranslations("notFound");
  const hydrated = useCrm((s) => s.hydrated);
  return (
    <>
      {hydrated ? <PageHeader /> : <HeaderSkeleton />}
      <div className="flex flex-1 items-center justify-center border-t border-border p-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <p className="type-eyebrow text-muted-foreground">404</p>
          <h2 className="type-title mt-3">{t("title")}</h2>
          <p className="type-body mt-2.5 text-muted-foreground">{t("description")}</p>
          <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-5" })}>
            {t("back")}
          </Link>
        </div>
      </div>
    </>
  );
}

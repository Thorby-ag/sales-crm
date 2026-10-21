"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/lib/types";

/** Switches language on the same page, keeping filters and the open company in the URL. */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="gap-1.5 px-2.5">
          <Languages aria-hidden className="size-3.5" />
          {/* The accessible name starts with the visible "EN"/"ES" (WCAG 2.5.3, label in name). */}
          <span className="uppercase">{locale}</span>
          <span className="sr-only">, {t("header.language", { name: t(`languages.${locale}`) })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) =>
            router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next as AppLocale, scroll: false })
          }
        >
          {routing.locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              {t(`languages.${l}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuidePage } from "@/components/crm/guide/guide-page";
import { alternatesFor } from "@/i18n/metadata";
import type { AppLocale } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "guide" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(locale, "/guide") };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <GuidePage locale={locale as AppLocale} />;
}

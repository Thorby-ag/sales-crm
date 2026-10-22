import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SequencesPage } from "@/components/crm/sequences/sequences-page";
import { alternatesFor } from "@/i18n/metadata";
import type { AppLocale } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as AppLocale, namespace: "views" });
  return { title: t("sequences"), alternates: alternatesFor(locale, "/sequences") };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SequencesPage />;
}

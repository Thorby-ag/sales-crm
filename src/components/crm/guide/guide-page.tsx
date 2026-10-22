import { ArrowUpRight, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense, type ComponentProps, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Kbd } from "@/components/ui/chips";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/types";
import { HeaderSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";

const REPOSITORY = "https://github.com/Thorby-ag/sales-crm";
const LIVE_DEMO = "https://salescrm.thomalabs.com";

type Href = ComponentProps<typeof Link>["href"];
type SectionId = "basics" | "companies" | "deals" | "forecast" | "contacts" | "activities" | "sequences" | "demo";

/**
 * Task-based sections, in the order someone new would use the CRM. Each has four steps, a
 * screenshot (made by `npm run guide:assets`) and two links into the app.
 */
const SECTIONS: { id: SectionId; image: string; phone?: boolean; links: { a: Href; b: Href } }[] = [
  { id: "basics", image: "basics", links: { a: { pathname: "/", query: { region: "emea" } }, b: { pathname: "/deals", query: { close: "overdue" } } } },
  { id: "companies", image: "companies", links: { a: { pathname: "/", query: { owner: "kenji-mori" } }, b: { pathname: "/", query: { company: "halcyon-air" } } } },
  { id: "deals", image: "deals", links: { a: { pathname: "/deals", query: { close: "quarter" } }, b: { pathname: "/deals", query: { owner: "kenji-mori" } } } },
  { id: "forecast", image: "forecast", links: { a: { pathname: "/forecast", query: { quarter: "next" } }, b: { pathname: "/forecast", query: { team: "sdr" } } } },
  { id: "contacts", image: "contacts", links: { a: { pathname: "/contacts", query: { role: "champion" } }, b: { pathname: "/contacts", query: { contact: "olivia-chen" } } } },
  { id: "activities", image: "activities", links: { a: { pathname: "/activities", query: { view: "done" } }, b: { pathname: "/activities", query: { type: "meeting" } } } },
  { id: "sequences", image: "sequences", links: { a: { pathname: "/sequences", query: { sequence: "new-logo-outreach" } }, b: "/sequences" } },
  { id: "demo", image: "mobile", phone: true, links: { a: REPOSITORY, b: "/" } },
];

const STEPS = ["1", "2", "3", "4"] as const;

const PILL = "type-caption inline-flex h-7 items-center gap-1 rounded-full bg-secondary px-3 text-foreground shadow-raised outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-white/25";

function TryLink({ href, children }: { href: Href; children: ReactNode }) {
  if (typeof href === "string" && href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={PILL}>
        {children}
        <ArrowUpRight aria-hidden className="size-3" />
      </a>
    );
  }
  return (
    <Link href={href} className={PILL}>
      {children}
    </Link>
  );
}

export async function GuidePage({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "guide" });
  const rich = {
    b: (chunks: ReactNode) => <strong className="font-medium text-foreground">{chunks}</strong>,
    kbd: (chunks: ReactNode) => <Kbd className="mx-0.5 align-[1px]">{chunks}</Kbd>,
  };

  return (
    <>
      <div className="print:hidden">
        {/* The header reads the URL to keep it when switching language, so it renders in the browser. */}
        <Suspense fallback={<HeaderSkeleton />}>
          <PageHeader view="guide" />
        </Suspense>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border print:overflow-visible print:border-t-0">
        <div className="mx-auto flex max-w-[1080px] gap-12 px-4 py-8 lg:px-8 print:block print:max-w-none print:p-12">
          <nav aria-labelledby="guide-contents" className="sticky top-8 hidden h-fit w-[190px] shrink-0 xl:block print:hidden">
            <h2 id="guide-contents" className="type-eyebrow text-muted-foreground">
              {t("contents")}
            </h2>
            <ol className="mt-4 flex flex-col gap-0.5">
              {SECTIONS.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="type-caption flex gap-2.5 rounded-md px-2 py-1.5 leading-snug text-soft outline-none transition-colors hover:bg-white/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white/25"
                  >
                    <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                    {t(`sections.${section.id}.title`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 max-w-[760px] flex-1 print:max-w-none">
            <header className="flex flex-col gap-4 border-b border-border pb-10 print:border-b-0">
              <h2 className="text-[30px] leading-tight font-semibold tracking-tight">{t("title")}</h2>
              <p className="type-body leading-relaxed text-soft">{t("intro")}</p>
              {/* On paper, the first page is a cover: where to try it, and what's inside. */}
              <div className="hidden print:mt-6 print:block">
                <p className="type-body text-soft">
                  {t("liveDemo")}{" "}
                  <a href={`${LIVE_DEMO}/${locale}`} className="text-foreground underline underline-offset-2">
                    {LIVE_DEMO.replace("https://", "")}
                  </a>
                </p>
                <ol className="mt-12 flex flex-col gap-4">
                  {SECTIONS.map((section, i) => (
                    <li key={section.id} className="flex gap-4">
                      <span className="type-eyebrow w-8 shrink-0 pt-0.5 text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="type-title block">{t(`sections.${section.id}.title`)}</span>
                        <span className="type-body mt-1.5 block leading-relaxed text-soft">{t(`sections.${section.id}.lead`)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <a href={`/guide/sales-crm-guide-${locale}.pdf`} download className={buttonClasses({ variant: "primary" })}>
                  <Download aria-hidden className="size-3" />
                  {t("download")}
                </a>
                <Link href="/" className={buttonClasses({ variant: "secondary" })}>
                  {t("openApp")}
                </Link>
              </div>
            </header>

            {SECTIONS.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-8 border-b border-border py-12 last:border-b-0 print:break-before-page print:border-b-0 print:pt-14 print:pb-0"
              >
                <p className="type-eyebrow text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <h2 id={`${section.id}-title`} className="mt-3 text-[22px] leading-tight font-semibold tracking-tight">
                  {t(`sections.${section.id}.title`)}
                </h2>
                <p className="type-body mt-3 leading-relaxed text-soft">{t(`sections.${section.id}.lead`)}</p>

                <figure className={section.phone ? "mx-auto mt-7 w-[240px]" : "mt-7"}>
                  {/* Static screenshots: next/image would add nothing but an optimizer to run. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/guide/${locale}/${section.image}.jpg`}
                    alt={t(`sections.${section.id}.alt`)}
                    width={section.phone ? 412 : 1280}
                    height={section.phone ? 915 : 800}
                    loading="lazy"
                    className={section.phone ? "h-auto w-full rounded-[22px] border border-border" : "h-auto w-full rounded-xl border border-border"}
                  />
                </figure>

                <ol className="mt-7 flex flex-col gap-3.5">
                  {STEPS.map((step) => (
                    <li key={step} className="flex gap-3">
                      <span aria-hidden className="type-caption mt-[1px] grid size-5 shrink-0 place-items-center rounded-full bg-muted text-soft tabular-nums">
                        {step}
                      </span>
                      <span className="type-body leading-relaxed text-soft">{t.rich(`sections.${section.id}.steps.${step}`, rich)}</span>
                    </li>
                  ))}
                </ol>

                <p className="mt-7 flex flex-wrap items-center gap-2 print:hidden">
                  <span className="type-caption mr-1 text-muted-foreground">{t("tryIt")}</span>
                  <TryLink href={section.links.a}>{t(`sections.${section.id}.links.a`)}</TryLink>
                  <TryLink href={section.links.b}>{t(`sections.${section.id}.links.b`)}</TryLink>
                </p>
              </section>
            ))}
          </article>
        </div>
      </div>
    </>
  );
}

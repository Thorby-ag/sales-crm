"use client";

import { Mail, Phone, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetSection } from "@/components/ui/sheet";
import { useRouter } from "@/i18n/navigation";
import { companiesByOwner, pipelineSummary } from "@/lib/companies";
import { CURRENT_USER, personByName } from "@/lib/data/people";
import { companyRows } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import { slugify } from "@/lib/text";
import type { CompanyRow } from "@/lib/types";
import { openCompany } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { Money } from "../visuals/money";
import { SegmentedMeter } from "../visuals/segmented-meter";

function AccountItem({ row }: { row: CompanyRow }) {
  const t = useTranslations("profile");
  const closeProfile = useCrm((s) => s.closeProfile);
  return (
    <li>
      <Button
        variant="item"
        size="none"
        className="items-center p-2"
        onClick={() => {
          closeProfile();
          openCompany(row.id);
        }}
      >
        <CompanyLogo logo={row.logo} size={32} />
        <span className="min-w-0 flex-1">
          <span className="type-lead block truncate">{row.name}</span>
          <span className="type-caption mt-1.5 block truncate text-muted-foreground">
            {t("accountMeta", { count: row.openDeals, tags: row.tags.join(", ") })}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <Money value={row.pipelineValue} className="type-lead" />
          <SegmentedMeter value={row.winProbability ?? 0} segments={15} className="h-3 w-[58px] gap-px" segmentClassName="h-2" />
        </span>
      </Button>
    </li>
  );
}

function ProfileContent({ name }: { name: string }) {
  const t = useTranslations();
  const { money } = useFormat();
  const router = useRouter();
  const companies = useCrm((s) => s.companies);
  const deals = useCrm((s) => s.deals);
  const closeProfile = useCrm((s) => s.closeProfile);

  const isMe = name === CURRENT_USER.name;
  const person = personByName(name);
  const accounts = useMemo(() => {
    const rows = companyRows(companies, deals);
    return isMe ? rows.sort((a, b) => b.pipelineValue - a.pipelineValue) : companiesByOwner(rows, name);
  }, [companies, deals, isMe, name]);
  const summary = pipelineSummary(accounts);
  const stats = [
    { label: t("profile.statAccounts"), value: String(summary.accounts) },
    { label: t("profile.statOpenDeals"), value: String(summary.openDeals) },
    { label: t("profile.statPipeline"), value: money(summary.pipeline) },
    { label: t("profile.statAvgWin"), value: `${summary.avgWin}%` },
  ];

  const showAccounts = () => {
    closeProfile();
    router.push(isMe ? "/" : { pathname: "/", query: { owner: slugify(name) } });
  };

  return (
    <>
      <SheetHeader icon={UserRound} title={isMe ? t("profile.mine") : t("profile.owner")} description={t("profile.description")} />
      <SheetBody>
        <section className="flex items-center gap-3 border-b px-5 py-5">
          <Avatar src={person.avatar} size={50} />
          <div className="min-w-0">
            <h3 className="type-title truncate">{person.name}</h3>
            <p className="type-caption mt-2 text-soft">
              {person.role} · {t(`teams.${person.team}`)}
            </p>
          </div>
        </section>
        <SheetSection title={t("profile.contact")}>
          <div className="type-lead flex flex-wrap items-center gap-x-4 gap-y-3">
            <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 hover:text-soft">
              <Mail aria-hidden className="size-3 text-soft" />
              {person.email}
            </a>
            <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-soft">
              <Phone aria-hidden className="size-3 text-soft" />
              {person.phone}
            </a>
          </div>
        </SheetSection>
        <SheetSection title={isMe ? t("profile.teamPipeline") : t("profile.pipeline")}>
          <dl className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-3 rounded-lg border border-line-strong p-3">
                <dt className="type-caption text-soft">{stat.label}</dt>
                <dd className="type-lead tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </SheetSection>
        <SheetSection title={isMe ? t("profile.teamAccounts") : t("profile.accounts")} className="gap-2">
          {accounts.length > 0 ? (
            <ul className="-mx-2 flex flex-col">
              {accounts.map((row) => (
                <AccountItem key={row.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="type-caption text-muted-foreground">{t("profile.noAccounts")}</p>
          )}
        </SheetSection>
      </SheetBody>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="subtle">{t("common.close")}</Button>
        </SheetClose>
        <Button variant="primary" onClick={showAccounts}>
          {isMe ? t("profile.showAll") : t("profile.filterByOwner")}
        </Button>
      </SheetFooter>
    </>
  );
}

export function ProfileSheet() {
  const name = useCrm((s) => s.profileName);
  const open = useCrm((s) => s.profileOpen);
  const closeProfile = useCrm((s) => s.closeProfile);
  return (
    <Sheet open={open && name !== null} onOpenChange={(next) => !next && closeProfile()}>
      <SheetContent side="right" className="sm:w-[480px] sm:max-w-[480px]">
        {name && <ProfileContent key={name} name={name} />}
      </SheetContent>
    </Sheet>
  );
}

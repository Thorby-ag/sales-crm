"use client";

import { Command } from "cmdk";
import { ArrowDown, ArrowUp, Calendar, CornerDownLeft, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useMemo, useState } from "react";
import { Kbd } from "@/components/ui/chips";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { searchCompanies } from "@/lib/companies";
import { personByName } from "@/lib/data/people";
import { companyRows } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import { openCompany } from "../url-state";
import { useFormat } from "../use-format";
import { Avatar } from "../visuals/avatar";
import { CompanyLogo } from "../visuals/company-logo";
import { Money } from "../visuals/money";
import { SegmentedMeter } from "../visuals/segmented-meter";
import { TagList } from "../visuals/tag-list";

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_minmax(0,1.25fr)_104px_118px_160px]";

function SearchBody() {
  const t = useTranslations();
  const { date } = useFormat();
  const [query, setQuery] = useState("");
  const companies = useCrm((s) => s.companies);
  const deals = useCrm((s) => s.deals);
  const setSearchOpen = useCrm((s) => s.setSearchOpen);
  const results = useMemo(() => searchCompanies(companyRows(companies, deals), query), [companies, deals, query]);

  return (
    <Command shouldFilter={false} loop label={t("search.label")} className="flex min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4">
        <Search aria-hidden className="size-3.5 shrink-0 text-soft" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={t("search.placeholder")}
          className="type-lead h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div aria-hidden className={`${COLUMNS} type-caption shrink-0 border-b px-4 py-3 text-muted-foreground`}>
        <span>{t("search.company")}</span>
        <span className="max-md:hidden">{t("search.segmentStage")}</span>
        <span className="max-md:hidden">{t("search.owner")}</span>
        <span className="text-right max-md:hidden">{t("search.pipeline")}</span>
        <span className="text-right">{t("search.win")}</span>
        <span className="max-md:hidden">{t("search.lastInteraction")}</span>
      </div>
      <Command.List className="max-h-[min(400px,55dvh)] overflow-y-auto overscroll-contain p-1.5">
        <Command.Empty className="type-caption px-3 py-10 text-center text-muted-foreground">
          {t("search.empty", { query: query.trim() })}
        </Command.Empty>
        {results.map((row) => {
          const owner = personByName(row.owner);
          return (
            <Command.Item
              key={row.id}
              value={row.id}
              onSelect={() => {
                setSearchOpen(false);
                openCompany(row.id);
              }}
              className={`${COLUMNS} type-lead h-11 cursor-pointer rounded-lg px-2.5 outline-none data-[selected=true]:bg-white/6`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <CompanyLogo logo={row.logo} size={24} />
                <span className="truncate">{row.name}</span>
              </span>
              <TagList tags={row.tags} className="max-md:hidden" />
              <span className="flex min-w-0 items-center gap-2 max-md:hidden">
                <Avatar src={owner.avatar} size={20} />
                <span className="truncate">{owner.name}</span>
              </span>
              <span className="text-right max-md:hidden">
                <Money value={row.pipelineValue} />
              </span>
              <span className="flex items-center justify-end gap-2.5">
                <SegmentedMeter value={row.winProbability ?? 0} segments={13} className="w-[60px]" />
                <span className="w-9 text-right tabular-nums">{row.winProbability === null ? t("common.noValue") : `${row.winProbability}%`}</span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5 max-md:hidden">
                <Calendar aria-hidden className="size-3.5 shrink-0" />
                <span className="tabular-nums">{date(row.lastInteraction.date)}</span>
                <span aria-hidden className="mx-0.5 h-2 w-px bg-white/15" />
                <span className="truncate">{t(`interactions.${row.lastInteraction.type}`)}</span>
              </span>
            </Command.Item>
          );
        })}
      </Command.List>
      <div className="type-caption flex h-10 shrink-0 items-center gap-2 border-t px-4 text-muted-foreground">
        <Kbd>
          <ArrowUp className="size-3" aria-hidden />
          <span className="sr-only">{t("search.up")}</span>
        </Kbd>
        <Kbd>
          <ArrowDown className="size-3" aria-hidden />
          <span className="sr-only">{t("search.down")}</span>
        </Kbd>
        <span className="mr-2">{t("search.navigate")}</span>
        <Kbd>
          <CornerDownLeft className="size-3" aria-hidden />
          <span className="sr-only">{t("search.enter")}</span>
        </Kbd>
        <span>{t("search.open")}</span>
      </div>
    </Command>
  );
}

export function SearchDialog() {
  const t = useTranslations("search");
  const open = useCrm((s) => s.searchOpen);
  const setOpen = useCrm((s) => s.setSearchOpen);
  // Every opening mounts a fresh dialog: empty query and focused input, even when it reopens
  // while the previous one is still animating out. The key only changes on open, so closing
  // keeps its animation.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }

  return (
    <Dialog key={session} open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="top-[12dvh] max-w-[1000px] translate-y-0 rounded-xl">
        <DialogPrimitive.Title className="sr-only">{t("title")}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{t("description")}</DialogPrimitive.Description>
        <SearchBody />
      </DialogContent>
    </Dialog>
  );
}

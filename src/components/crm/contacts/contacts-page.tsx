"use client";

import { Ellipsis, Plus, RotateCcw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TEXT_LINK } from "@/components/ui/surface";
import { filterContacts } from "@/lib/contacts";
import { useCrm } from "@/lib/store";
import { BUYING_ROLES, type BuyingRole, type Company, type Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ALL, FilterMenu } from "../filter-menu";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { openCompany, openContact, useContactFilters } from "../url-state";
import { CompanyLogo } from "../visuals/company-logo";
import { ContactAvatar } from "../visuals/contact-avatar";
import { useDeleteContact } from "./contact-actions";
import { RoleTag } from "./role-tag";

const CELL = "h-[52px] border-b border-border px-2.5 type-lead whitespace-nowrap transition-colors duration-100 group-hover:bg-[#1a1a1a]";
const HEAD = "h-10 border-b border-border bg-background px-2.5 text-left type-caption font-normal whitespace-nowrap text-muted-foreground";

const stop = (event: MouseEvent) => event.stopPropagation();

function ContactRow({ contact, company }: { contact: Contact; company: Company | undefined }) {
  const t = useTranslations();
  const openContactDialog = useCrm((s) => s.openContactDialog);
  const deleteContact = useDeleteContact();
  const open = () => openContact(contact.id);

  return (
    <tr className="group cursor-pointer" onClick={open}>
      <td className={cn(CELL, "pl-4")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <ContactAvatar name={contact.name} size={28} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                open();
              }}
              className={TEXT_LINK}
            >
              {contact.name}
            </button>
            <p className="type-caption mt-1.5 truncate text-muted-foreground">{contact.title}</p>
          </div>
        </div>
      </td>
      <td className={CELL}>
        {company && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              openCompany(company.id);
            }}
            className="-ml-1 flex max-w-full items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none transition-colors hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <CompanyLogo logo={company.logo} size={20} />
            <span className="truncate">{company.name}</span>
          </button>
        )}
      </td>
      <td className={CELL}>
        <RoleTag role={contact.role} />
      </td>
      <td className={cn(CELL, "max-md:hidden")}>
        <a href={`mailto:${contact.email}`} onClick={stop} className="text-soft hover:text-foreground">
          {contact.email}
        </a>
      </td>
      <td className={cn(CELL, "text-soft tabular-nums max-lg:hidden")}>{contact.phone || t("common.noValue")}</td>
      <td className={cn(CELL, "pr-3 text-right")} onClick={stop}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-soft" aria-label={t("contacts.actions", { name: contact.name })}>
              <Ellipsis aria-hidden className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onSelect={() => openContactDialog({ contactId: contact.id })}>{t("contacts.edit")}</DropdownMenuItem>
            {company && <DropdownMenuItem onSelect={() => openCompany(company.id)}>{t("contacts.openCompany", { name: company.name })}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => deleteContact(contact)} className="text-danger data-[highlighted]:text-danger">
              {t("contacts.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function ContactsView() {
  const t = useTranslations();
  const { filters, setFilters, resetFilters } = useContactFilters();
  const contacts = useCrm((s) => s.contacts);
  const companies = useCrm((s) => s.companies);
  const openContactDialog = useCrm((s) => s.openContactDialog);
  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const companyName = useCallback((id: string) => byId.get(id)?.name ?? "", [byId]);
  const visible = useMemo(() => filterContacts(contacts, filters, companyName), [contacts, filters, companyName]);
  // The box keeps what's typed; the URL gets the same text, so the view can be shared.
  const [text, setText] = useState(filters.query);
  const active = filters.query.trim() !== "" || filters.role !== null;
  const reset = () => {
    setText("");
    resetFilters();
  };

  return (
    <>
      <PageHeader view="contacts" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-soft" />
            <input
              type="search"
              aria-label={t("contacts.searchLabel")}
              placeholder={t("contacts.searchPlaceholder")}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFilters({ query: e.target.value });
              }}
              className="type-caption h-[30px] w-[min(280px,calc(100vw-32px))] rounded-full bg-secondary pr-3 pl-8 text-foreground shadow-raised outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/25"
            />
          </div>
          <FilterMenu
            label={t("contacts.role")}
            title={t("contacts.roleTitle")}
            groups={[
              {
                options: [{ value: ALL, label: t("contacts.allRoles") }, ...BUYING_ROLES.map((role) => ({ value: role, label: t(`buyingRoles.${role}`) }))],
              },
            ]}
            value={filters.role ?? ALL}
            onChange={(v) => setFilters({ role: v === ALL ? null : (v as BuyingRole) })}
          />
          {active && (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden className="size-3" />
              {t("common.reset")}
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p role="status" className="type-caption text-muted-foreground tabular-nums">
            {t("contacts.count", { count: visible.length })}
          </p>
          <Button variant="primary" onClick={() => openContactDialog({})}>
            <Plus aria-hidden className="size-3" />
            {t("contacts.new")}
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-full min-w-[600px] border-separate border-spacing-0">
          <caption className="sr-only">{t("contacts.caption")}</caption>
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col" className={cn(HEAD, "pl-4")}>
                {t("contacts.name")}
              </th>
              <th scope="col" className={HEAD}>
                {t("contacts.company")}
              </th>
              <th scope="col" className={HEAD}>
                {t("contacts.role")}
              </th>
              <th scope="col" className={cn(HEAD, "max-md:hidden")}>
                {t("contacts.email")}
              </th>
              <th scope="col" className={cn(HEAD, "max-lg:hidden")}>
                {t("contacts.phone")}
              </th>
              <th scope="col" className={cn(HEAD, "pr-3 text-right")}>
                <span className="sr-only">{t("table.action")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((contact) => (
              <ContactRow key={contact.id} contact={contact} company={byId.get(contact.companyId)} />
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="h-[140px] border-b border-border">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <p className="type-caption text-muted-foreground">{t("contacts.empty")}</p>
                    {active && (
                      <Button variant="link" size="none" className="type-caption" onClick={reset}>
                        {t("table.resetFilters")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ContactsPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <ContactsView /> : <ContentSkeleton variant="table" tabs={false} />;
}

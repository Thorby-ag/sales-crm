"use client";

import { CalendarPlus, Mail, Phone, Send, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetSection } from "@/components/ui/sheet";
import { TEXT_LINK } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { doneActivities, plannedGroups } from "@/lib/activities";
import { contactsAt } from "@/lib/contacts";
import { isOpen } from "@/lib/deals";
import { enrollmentProgress } from "@/lib/sequences";
import { useCrm } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityList } from "../activities/activity-bits";
import { useDeleteContact } from "../contacts/contact-actions";
import { RoleTag } from "../contacts/role-tag";
import { EnrollmentStatusTag } from "../sequences/sequence-bits";
import { StageTag } from "../deals/deal-actions";
import { closeContact, openCompany, openContact, openDeal, useOpenContactId } from "../url-state";
import { useFormat } from "../use-format";
import { ContactAvatar } from "../visuals/contact-avatar";
import { Money } from "../visuals/money";


/** The sequences a contact is in, and a menu to add them to another. */
function ContactSequences({ contact }: { contact: Contact }) {
  const t = useTranslations();
  const sequences = useCrm((s) => s.sequences);
  const allEnrollments = useCrm((s) => s.enrollments);
  const today = useCrm((s) => s.today);
  const enrollContacts = useCrm((s) => s.enrollContacts);
  const enrollments = allEnrollments.filter((e) => e.contactId === contact.id);
  const inside = new Set(enrollments.map((e) => e.sequenceId));
  const available = sequences.filter((s) => s.active && !inside.has(s.id));

  return (
    <SheetSection
      title={t("contactSheet.sequences")}
      className="gap-2"
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" disabled={available.length === 0}>
              <Send aria-hidden className="size-3" />
              {t("contactSheet.addToSequence")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuLabel>{t("contactSheet.addToSequence")}</DropdownMenuLabel>
            {available.map((sequence) => (
              <DropdownMenuItem
                key={sequence.id}
                onSelect={() => {
                  enrollContacts(sequence.id, [contact.id]);
                  toast.success(t("contactSheet.enrolledIn", { name: contact.name, sequence: sequence.name }));
                }}
              >
                {sequence.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {enrollments.length > 0 ? (
        <ul className="-mx-2 flex flex-col">
          {enrollments.map((enrollment) => {
            const sequence = sequences.find((s) => s.id === enrollment.sequenceId);
            if (!sequence) return null;
            return (
              <li key={enrollment.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                <Link href={{ pathname: "/sequences", query: { sequence: sequence.id } }} className={cn(TEXT_LINK, "type-lead min-w-0 flex-1")}>
                  {sequence.name}
                </Link>
                <EnrollmentStatusTag status={enrollmentProgress(sequence, enrollment, today).status} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="type-caption text-muted-foreground">{t("contactSheet.noSequences")}</p>
      )}
    </SheetSection>
  );
}

function ContactContent({ contact }: { contact: Contact }) {
  const t = useTranslations();
  const { date } = useFormat();
  const company = useCrm((s) => s.companies.find((c) => c.id === contact.companyId));
  const contacts = useCrm((s) => s.contacts);
  const allDeals = useCrm((s) => s.deals);
  const openContactDialog = useCrm((s) => s.openContactDialog);
  const openActivityDialog = useCrm((s) => s.openActivityDialog);
  const allActivities = useCrm((s) => s.activities);
  const today = useCrm((s) => s.today);
  const deleteContact = useDeleteContact();
  const activities = useMemo(() => {
    const own = allActivities.filter((a) => a.contactId === contact.id);
    const { overdue, today: due, upcoming } = plannedGroups(own, today);
    return [...overdue, ...due, ...upcoming, ...doneActivities(own).slice(0, 5)];
  }, [allActivities, contact.id, today]);
  const colleagues = useMemo(() => contactsAt(contacts, contact.companyId).filter((c) => c.id !== contact.id), [contacts, contact]);
  const deals = useMemo(
    () => allDeals.filter((d) => d.companyId === contact.companyId && isOpen(d)).sort((a, b) => a.closeDate.localeCompare(b.closeDate)),
    [allDeals, contact.companyId],
  );
  const companyName = company?.name ?? "";

  return (
    <>
      <SheetHeader icon={UserRound} title={t("contactSheet.title")} description={t("contactSheet.description")} />
      <SheetBody>
        <section className="flex items-center gap-3.5 border-b px-5 py-5">
          <ContactAvatar name={contact.name} size={50} />
          <div className="min-w-0 flex-1">
            <h3 className="type-title truncate">{contact.name}</h3>
            <p className="type-caption mt-2 flex min-w-0 items-center gap-1.5 text-soft">
              <span className="truncate">{contact.title}</span>
              {company && (
                <>
                  <span aria-hidden className="text-faint">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => openCompany(company.id)}
                    className="shrink-0 underline decoration-white/30 underline-offset-2 outline-none hover:text-foreground focus-visible:text-foreground"
                  >
                    {company.name}
                  </button>
                </>
              )}
            </p>
          </div>
          <RoleTag role={contact.role} />
        </section>

        <SheetSection title={t("contactSheet.contact")}>
          <div className="type-lead flex flex-wrap items-center gap-x-4 gap-y-3">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-soft">
              <Mail aria-hidden className="size-3 text-soft" />
              {contact.email}
            </a>
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-soft">
                <Phone aria-hidden className="size-3 text-soft" />
                {contact.phone}
              </a>
            )}
          </div>
        </SheetSection>

        <SheetSection
          title={t("contactSheet.activity")}
          className="gap-2"
          action={
            <Button variant="secondary" onClick={() => openActivityDialog({ companyId: contact.companyId, contactId: contact.id })}>
              <CalendarPlus aria-hidden className="size-3" />
              {t("detail.planActivity")}
            </Button>
          }
        >
          <ActivityList activities={activities} empty={t("contactSheet.noActivity")} />
        </SheetSection>

        <ContactSequences contact={contact} />

        <SheetSection title={t("contactSheet.deals", { company: companyName })} className="gap-2">
          {deals.length > 0 ? (
            <ul className="-mx-2 flex flex-col">
              {deals.map((deal) => (
                <li key={deal.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <StageTag stage={deal.stage} className="w-[104px] justify-center" />
                  <button type="button" onClick={() => openDeal(deal.id)} className={cn(TEXT_LINK, "type-lead min-w-0 flex-1")}>
                    {deal.name}
                  </button>
                  <span className="type-caption whitespace-nowrap text-muted-foreground">{t("deals.closes", { date: date(deal.closeDate) })}</span>
                  <Money value={deal.amount} className="type-lead w-[92px] text-right" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-caption text-muted-foreground">{t("contactSheet.noDeals")}</p>
          )}
        </SheetSection>

        <SheetSection title={t("contactSheet.colleagues", { company: companyName })} className="gap-2">
          {colleagues.length > 0 ? (
            <ul className="-mx-2 flex flex-col">
              {colleagues.map((colleague) => (
                <li key={colleague.id}>
                  <Button variant="item" size="none" className="items-center p-2" onClick={() => openContact(colleague.id)}>
                    <ContactAvatar name={colleague.name} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="type-lead block truncate">{colleague.name}</span>
                      <span className="type-caption mt-1.5 block truncate text-muted-foreground">{colleague.title}</span>
                    </span>
                    <RoleTag role={colleague.role} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-caption text-muted-foreground">{t("contactSheet.noColleagues")}</p>
          )}
        </SheetSection>
      </SheetBody>
      <SheetFooter>
        <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => deleteContact(contact)}>
          {t("contacts.delete")}
        </Button>
        <div className="flex items-center gap-2">
          <SheetClose asChild>
            <Button variant="subtle">{t("common.close")}</Button>
          </SheetClose>
          <Button variant="primary" onClick={() => openContactDialog({ contactId: contact.id })}>
            {t("contacts.edit")}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

export function ContactSheet() {
  const id = useOpenContactId();
  const contact = useCrm((s) => (id ? s.contacts.find((c) => c.id === id) : undefined));
  // Keep showing the last contact while the sheet animates out.
  const [shown, setShown] = useState(contact);
  if (contact && contact !== shown) setShown(contact);

  return (
    <Sheet open={contact !== undefined} onOpenChange={(next) => !next && closeContact()}>
      <SheetContent side="right" className="sm:w-[520px] sm:max-w-[520px]">
        {shown && <ContactContent key={shown.id} contact={shown} />}
      </SheetContent>
    </Sheet>
  );
}

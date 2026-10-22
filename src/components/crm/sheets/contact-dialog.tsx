"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  contactForm,
  createContact,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactForm,
} from "@/lib/contacts";
import { useCrm } from "@/lib/store";
import { BUYING_ROLES, type BuyingRole } from "@/lib/types";
import { openContact } from "../url-state";
import { CompanyLogo } from "../visuals/company-logo";

const FIELD_ORDER: ContactField[] = ["name", "companyId", "email", "phone"];
const FIELD_IDS: Record<ContactField, string> = {
  name: "contact-name",
  companyId: "contact-company",
  email: "contact-email",
  phone: "contact-phone",
};

function errorProps(field: ContactField, errors: ContactErrors) {
  return errors[field] ? { "aria-invalid": true, "aria-describedby": `${FIELD_IDS[field]}-error` } : {};
}

function ContactFormBody({ contactId, companyId }: { contactId: string | null; companyId: string | null }) {
  const t = useTranslations();
  const contacts = useCrm((s) => s.contacts);
  const companies = useCrm((s) => s.companies);
  const saveContact = useCrm((s) => s.saveContact);
  const close = useCrm((s) => s.closeContactDialog);
  const [editing] = useState(() => (contactId ? contacts.find((c) => c.id === contactId) : undefined));
  const [form, setForm] = useState<ContactForm>(() =>
    editing ? contactForm(editing) : { name: "", title: "", companyId: companyId ?? "", role: "champion", email: "", phone: "" },
  );
  const [errors, setErrors] = useState<ContactErrors>({});
  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));

  const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  };
  const errorText = (field: ContactField) => {
    const code = errors[field];
    return code ? t(`contactDialog.errors.${code}`) : undefined;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateContact(form, new Set(companies.map((c) => c.id)));
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((field) => result.errors[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    const company = companies.find((c) => c.id === result.value.companyId)?.name ?? "";
    if (editing) {
      saveContact({ ...editing, ...result.value });
      toast.success(t("contactDialog.saved", { name: result.value.name }));
    } else {
      const contact = createContact(result.value, contacts);
      saveContact(contact);
      toast.success(t("contactDialog.created", { name: contact.name, company }), {
        action: { label: t("newCompany.view"), onClick: () => openContact(contact.id) },
      });
    }
    close();
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-6 pt-6 pr-14 pb-5">
        <DialogTitle>{editing ? t("contactDialog.editTitle") : t("contactDialog.newTitle")}</DialogTitle>
        <DialogDescription className="mt-2">{t("contactDialog.description")}</DialogDescription>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("contactDialog.name")} htmlFor={FIELD_IDS.name} required error={errorText("name")}>
            <Input
              id={FIELD_IDS.name}
              autoFocus
              autoComplete="off"
              maxLength={80}
              placeholder={t("contactDialog.namePlaceholder")}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              {...errorProps("name", errors)}
            />
          </Field>
          <Field label={t("contactDialog.jobTitle")} htmlFor="contact-title">
            <Input
              id="contact-title"
              autoComplete="off"
              maxLength={80}
              placeholder={t("contactDialog.jobTitlePlaceholder")}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("contactDialog.company")} htmlFor={FIELD_IDS.companyId} required error={errorText("companyId")}>
            <Select value={form.companyId} onValueChange={(v) => update("companyId", v)}>
              <SelectTrigger id={FIELD_IDS.companyId} {...errorProps("companyId", errors)}>
                <SelectValue placeholder={t("contactDialog.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <CompanyLogo logo={company.logo} size={18} />
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("contactDialog.role")} htmlFor="contact-role">
            <Select value={form.role} onValueChange={(v) => update("role", v as BuyingRole)}>
              <SelectTrigger id="contact-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUYING_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`buyingRoles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("contactDialog.email")} htmlFor={FIELD_IDS.email} required error={errorText("email")}>
            <Input
              id={FIELD_IDS.email}
              type="email"
              autoComplete="off"
              placeholder="ana.torres@acme.example"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              {...errorProps("email", errors)}
            />
          </Field>
          <Field label={t("contactDialog.phone")} htmlFor={FIELD_IDS.phone} error={errorText("phone")}>
            <Input
              id={FIELD_IDS.phone}
              type="tel"
              autoComplete="off"
              placeholder="+1 (415) 555-0199"
              className="tabular-nums"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              {...errorProps("phone", errors)}
            />
          </Field>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
        <DialogClose asChild>
          <Button variant="subtle">{t("common.cancel")}</Button>
        </DialogClose>
        <Button type="submit" variant="primary">
          {editing ? t("contactDialog.save") : t("contactDialog.create")}
        </Button>
      </div>
    </form>
  );
}

export function ContactDialog() {
  const target = useCrm((s) => s.contactDialog);
  const close = useCrm((s) => s.closeContactDialog);
  // Keep the last form on screen while the dialog animates out.
  const [shown, setShown] = useState(target);
  if (target && target !== shown) setShown(target);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        {shown && <ContactFormBody key={`${shown.contactId}:${shown.companyId}`} contactId={shown.contactId} companyId={shown.companyId} />}
      </DialogContent>
    </Dialog>
  );
}

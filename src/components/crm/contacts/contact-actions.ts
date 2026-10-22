"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useCrm } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { withUndo } from "../undo";
import { closeContact } from "../url-state";

/** Deletes a contact, with undo. Closes its sheet first so undo doesn't reopen it. */
export function useDeleteContact() {
  const t = useTranslations();
  return useCallback(
    (contact: Contact) => {
      closeContact();
      withUndo(t("contacts.deleted", { name: contact.name }), t("common.undo"), () => useCrm.getState().deleteContact(contact.id));
    },
    [t],
  );
}

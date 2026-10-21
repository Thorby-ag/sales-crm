"use client";

import { Trash2, Upload, UserCog, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OWNER_NAMES, personByName } from "@/lib/data/people";
import { useCrm } from "@/lib/store";
import type { CompanyRow } from "@/lib/types";
import { withUndo } from "../undo";
import { Avatar } from "../visuals/avatar";
import { useExportCompanies } from "./use-export";

/** Floating toolbar for the selected rows. Changes can be undone from the toast. */
export function BulkBar({ rows }: { rows: CompanyRow[] }) {
  const t = useTranslations();
  const selectedIds = useCrm((s) => s.selectedIds);
  const setSelected = useCrm((s) => s.setSelected);
  const exportCompanies = useExportCompanies();

  const selected = rows.filter((r) => selectedIds.includes(r.id));
  if (selected.length === 0) return null;
  const ids = selected.map((r) => r.id);
  const count = ids.length;

  const assign = (owner: string) =>
    withUndo(t("bulk.assigned", { count, owner }), t("common.undo"), () => useCrm.getState().assignOwner(ids, owner));
  const remove = () => withUndo(t("bulk.deleted", { count }), t("common.undo"), () => useCrm.getState().deleteCompanies(ids));

  return (
    <div
      role="toolbar"
      aria-label={t("bulk.label")}
      className="absolute bottom-[54px] left-1/2 z-30 flex max-w-[calc(100%-24px)] -translate-x-1/2 animate-pop-in items-center gap-0.5 rounded-full border border-[#303030] bg-[#1c1c1c] p-1 pl-4 shadow-overlay max-sm:bottom-[94px]"
    >
      <span className="type-caption mr-2 whitespace-nowrap tabular-nums">{t("bulk.selected", { count })}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-foreground">
            <UserCog aria-hidden className="size-3.5" />
            <span className="max-sm:sr-only">{t("bulk.assignOwner")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-[200px]">
          <DropdownMenuLabel>{t("bulk.assignOwner")}</DropdownMenuLabel>
          {OWNER_NAMES.map((name) => (
            <DropdownMenuItem key={name} onSelect={() => assign(name)} className="type-lead h-8 text-foreground">
              <Avatar src={personByName(name).avatar} size={18} />
              {name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" className="text-foreground" onClick={() => exportCompanies(selected)}>
        <Upload aria-hidden className="size-3.5" />
        <span className="max-sm:sr-only">{t("bulk.export")}</span>
      </Button>
      <Button variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={remove}>
        <Trash2 aria-hidden className="size-3.5" />
        <span className="max-sm:sr-only">{t("bulk.delete")}</span>
      </Button>
      <Button variant="ghost" size="icon" className="text-foreground" aria-label={t("bulk.clear")} onClick={() => setSelected([])}>
        <X aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}

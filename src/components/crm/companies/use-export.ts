"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { companiesToCsv } from "@/lib/csv";
import { useCrm } from "@/lib/store";
import type { CompanyRow } from "@/lib/types";

function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Downloads rows as CSV with headers and labels in the active language. */
export function useExportCompanies(): (rows: readonly CompanyRow[]) => void {
  const t = useTranslations();
  const today = useCrm((s) => s.today);
  return useCallback(
    (rows) => {
      if (rows.length === 0) {
        toast(t("export.nothing"));
        return;
      }
      const h = (key: "company" | "segmentStage" | "owner" | "region" | "openDeals" | "pipelineValue" | "winProbability" | "lastInteractionDate" | "lastInteraction") =>
        t(`export.headers.${key}`);
      const csv = companiesToCsv(rows, {
        headers: [h("company"), h("segmentStage"), h("owner"), h("region"), h("openDeals"), h("pipelineValue"), h("winProbability"), h("lastInteractionDate"), h("lastInteraction")],
        region: (row) => t(`regions.${row.region}`),
        interaction: (row) => t(`interactions.${row.lastInteraction.type}`),
      });
      downloadFile(`${t("export.filename")}-${today}.csv`, csv, "text/csv;charset=utf-8");
      toast.success(t("export.done", { count: rows.length }));
    },
    [t, today],
  );
}

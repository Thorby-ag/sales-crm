import type { CompanyRow } from "./types";

type Cell = string | number;

function escapeCell(cell: Cell): string {
  if (typeof cell === "number") return String(cell);
  // Neutralize spreadsheet formulas in user-provided text (CSV injection).
  const text = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly (readonly Cell[])[]): string {
  // The BOM makes Excel open the file as UTF-8.
  return "﻿" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export interface CompanyCsvLabels {
  headers: [string, string, string, string, string, string, string, string, string];
  region: (row: CompanyRow) => string;
  interaction: (row: CompanyRow) => string;
}

/** Values stay machine-friendly (plain numbers, ISO dates); headers and labels come translated. */
export function companiesToCsv(rows: readonly CompanyRow[], labels: CompanyCsvLabels): string {
  return toCsv([
    labels.headers,
    ...rows.map((row) => [
      row.name,
      row.tags.join("; "),
      row.owner,
      labels.region(row),
      row.openDeals,
      row.pipelineValue,
      row.winProbability ?? "",
      row.lastInteraction.date,
      labels.interaction(row),
    ]),
  ]);
}

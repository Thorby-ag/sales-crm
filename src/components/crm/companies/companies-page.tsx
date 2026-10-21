"use client";

import { useMemo } from "react";
import { filterCompanies } from "@/lib/companies";
import { teamOf } from "@/lib/data/people";
import { companyRows } from "@/lib/deals";
import { useCrm } from "@/lib/store";
import { ContentSkeleton } from "../shell/app-skeleton";
import { PageHeader } from "../shell/page-header";
import { useCompanyFilters } from "../url-state";
import { BulkBar } from "./bulk-bar";
import { CompaniesFooter } from "./companies-footer";
import { CompaniesTable } from "./companies-table";
import { CompaniesToolbar } from "./companies-toolbar";

function CompaniesView() {
  const { filters, setFilters, resetFilters } = useCompanyFilters();
  const companies = useCrm((s) => s.companies);
  const deals = useCrm((s) => s.deals);
  const today = useCrm((s) => s.today);
  const rows = useMemo(() => companyRows(companies, deals), [companies, deals]);
  const visible = useMemo(() => filterCompanies(rows, filters, today, teamOf), [rows, filters, today]);

  return (
    <>
      <PageHeader view="companies" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <CompaniesToolbar visible={visible} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />
        <CompaniesTable visible={visible} sortBy={filters.sortBy} onSort={(sortBy) => setFilters({ sortBy })} onReset={resetFilters} />
        <CompaniesFooter visible={visible} />
        <BulkBar rows={rows} />
      </div>
    </>
  );
}

export function CompaniesPage() {
  const hydrated = useCrm((s) => s.hydrated);
  return hydrated ? <CompaniesView /> : <ContentSkeleton variant="table" />;
}

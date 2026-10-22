import type { Company, CompanyRow, Contact, Deal } from "../types";

export const TODAY = "2026-10-16";

export function company(overrides: Partial<Company> & Pick<Company, "id">): Company {
  return {
    name: overrides.id,
    tags: ["Enterprise"],
    owner: "Ada",
    region: "emea",
    trend: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    lastInteraction: { date: "2026-10-10", type: "demo" },
    logo: { kind: "mark", mark: "orbit", color: "#fff" },
    ...overrides,
  };
}

export function row(overrides: Partial<CompanyRow> & Pick<CompanyRow, "id">): CompanyRow {
  return { ...company(overrides), openDeals: 1, pipelineValue: 1000, winProbability: 50, ...overrides };
}

export function contact(overrides: Partial<Contact> & Pick<Contact, "id">): Contact {
  return {
    companyId: "a",
    name: overrides.id,
    title: "Head of Operations",
    email: `${overrides.id}@a.example`,
    phone: "",
    role: "champion",
    ...overrides,
  };
}

export function deal(overrides: Partial<Deal> & Pick<Deal, "id">): Deal {
  return {
    companyId: "a",
    name: overrides.id,
    stage: "evaluation",
    amount: 100,
    probability: 50,
    closeDate: "2026-11-01",
    owner: "Ada",
    ...overrides,
  };
}

import { seedActivities } from "./activities";
import type { DemoRecords } from "./companies";
import { seedContacts } from "./contacts";
import { COMPANY_SEEDS } from "./data/companies";
import { seedDealsFor } from "./deals";
import { addDays } from "./format";
import type { Company } from "./types";

/** Fresh demo data with every date relative to `today`. */
export function seedDemo(today: string): DemoRecords {
  const companies: Company[] = COMPANY_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    tags: seed.tags,
    owner: seed.owner,
    region: seed.region,
    trend: seed.trend,
    lastInteraction: { date: addDays(today, -seed.lastInteraction.daysAgo), type: seed.lastInteraction.type },
    logo: seed.logo,
  }));
  const deals = COMPANY_SEEDS.flatMap((seed) => seedDealsFor(seed, today));
  const contacts = seedContacts();
  return { companies, deals, contacts, activities: seedActivities(companies, deals, contacts, today) };
}

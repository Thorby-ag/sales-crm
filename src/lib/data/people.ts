import { slugify } from "../text";
import type { Person, Team } from "../types";
import team from "./team.json";

// Avatars in /public/avatars are generated from these names: `npm run avatars`.

function person(name: string, role: string, personTeam: Team, index: number, quota: number): Person {
  return {
    name,
    role,
    team: personTeam,
    email: `${slugify(name).replace("-", ".")}@salescrm.example`,
    // 555-0100…0199 is reserved for fictional numbers.
    phone: `+1 (415) 555-01${String(index + 10).padStart(2, "0")}`,
    avatar: `/avatars/${slugify(name)}.svg`,
    quota,
  };
}

export const OWNERS: Person[] = team.owners.map((owner, i) =>
  person(owner.name, i % 3 === 0 ? "Senior Account Executive" : "Account Executive", owner.team as Team, i, owner.quota),
);

export const CURRENT_USER: Person = person(
  team.currentUser,
  "Head of Sales",
  "strategic",
  -10,
  OWNERS.reduce((sum, owner) => sum + owner.quota, 0),
);

const PEOPLE = new Map([...OWNERS, CURRENT_USER].map((p) => [p.name, p]));

export function personByName(name: string): Person {
  return PEOPLE.get(name) ?? OWNERS[0]!;
}

export function teamOf(owner: string): Team | undefined {
  return PEOPLE.get(owner)?.team;
}

/** Owner names sorted alphabetically, e.g. for filter menus. */
export const OWNER_NAMES = OWNERS.map((o) => o.name).sort((a, b) => a.localeCompare(b));

export const SCORE_CARD_REVIEWERS = [
  { name: "Emma Lindqvist", updatedMinutesAgo: 120 },
  { name: "Kenji Mori", updatedMinutesAgo: 1440 },
  { name: "Aisha Bello", updatedMinutesAgo: 4320 },
];

import type { CrmNotification } from "../types";

/** Messages are translated per kind (see notifications.messages in src/messages). */
export const NOTIFICATIONS: CrmNotification[] = [
  { id: "n1", kind: "mention", actor: "Mateo Alvarez", companyId: "halcyon-air", quoteKey: "n1", minutesAgo: 2, unread: true },
  { id: "n2", kind: "stage", actor: "Sofia Marin", companyId: "maison-vale", params: { stage: "Renewal" }, minutesAgo: 18, unread: true },
  { id: "n3", kind: "winDrop", companyId: "cobaltix", params: { value: 23 }, minutesAgo: 60, unread: true },
  { id: "n4", kind: "scoreUpdate", actor: "Lea Fontaine", companyId: "arclight", params: { card: "businessFit" }, minutesAgo: 180, unread: false },
  { id: "n5", kind: "demoLogged", actor: "Kenji Mori", companyId: "quantora", minutesAgo: 1440, unread: false },
  { id: "n6", kind: "pipelineUp", companyId: "northpeak", params: { value: 512_000 }, minutesAgo: 2880, unread: false },
  { id: "n7", kind: "invite", actor: "Zoe Carter", companyId: "ferrolite", minutesAgo: 4320, unread: false },
];

import type { BuyingRole } from "../types";

/**
 * Fictional people at the seeded accounts, by company id: name, job title and buying role.
 * Emails use the reserved .example domain and phone numbers the fictional 555-01xx range.
 */
export const CONTACT_SEEDS: Record<string, [name: string, title: string, role: BuyingRole][]> = {
  lumenfold: [
    ["Priya Raman", "VP of Operations", "decisionMaker"],
    ["Jordan Blake", "Head of Data", "champion"],
    ["Marcus Lee", "IT Security Lead", "influencer"],
  ],
  northpeak: [
    ["Elena Kovacs", "Chief Financial Officer", "decisionMaker"],
    ["Samuel Ortiz", "Director of Sales Operations", "champion"],
    ["Hannah Wright", "Procurement Manager", "blocker"],
  ],
  quantora: [
    ["Wei Chen", "CTO", "decisionMaker"],
    ["Aiko Tanaka", "Product Manager", "champion"],
    ["Ravi Menon", "Engineering Lead", "endUser"],
  ],
  brightwave: [
    ["Charlotte Dubois", "COO", "decisionMaker"],
    ["Lars Eriksen", "Revenue Operations Manager", "champion"],
  ],
  "maison-vale": [
    ["Isabelle Laurent", "Chief Digital Officer", "decisionMaker"],
    ["Matteo Rossi", "Head of CRM", "champion"],
    ["Clara Weber", "Legal Counsel", "blocker"],
    ["Thomas Moreau", "Analytics Lead", "endUser"],
  ],
  cobaltix: [
    ["Pieter de Vries", "Head of IT", "decisionMaker"],
    ["Anna Nowak", "Operations Analyst", "endUser"],
  ],
  "halcyon-air": [
    ["Michael Grant", "SVP of Customer Experience", "decisionMaker"],
    ["Olivia Chen", "Director of Loyalty", "champion"],
    ["Daniel Price", "Enterprise Architect", "influencer"],
  ],
  orbitra: [
    ["Sophie Becker", "VP of Engineering", "decisionMaker"],
    ["Jonas Fischer", "Platform Lead", "champion"],
    ["Mila Horvat", "Security Officer", "influencer"],
  ],
  sablecrest: [
    ["Ethan Brooks", "CFO", "decisionMaker"],
    ["Rachel Kim", "Head of Partnerships", "champion"],
  ],
  kestrel: [
    ["Liam O'Connor", "Head of Operations", "decisionMaker"],
    ["Arjun Patel", "IT Manager", "influencer"],
    ["Mei Lin", "Business Analyst", "endUser"],
  ],
  pinegrove: [
    ["Kenta Suzuki", "Finance Director", "decisionMaker"],
    ["Grace Thompson", "Renewals Manager", "champion"],
  ],
  zephyra: [
    ["Felix Wagner", "CIO", "decisionMaker"],
    ["Nadia Karim", "Head of Marketing Operations", "champion"],
  ],
  ferrolite: [
    ["Carlos Mendes", "VP of Supply Chain", "decisionMaker"],
    ["Emily Ward", "Operations Manager", "champion"],
    ["Noah Foster", "Procurement Lead", "blocker"],
  ],
  tidewell: [
    ["Hiroshi Yamada", "Regional Director", "decisionMaker"],
    ["Isla Morgan", "Head of Expansion", "champion"],
    ["Zara Ali", "Data Engineer", "endUser"],
  ],
  arclight: [
    ["Laura Simmons", "Director of IT", "decisionMaker"],
    ["Benjamin Hayes", "Partner Manager", "champion"],
  ],
  veridian: [
    ["Paul Navarro", "Managing Director", "decisionMaker"],
    ["Amelie Schmidt", "Head of Compliance", "influencer"],
    ["Erik Johansson", "CISO", "blocker"],
  ],
  parcelo: [
    ["Jun Park", "Founder & CEO", "decisionMaker"],
    ["Sara Lopez", "Growth Lead", "champion"],
  ],
  hexaloop: [
    ["Maya Singh", "VP of Finance", "decisionMaker"],
    ["Owen Walsh", "Head of Product", "champion"],
    ["Leo Martins", "Developer Advocate", "endUser"],
  ],
};

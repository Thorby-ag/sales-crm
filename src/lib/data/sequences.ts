import type { Sequence } from "../types";

// Templates are records (data): they stay in English in every locale.

export const SEQUENCE_SEEDS: Sequence[] = [
  {
    id: "new-logo-outreach",
    name: "New logo outreach",
    owner: "Nina Petrova",
    topic: "discovery",
    active: true,
    steps: [
      {
        id: "intro",
        day: 0,
        type: "email",
        subject: "Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nTeams like yours use us to see their whole pipeline in one place, by account and by rep. Is forecasting something {{company}} is working on this quarter?\n\nBest,\n{{sender}}",
      },
      { id: "call", day: 2, type: "call", subject: "Call {{first_name}} at {{company}}", body: "Ask how they forecast today and who owns it." },
      {
        id: "bump",
        day: 4,
        type: "email",
        subject: "Re: Quick question about {{company}}",
        body: "Hi {{first_name}},\n\nFloating this back up. Happy to share how a team like yours cut forecast prep from days to minutes.\n\n{{sender}}",
      },
      { id: "linkedin", day: 7, type: "task", subject: "Connect with {{first_name}} on LinkedIn", body: "Mention the forecasting question from the first email." },
      {
        id: "close-loop",
        day: 10,
        type: "email",
        subject: "Should I close the loop?",
        body: "Hi {{first_name}},\n\nI haven't heard back, so I'll assume the timing isn't right. If that changes, just reply to this email.\n\n{{sender}}",
      },
    ],
  },
  {
    id: "post-demo-follow-up",
    name: "Post-demo follow-up",
    owner: "Sofia Marin",
    topic: "demo",
    active: true,
    steps: [
      {
        id: "recap",
        day: 0,
        type: "email",
        subject: "Recap of today's demo",
        body: "Hi {{first_name}},\n\nThanks for the time today. Here's a recap of what we covered and the next steps we agreed on for {{company}}.\n\n{{sender}}",
      },
      { id: "check-in", day: 3, type: "call", subject: "Check in with {{first_name}} on next steps", body: "Confirm who else needs to see the demo." },
      {
        id: "questions",
        day: 6,
        type: "email",
        subject: "Answers to your team's questions",
        body: "Hi {{first_name}},\n\nI pulled together answers to the questions your team raised, plus our security overview.\n\n{{sender}}",
      },
      { id: "business-case", day: 9, type: "task", subject: "Send the business case to {{first_name}}", body: "Use the numbers from the discovery call." },
    ],
  },
  {
    id: "renewal-check-in",
    name: "Renewal check-in",
    owner: "Hana Sato",
    topic: "renewal",
    active: false,
    steps: [
      {
        id: "heads-up",
        day: 0,
        type: "email",
        subject: "Your renewal is coming up",
        body: "Hi {{first_name}},\n\n{{company}}'s renewal is a couple of months away. Could we find 30 minutes to review how the year went?\n\n{{sender}}",
      },
      { id: "call", day: 5, type: "call", subject: "Renewal call with {{first_name}}", body: "Review usage and the expansion options." },
      {
        id: "options",
        day: 12,
        type: "email",
        subject: "Renewal options for {{company}}",
        body: "Hi {{first_name}},\n\nAs promised, here are the renewal options we discussed.\n\n{{sender}}",
      },
    ],
  },
];

/** [sequence id, contact id, enrolled this many days ago, replied this many days after enrolling (null: no reply)] */
export const ENROLLMENT_SEEDS: [string, string, number, number | null][] = [
  ["new-logo-outreach", "samuel-ortiz", 12, 4],
  ["new-logo-outreach", "hannah-wright", 9, null],
  ["new-logo-outreach", "anna-nowak", 6, null],
  ["new-logo-outreach", "pieter-de-vries", 3, null],
  ["new-logo-outreach", "owen-walsh", 15, null],
  ["new-logo-outreach", "leo-martins", 1, null],
  ["new-logo-outreach", "lars-eriksen", 8, 2],
  ["new-logo-outreach", "amelie-schmidt", 0, null],
  ["post-demo-follow-up", "aiko-tanaka", 5, null],
  ["post-demo-follow-up", "jonas-fischer", 2, null],
  ["post-demo-follow-up", "arjun-patel", 11, 6],
  ["post-demo-follow-up", "isla-morgan", 7, null],
  ["post-demo-follow-up", "benjamin-hayes", 4, 3],
  ["post-demo-follow-up", "sara-lopez", 1, null],
  ["renewal-check-in", "grace-thompson", 6, null],
  ["renewal-check-in", "matteo-rossi", 10, 5],
  ["renewal-check-in", "rachel-kim", 3, null],
];

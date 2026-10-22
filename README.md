# Sales CRM

**English** · [Español](README.es.md)

An account-based CRM for B2B sales teams: a companies pipeline, contacts, activities, email sequences, a deals board with drag and drop, a quarterly forecast, saved views and search. It runs entirely in the browser, in English and Spanish.

**Live demo:** [salescrm.thomalabs.com](https://salescrm.thomalabs.com)

![Companies view](docs/screenshot.png)

![Deals board](docs/deals.png)

![Quarterly forecast](docs/forecast.png)

<p>
  <img src="docs/detail-es.png" alt="Company details in Spanish" width="66%" />
  <img src="docs/mobile-es.png" alt="Deals board on a phone" width="30%" />
</p>

## Highlights

- **Companies table.** Sort by five criteria (from the menu or the column headers) and filter by owner, segment or stage, and days since the last interaction. Select rows to reassign or delete them with undo, export to CSV, and add live calculations to the footer.
- **Deals board.** Drag deals between stages with a mouse, touch (long press) or the keyboard, with screen reader announcements. A "Move to" menu offers the same without dragging. Each company's open deals, pipeline value and win probability are derived from its deals, so moving a card updates the table.
- **Forecast.** This quarter or the next, for the whole team, one team or one rep: quota, closed won, Commit, Best case, weighted pipeline and coverage, a chart of the quarter's progress (with its numbers as a table) and a breakdown by rep. From the deal list, a deal can change forecast category or move to the next quarter, with undo.
- **Deal details.** Clicking a deal opens a sheet to edit its amount, close date, stage, probability and forecast category. It shows where the deal will count in the forecast before saving. Every view follows: board, companies table and forecast.
- **Contacts.** The people at each account and their role in the purchase: decision maker, champion, influencer, end user or blocker. Search and filter them (in the URL too), see each account's buying committee in its sheet, and find people from the ⌘K search.
- **Activities.** Calls, meetings, emails and tasks, planned or already done. A to-do list grouped into overdue, today and upcoming, with a check to complete them (undo included). Completing one updates the company's last interaction. A side panel lists the deals closing this quarter with no next step, so one can be planned in a click. Each company, deal and contact sheet shows its own.
- **Email sequences.** Outreach cadences: emails, calls and tasks on set days after a contact is enrolled. Write steps with variables like `{{first_name}}` and preview them for a real contact, enroll people, mark replies and pause or resume. Results per sequence: enrolled, replies, reply rate and emails sent. Emails are simulated (there's no backend), while calls and tasks become planned activities and leave when the contact replies.
- **Saved views.** Sidebar entries are real filters: team, region, deals closing this quarter, slipping deals.
- **English and Spanish.** `/en` and `/es` routes, browser-language detection, currency, dates and plurals formatted per locale, translated metadata with `hreflang`, and type-checked translation keys.
- **Shareable URLs.** Filters, sort order and the open company live in the query string (`/es/deals?owner=kenji-mori&company=quantora`).
- **Persistence.** Changes are saved in the browser. Every date moves forward on the next visit, so the demo never looks stale. "Reset demo data" can be undone.
- **Accessibility.** No WCAG 2.1 AA violations in axe-core, checked in CI in both languages. Keyboard support everywhere, a non-dragging alternative for the board (WCAG 2.5.7), and real 404 responses.

## Stack

Next.js 16 (App Router, static pages, `proxy.ts`) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Radix UI · next-intl · dnd-kit · cmdk · Zustand · Sonner · Vitest · Playwright · axe-core

## How it's built

```
src/
  app/[locale]/        routes per language: companies (/), deals board (/deals), 404
  i18n/                routing, request config, typed messages
  messages/            en.json, es.json
  proxy.ts             redirects / to the visitor's language
  components/
    ui/                primitives on Radix (dialog, sheet, menus, select, tabs…)
    crm/
      shell/           layout, sidebar, header, search, notifications, skeletons
      activities/      to-do list, deals without a next step
      companies/       table, toolbar, footer, bulk actions
      contacts/        contacts table, buying-role tags
      deals/           board, cards, stage menu
      sequences/       sequences, steps editor, preview, enrollments
      forecast/        KPIs, quarter chart (SVG), reps, deals by category
      sheets/          company, deal and contact details, profiles, dialogs for new records
  lib/                 domain logic as pure functions (+ __tests__)
e2e/                   Playwright specs (desktop + mobile, a11y)
```

A few decisions worth noting:

- **Domain logic is pure and tested.** Filtering, sorting, metrics, forecasting, search, validation, CSV, URL parsing and persistence live in `src/lib` without React, so 148 unit tests cover them directly.
- **The URL is the state for anything shareable.** Filters and the open company are read with `useSearchParams` and written with `history.replaceState`, which Next.js keeps in sync without a navigation. Zustand holds the records and UI state such as selection and open dialogs.
- **Dates are relative to the visitor's today.** Seed data is defined as "N days ago". Saved data stores the date it was saved and is shifted forward on load.
- **The forecast holds up on any day.** Seeded wins follow the pace each account's open pipeline predicts. Early in the quarter most of the forecast is still open, late in the quarter most of it is won, and the totals land in about the same place. A unit test checks this across several dates.
- **Static HTML, client data.** Pages are prerendered with skeletons, because the data lives in the browser. Pages still render on the server, so `notFound()` returns a real `404`.
- **Translations are checked.** A unit test fails if Spanish is missing a key, uses different placeholders, has invalid ICU syntax or was left untranslated by accident.

## Getting started

Requires Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build, served like the Docker image |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests against a production build (Playwright). Run `npx playwright install chromium` once, or use an installed Chrome with `PW_CHANNEL=chrome`. Set `E2E_BASE_URL` to test a deployed site instead. |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm run avatars` | Regenerates the avatar SVGs |

GitHub Actions runs lint, typecheck, unit and end-to-end tests on every push, and builds and smoke-tests the Docker image.

## Deploying

The live demo runs on a VPS with [Dokploy](https://dokploy.com), which rebuilds it on every push to `main`.

- **Docker / Dokploy (self-hosted).** The multi-stage `Dockerfile` builds Next.js's standalone server and runs it as a non-root user with a health check. The container listens on port `3000`. Pass the public URL as a build argument, because the static pages embed it in their canonical, `hreflang` and Open Graph tags:

  ```bash
  docker build --build-arg SITE_URL=https://crm.example.com -t sales-crm .
  docker run -p 3000:3000 sales-crm
  ```

- **Vercel.** Works with no configuration; the production URL is detected automatically.

## Credits

- The interface is based on [Sales CRM by Kargul Studio](https://sales-crm-kargulstudio.vercel.app/). The code, data, logos and avatars in this repository are original, and the deals board, forecast, Spanish version, persistence, saved views and bulk actions are new.
- Avatars: "Adventurer" by Lisa Wischofsky ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), generated with [DiceBear](https://www.dicebear.com/).
- Icons: [Lucide](https://lucide.dev/) (ISC). Font: [Geist](https://vercel.com/font) (SIL OFL).
- Companies, people, emails (`.example`) and phone numbers (555-01xx) are fictional.

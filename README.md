# Sales CRM

**English** · [Español](README.es.md)

An account-based CRM for B2B sales teams: a companies pipeline, a deals board with drag and drop, saved views and search. It runs entirely in the browser, in English and Spanish.

<!-- Live demo: add the Vercel URL here once it's deployed. -->

![Companies view](docs/screenshot.png)

![Deals board](docs/deals.png)

<p>
  <img src="docs/detail-es.png" alt="Company details in Spanish" width="66%" />
  <img src="docs/mobile-es.png" alt="Deals board on a phone" width="30%" />
</p>

## Highlights

- **Companies table.** Sort by five criteria (from the menu or the column headers) and filter by owner, segment or stage, and days since the last interaction. Select rows to reassign or delete them with undo, export to CSV, and add live calculations to the footer.
- **Deals board.** Drag deals between stages with a mouse, touch (long press) or the keyboard, with screen reader announcements. A "Move to" menu offers the same without dragging. Each company's open deals, pipeline value and win probability are derived from its deals, so moving a card updates the table.
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
      companies/       table, toolbar, footer, bulk actions
      deals/           board, cards, stage menu
      sheets/          company details, profiles, new company
  lib/                 domain logic as pure functions (+ __tests__)
e2e/                   Playwright specs (desktop + mobile, a11y)
```

A few decisions worth noting:

- **Domain logic is pure and tested.** Filtering, sorting, metrics, search, validation, CSV, URL parsing and persistence live in `src/lib` without React, so 78 unit tests cover them directly.
- **The URL is the state for anything shareable.** Filters and the open company are read with `useSearchParams` and written with `history.replaceState`, which Next.js keeps in sync without a navigation. Zustand holds the records and UI state such as selection and open dialogs.
- **Dates are relative to the visitor's today.** Seed data is defined as "N days ago". Saved data stores the date it was saved and is shifted forward on load.
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
| `npm run test:e2e` | End-to-end tests against a production build (Playwright). Run `npx playwright install chromium` once, or use an installed Chrome with `PW_CHANNEL=chrome`. |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm run avatars` | Regenerates the avatar SVGs |

GitHub Actions runs lint, typecheck, unit and end-to-end tests on every push, and builds and smoke-tests the Docker image.

## Deploying

- **Docker / Dokploy (self-hosted).** The multi-stage `Dockerfile` builds Next.js's standalone server and runs it as a non-root user with a health check. The container listens on port `3000`. Pass the public URL as a build argument, because the static pages embed it in their canonical, `hreflang` and Open Graph tags:

  ```bash
  docker build --build-arg SITE_URL=https://crm.example.com -t sales-crm .
  docker run -p 3000:3000 sales-crm
  ```

- **Vercel.** Works with no configuration; the production URL is detected automatically.

## Credits

- The interface is based on [Sales CRM by Kargul Studio](https://sales-crm-kargulstudio.vercel.app/). The code, data, logos and avatars in this repository are original, and the deals board, Spanish version, persistence, saved views and bulk actions are new.
- Avatars: "Adventurer" by Lisa Wischofsky ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), generated with [DiceBear](https://www.dicebear.com/).
- Icons: [Lucide](https://lucide.dev/) (ISC). Font: [Geist](https://vercel.com/font) (SIL OFL).
- Companies, people, emails (`.example`) and phone numbers (555-01xx) are fictional.

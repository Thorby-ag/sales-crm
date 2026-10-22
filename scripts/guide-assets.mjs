// Screenshots and PDFs for the in-app guide (/guide), taken from a running production build:
//   npm run build && npm start        # in another terminal
//   npm run guide:assets              # BASE_URL defaults to http://localhost:3000
// Set PW_CHANNEL=chrome to use an installed Chrome instead of Playwright's Chromium.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = (file) => fileURLToPath(new URL(`../public/guide/${file}`, import.meta.url));

/** What each guide section shows, at 1280×800. */
const SHOTS = [
  {
    id: "basics",
    path: "/",
    then: async (page) => {
      await page.keyboard.press("ControlOrMeta+k");
      await page.keyboard.type("li");
    },
  },
  { id: "companies", path: "/?company=halcyon-air" },
  { id: "deals", path: "/deals" },
  { id: "forecast", path: "/forecast" },
  { id: "contacts", path: "/contacts?contact=olivia-chen" },
  { id: "activities", path: "/activities" },
  { id: "sequences", path: "/sequences?sequence=new-logo-outreach" },
];

/** The demo data loads in the browser: pages show skeletons (aria-busy) until it's there. */
async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await page.waitForTimeout(700); // sheets and dialogs finish animating
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });

for (const locale of ["en", "es"]) {
  await mkdir(out(locale), { recursive: true });
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  for (const shot of SHOTS) {
    await page.goto(`${BASE}/${locale}${shot.path}`);
    await ready(page);
    await shot.then?.(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: out(`${locale}/${shot.id}.jpg`), type: "jpeg", quality: 82 });
    console.log(`${locale}/${shot.id}.jpg`);
  }

  // The last section shows the board on a phone.
  const phone = await browser.newContext({ ...devices["Pixel 7"], deviceScaleFactor: 1 });
  const mobile = await phone.newPage();
  await mobile.goto(`${BASE}/${locale}/deals`);
  await ready(mobile);
  await mobile.screenshot({ path: out(`${locale}/mobile.jpg`), type: "jpeg", quality: 82 });
  await phone.close();
  console.log(`${locale}/mobile.jpg`);

  // The guide as a PDF, with the screenshots just taken: the running server may still have
  // older copies of public/, so they're served from disk.
  await page.route("**/guide/*/*.jpg", (route) => route.fulfill({ path: out(new URL(route.request().url()).pathname.replace("/guide/", "")) }));
  await page.goto(`${BASE}/${locale}/guide`);
  await page.evaluate(() => document.querySelectorAll("img").forEach((img) => (img.loading = "eager")));
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  await page.pdf({ path: out(`sales-crm-guide-${locale}.pdf`), format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  console.log(`sales-crm-guide-${locale}.pdf`);
  await desktop.close();
}

await browser.close();

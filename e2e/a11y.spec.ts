import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

async function expectNoViolations(page: Page) {
  // Let open/close animations settle so colors are measured at their final values.
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const locale of ["en", "es"]) {
  test(`companies page has no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expectNoViolations(page);
  });

  test(`deals board has no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/deals`);
    await expect(page.locator("article").first()).toBeVisible();
    await expectNoViolations(page);
  });

  test(`forecast has no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/forecast`);
    // Include the chart's data table, which starts collapsed.
    await page.locator("details summary").click();
    await expect(page.locator("details tbody tr").first()).toBeVisible();
    await expectNoViolations(page);
  });
}

for (const locale of ["en", "es"]) {
  test(`contacts have no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/contacts`);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expectNoViolations(page);
  });
}

for (const locale of ["en", "es"]) {
  test(`activities have no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/activities`);
    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await expectNoViolations(page);
  });
}

for (const locale of ["en", "es"]) {
  test(`sequences have no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/sequences`);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expectNoViolations(page);

    await page.goto(`/${locale}/sequences?sequence=new-logo-outreach`);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expectNoViolations(page);
  });
}

for (const locale of ["en", "es"]) {
  test(`guide has no WCAG violations (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/guide`);
    await expect(page.locator("article section").first()).toBeVisible();
    await expectNoViolations(page);
  });
}

test("step and enroll dialogs have no WCAG violations", async ({ page }) => {
  await page.goto("/en/sequences?sequence=new-logo-outreach");
  await page.getByRole("button", { name: "Add step" }).click();
  await expect(page.getByRole("dialog", { name: "New Step" })).toBeVisible();
  await expectNoViolations(page);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Enroll Contacts" }).click();
  await expect(page.getByRole("dialog", { name: "Enroll Contacts" })).toBeVisible();
  await expectNoViolations(page);
});

test("activity dialog has no WCAG violations", async ({ page }) => {
  await page.goto("/en/activities");
  await page.getByRole("button", { name: "New Activity" }).click();
  await expect(page.getByRole("dialog", { name: "New Activity" })).toBeVisible();
  await expectNoViolations(page);
});

test("contact sheet and dialog have no WCAG violations", async ({ page }) => {
  await page.goto("/en/contacts?contact=olivia-chen");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole("button", { name: "Edit contact" }).click();
  await expect(page.getByRole("dialog", { name: "Edit Contact" })).toBeVisible();
  await expectNoViolations(page);
});

test("deal sheet has no WCAG violations", async ({ page }) => {
  await page.goto("/en/forecast?deal=lumenfold-1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);
});

test("company sheet and new company dialog have no WCAG violations", async ({ page }) => {
  await page.goto("/en?company=halcyon-air");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New Company" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);
});

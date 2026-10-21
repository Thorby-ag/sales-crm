import { expect, test } from "@playwright/test";

test("filters open in a bottom sheet", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("Account owner").click();
  await page.getByRole("option", { name: "Lucas Ferreira" }).click();
  await page.getByRole("button", { name: "Show 2 companies" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Filters, 1 active" })).toBeVisible();
});

test("navigation lives in a drawer", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: /^Deals Board/ }).click();
  await expect(page).toHaveURL(/\/en\/deals$/);
  await expect(page.getByRole("heading", { level: 1, name: "Deals" })).toBeVisible();
});

test("the page never scrolls sideways", async ({ page }) => {
  for (const path of ["/en", "/es/deals"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});

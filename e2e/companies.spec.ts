import { expect, test, type Page } from "@playwright/test";

const rows = (page: Page) => page.locator("tbody tr");
const firstCompany = (page: Page) => rows(page).first().locator("td").nth(1);

test("filters and sort live in the URL and survive a reload", async ({ page }) => {
  await page.goto("/en?owner=kenji-mori");
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^Filter Kenji Mori/ })).toBeVisible();

  await page.getByRole("button", { name: "Companies", exact: true }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(firstCompany(page)).toHaveText("Hexaloop");

  await page.reload();
  await expect(rows(page)).toHaveCount(2);
  await expect(firstCompany(page)).toHaveText("Hexaloop");
});

test("saved views in the sidebar narrow the table and show a removable chip", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "EMEA" }).click();
  await expect(page).toHaveURL(/region=emea/);
  await expect(rows(page)).toHaveCount(6);
  await page.getByRole("button", { name: "Remove filter Region: EMEA" }).click();
  await expect(rows(page)).toHaveCount(18);
});

test("a new company is saved in the browser until the demo is reset", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "New Company" }).click();
  await page.getByLabel("Company name").fill("Acme Robotics");
  await page.getByLabel("Pipeline value").fill("999999");
  await page.getByLabel("Open deals").fill("3");
  await page.getByRole("button", { name: "Create Company" }).click();
  await expect(firstCompany(page)).toHaveText("Acme Robotics");
  await expect(page.getByRole("link", { name: /^Companies 19/ })).toBeVisible();

  await page.reload();
  await expect(firstCompany(page)).toHaveText("Acme Robotics");

  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByRole("button", { name: "Acme Robotics" })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(firstCompany(page)).toHaveText("Acme Robotics");
});

test("validation points to the first invalid field", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "New Company" }).click();
  await page.getByRole("button", { name: "Create Company" }).click();
  await expect(page.getByText("Enter a company name.")).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeFocused();
});

test("bulk reassignment can be undone", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("checkbox", { name: "Select Cobaltix" }).check();
  await page.getByRole("checkbox", { name: "Select Orbitra" }).check();
  const toolbar = page.getByRole("toolbar", { name: "Bulk actions" });
  await expect(toolbar.getByText("2 selected")).toBeVisible();

  await toolbar.getByRole("button", { name: "Assign owner" }).click();
  await page.getByRole("menuitem", { name: "Zoe Carter" }).click();
  await expect(page.getByRole("row", { name: /Cobaltix/ }).getByRole("button", { name: "Open Zoe Carter profile" })).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("row", { name: /Cobaltix/ }).getByRole("button", { name: "Open Nina Petrova profile" })).toBeVisible();
});

test("search finds companies by owner and opens them with the keyboard", async ({ page }) => {
  await page.goto("/en");
  // Keyboard shortcuts are registered once the app is interactive.
  await expect(rows(page).first()).toBeVisible();
  const input = page.getByRole("combobox");
  await page.keyboard.press("/");
  await expect(input).toBeFocused();
  await page.keyboard.type("omar");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Brightwave" })).toBeVisible();
  await expect(page).toHaveURL(/company=brightwave/);

  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/company=/);

  await page.keyboard.press("ControlOrMeta+k");
  await expect(input).toBeFocused();
  await page.keyboard.type("zzzz");
  await expect(page.getByText("No companies or contacts match “zzzz”.")).toBeVisible();
});

test("exports the companies in view as CSV", async ({ page }) => {
  await page.goto("/en?team=sdr");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^companies-\d{4}-\d{2}-\d{2}\.csv$/);
  const lines = (await (await file.createReadStream()).toArray()).join("").replace("﻿", "").split("\r\n");
  expect(lines[0]).toBe(
    "Company,Segment & Stage,Account Owner,Region,Open Deals,Pipeline Value,Win Probability (%),Last Interaction Date,Last Interaction",
  );
  expect(lines).toHaveLength(1 + (await rows(page).count()));
});

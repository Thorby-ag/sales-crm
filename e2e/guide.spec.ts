import { expect, test } from "@playwright/test";

test("the guide walks through every section and links into the app", async ({ page }) => {
  await page.goto("/en/guide");
  await expect(page.getByRole("heading", { level: 2, name: "How to use Sales CRM" })).toBeVisible();
  await expect(page.locator("article section")).toHaveCount(8);

  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Check the quarter's forecast" }).click();
  await expect(page).toHaveURL(/#forecast$/);

  await page.locator("#forecast").getByRole("link", { name: "Next quarter" }).click();
  await expect(page).toHaveURL(/\/en\/forecast\?quarter=next$/);
  await expect(page.getByRole("radio", { name: "Next quarter" })).toHaveAttribute("aria-checked", "true");
});

test("Help in the sidebar opens the guide, and its screenshots and PDF are there", async ({ page, request }) => {
  await page.goto("/es");
  await page.getByRole("link", { name: "Ayuda" }).click();
  await expect(page).toHaveURL(/\/es\/guide$/);
  await expect(page.getByRole("heading", { level: 2, name: "Cómo usar Sales CRM" })).toBeVisible();

  const pdf = await request.get("/guide/sales-crm-guide-es.pdf");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  for (const src of await page.locator("article img").evaluateAll((images) => images.map((img) => img.getAttribute("src")))) {
    expect((await request.get(src!)).status(), src!).toBe(200);
  }
});

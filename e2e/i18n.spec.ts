import { expect, test } from "@playwright/test";

test.describe("Spanish browser", () => {
  test.use({ locale: "es-AR" });

  test("the root redirects to the browser language", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("heading", { level: 1, name: "Empresas" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});

test("switching language keeps the page and its filters", async ({ page }) => {
  await page.goto("/en/deals?owner=kenji-mori");
  await page.getByRole("button", { name: /Language: English/ }).click();
  await page.getByRole("menuitemradio", { name: "Español" }).click();

  await expect(page).toHaveURL(/\/es\/deals\?owner=kenji-mori/);
  await expect(page.getByRole("heading", { level: 1, name: "Deals" })).toBeVisible();
  await expect(page.getByText(/US\$/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Filtro Kenji Mori/ })).toBeVisible();
});

test("unknown pages return a real 404 with a localized page", async ({ page, request }) => {
  expect((await request.get("/en/reports")).status()).toBe(404);
  await page.goto("/es/no-existe");
  await expect(page.getByRole("heading", { name: "Página no encontrada" }).last()).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("contacts can be searched and filtered, and the filters live in the URL", async ({ page }) => {
  await page.goto("/en/contacts");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(48);

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("halcyon");
  await expect(rows).toHaveCount(3);
  await expect(page).toHaveURL(/q=halcyon/);

  await page.getByRole("button", { name: /^Role All roles/ }).click();
  await page.getByRole("menuitemradio", { name: "Champion" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Olivia Chen");

  await page.reload();
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toHaveValue("halcyon");
});

test("a new contact shows up in the list and on its company", async ({ page }) => {
  await page.goto("/en/contacts");
  await page.getByRole("button", { name: "New Contact" }).click();
  const dialog = page.getByRole("dialog", { name: "New Contact" });
  await dialog.getByRole("button", { name: "Create Contact" }).click();
  await expect(dialog.getByText("Enter a name.")).toBeVisible();
  await expect(dialog.getByLabel("Full name")).toBeFocused();

  await dialog.getByLabel("Full name").fill("Ana Torres");
  await dialog.getByLabel("Company").click();
  await page.getByRole("option", { name: "Lumenfold" }).click();
  await dialog.getByLabel("Email").fill("ana@lumenfold.example");
  await dialog.getByRole("button", { name: "Create Contact" }).click();
  await expect(page.getByText("Ana Torres was added to Lumenfold")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(49);

  await page.getByRole("button", { name: "Ana Torres", exact: true }).click();
  await page.getByRole("dialog", { name: "Contact Details" }).getByRole("button", { name: "Lumenfold", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Company Details" }).getByText("Ana Torres")).toBeVisible();
});

test("deleting a contact can be undone", async ({ page }) => {
  await page.goto("/en/contacts?contact=priya-raman");
  const sheet = page.getByRole("dialog", { name: "Contact Details" });
  await expect(sheet.getByRole("heading", { name: "Priya Raman" })).toBeVisible();

  await sheet.getByRole("button", { name: "Delete contact" }).click();
  await expect(page.getByText("Priya Raman was deleted")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(47);
  await expect(page).not.toHaveURL(/contact=/);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(48);
});

test("search finds people too", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("olivia");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Contact Details" })).toBeVisible();
  await expect(page).toHaveURL(/contact=olivia-chen/);
});

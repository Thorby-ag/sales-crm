import { expect, test, type Page } from "@playwright/test";

const column = (page: Page, stage: string) => page.getByRole("region", { name: new RegExp(`^${stage}`) });

test("moving a deal with its menu updates the company metrics", async ({ page }) => {
  await page.goto("/en/deals");
  const discovery = column(page, "Discovery");
  const handle = discovery.getByRole("button", { name: /^Move / }).first();
  const label = (await handle.getAttribute("aria-label"))!; // "Move <deal> · <company>"
  const [deal, company] = label.replace(/^Move /, "").split(" · ") as [string, string];

  await discovery.getByRole("button", { name: `Actions for ${deal}` }).first().click();
  await page.getByRole("menuitemradio", { name: "Closed won" }).click();
  await expect(column(page, "Closed won").getByRole("button", { name: label })).toBeVisible();
  await expect(page.getByText(`${deal} · ${company} moved to Closed won`)).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(discovery.getByRole("button", { name: label })).toBeVisible();
});

test("deals can be dragged between stages with the keyboard", async ({ page }) => {
  await page.goto("/en/deals");
  const handle = column(page, "Discovery").getByRole("button", { name: /^Move / }).first();
  const label = (await handle.getAttribute("aria-label"))!;

  // Follow the screen reader announcements, like an assistive technology user would.
  const live = page.locator("[id^=DndLiveRegion]");
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(live).toContainText("Picked up");
  await page.keyboard.press("ArrowRight");
  await expect(live).toContainText("is over Evaluation");
  await page.keyboard.press("Space");
  await expect(live).toContainText("moved to Evaluation");

  await expect(column(page, "Evaluation").getByRole("button", { name: label })).toBeVisible();
  await expect(column(page, "Discovery").getByRole("button", { name: label })).toHaveCount(0);
});

test("reporting views filter the board", async ({ page }) => {
  await page.goto("/en/deals");
  await page.getByRole("link", { name: "Slipping Deals" }).click();
  await expect(page).toHaveURL(/close=overdue/);
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  await expect(page.locator("article", { hasText: "Overdue" })).toHaveCount(total);
});

test("a card opens its deal, and the deal its company", async ({ page }) => {
  await page.goto("/en/deals");
  const card = page.getByRole("region", { name: /^Procurement/ }).locator("article").first();
  const company = (await card.locator("p").first().textContent())!;
  await card.click({ position: { x: 120, y: 80 } });
  await expect(page).toHaveURL(/deal=/);

  await page.getByRole("dialog", { name: "Deal Details" }).getByRole("button", { name: company, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Company Details" })).toBeVisible();
  await expect(page).toHaveURL(/company=/);
  await expect(page).not.toHaveURL(/deal=/);
});

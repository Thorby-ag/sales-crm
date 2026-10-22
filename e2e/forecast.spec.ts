import { expect, test, type Page } from "@playwright/test";

/** The rows of one forecast group ("Commit", "Best case", "Closed won"…) in the deals table. */
const group = (page: Page, name: string) =>
  page.locator("tbody").filter({ has: page.locator("th[scope=rowgroup]", { hasText: new RegExp(`^${name}`) }) });

/** The first deal of a group: its actions button label, "Actions for <deal> · <company>". */
async function firstDeal(page: Page, name: string) {
  const actions = group(page, name).getByRole("button", { name: /^Actions for / }).first();
  const label = (await actions.getAttribute("aria-label"))!;
  return { actions, label, deal: label.replace(/^Actions for /, "") };
}

test("a deal can move to another forecast category, with undo", async ({ page }) => {
  await page.goto("/en/forecast");
  const { actions, label, deal } = await firstDeal(page, "Best case");

  await actions.click();
  await page.getByRole("menuitemradio", { name: "Commit" }).click();
  await expect(page.getByText(`${deal} now counts as Commit`)).toBeVisible();
  await expect(group(page, "Commit").getByRole("button", { name: label, exact: true })).toBeVisible();
  await expect(group(page, "Best case").getByRole("button", { name: label, exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(group(page, "Best case").getByRole("button", { name: label, exact: true })).toBeVisible();
});

test("pushing a deal moves it to next quarter's forecast", async ({ page }) => {
  await page.goto("/en/forecast");
  const { actions, label } = await firstDeal(page, "Commit");

  await actions.click();
  await page.getByRole("menuitem", { name: "Push to next quarter" }).click();
  await expect(page.getByText(/ pushed to Q\d \d{4}$/)).toBeVisible();
  await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);

  await page.getByRole("radio", { name: "Next quarter" }).click();
  await expect(page).toHaveURL(/quarter=next/);
  await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
});

test("the quarter, team and rep live in the URL", async ({ page }) => {
  await page.goto("/en/forecast?quarter=next&team=sdr");
  await expect(page.getByRole("radio", { name: "Next quarter" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: /^Team SDR Team/ })).toBeVisible();
  const reps = page.getByRole("table", { name: /^Forecast by rep/ }).locator("tbody tr");
  await expect(reps).toHaveCount(5);

  // A rep's name narrows the whole forecast to them.
  await reps.first().getByRole("button").click();
  await expect(page).toHaveURL(/owner=/);
  await expect(reps).toHaveCount(1);
  await page.reload();
  await expect(reps).toHaveCount(1);
});

test("a deal edited in its sheet updates the board and the forecast", async ({ page }) => {
  await page.goto("/en/deals");
  await page.getByRole("region", { name: /^Discovery/ }).locator("article").first().click({ position: { x: 120, y: 80 } });
  const sheet = page.getByRole("dialog", { name: "Deal Details" });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/deal=/);

  const amount = sheet.getByLabel("Amount");
  await amount.fill("");
  await sheet.getByRole("button", { name: "Save Changes" }).click();
  await expect(sheet.getByText("Enter an amount greater than zero.")).toBeVisible();
  await expect(amount).toBeFocused();

  await amount.fill("123456");
  await sheet.getByLabel("Stage").click();
  await page.getByRole("option", { name: "Closed won" }).click();
  await expect(sheet.getByText(/^Won in Q\d \d{4}$/)).toBeVisible();
  await sheet.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText(/ updated$/)).toBeVisible();
  await expect(page.getByRole("region", { name: /^Closed won/ }).getByText("123,456")).toBeVisible();

  // Won today: it counts in this quarter's forecast.
  await page.getByRole("navigation", { name: "Views" }).getByRole("link", { name: "Forecast" }).click();
  await expect(group(page, "Closed won").getByText("123,456")).toBeVisible();
});

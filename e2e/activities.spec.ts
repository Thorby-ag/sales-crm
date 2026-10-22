import { expect, test, type Page } from "@playwright/test";

const group = (page: Page, name: string) => page.getByRole("region", { name: new RegExp(`^${name}`) });

test("completing an activity moves it to done and becomes the company's last interaction", async ({ page }) => {
  await page.goto("/en/activities");
  const row = group(page, "Today").getByRole("listitem").first();
  const checkbox = row.getByRole("checkbox");
  const subject = (await checkbox.getAttribute("aria-label"))!.replace(/^Mark (.*) as done$/, "$1");
  const company = (await row.getByRole("button").nth(1).textContent())!;

  await checkbox.click();
  await expect(page.getByText(`Done: ${subject}`)).toBeVisible();
  await page.getByRole("radio", { name: "Done" }).click();
  await expect(page).toHaveURL(/view=done/);
  await expect(group(page, "Done").getByRole("button", { name: subject, exact: true }).first()).toBeVisible();

  const today = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date());
  await page.getByRole("link", { name: /^Companies/ }).first().click();
  await expect(page.getByRole("row", { name: new RegExp(company) })).toContainText(today);
});

test("a deal without a next step gets one from the activities page", async ({ page }) => {
  await page.goto("/en/activities");
  const gaps = page.getByRole("region", { name: "No next step" });
  const plan = gaps.getByRole("button", { name: /^Plan next step for / }).first();
  const label = (await plan.getAttribute("aria-label"))!;

  await plan.click();
  const dialog = page.getByRole("dialog", { name: "New Activity" });
  await dialog.getByLabel("Subject").fill("Send the proposal");
  await dialog.getByRole("button", { name: "Plan Activity" }).click();
  await expect(page.getByText(/^Planned for .*: Send the proposal$/)).toBeVisible();
  await expect(gaps.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  await expect(group(page, "Today").getByRole("button", { name: "Send the proposal", exact: true })).toBeVisible();
});

test("the activity form validates, and can log something that already happened", async ({ page }) => {
  await page.goto("/en/activities?view=done");
  await page.getByRole("button", { name: "New Activity" }).click();
  const dialog = page.getByRole("dialog", { name: "New Activity" });
  await dialog.getByRole("button", { name: "Plan Activity" }).click();
  await expect(dialog.getByText("Enter a subject.")).toBeVisible();
  await expect(dialog.getByText("Pick a company.")).toBeVisible();
  await expect(dialog.getByLabel("Subject")).toBeFocused();

  await dialog.getByLabel("Subject").fill("Intro call with the CFO");
  await dialog.getByLabel("Company").click();
  await page.getByRole("option", { name: "Kestrel" }).click();
  await dialog.getByLabel("Already done").check();
  await dialog.getByRole("button", { name: "Log Activity" }).click();
  await expect(page.getByText("Logged: Intro call with the CFO")).toBeVisible();
  await expect(group(page, "Done").getByRole("button", { name: "Intro call with the CFO", exact: true })).toBeVisible();
});

test("a deal's sheet shows its next step", async ({ page }) => {
  await page.goto("/en/activities?type=meeting");
  await expect(page.getByRole("button", { name: /^Type Meeting/ })).toBeVisible();
  const row = page.getByRole("listitem").filter({ has: page.getByRole("checkbox") }).filter({ hasText: "·" }).first();
  const subject = (await row.getByRole("checkbox").getAttribute("aria-label"))!.replace(/^Mark (.*) as done$/, "$1");
  await row.getByRole("button").nth(2).click();
  const sheet = page.getByRole("dialog", { name: "Deal Details" });
  await expect(sheet.getByText("Next step")).toBeVisible();
  await expect(sheet.getByRole("button", { name: subject, exact: true })).toBeVisible();
});

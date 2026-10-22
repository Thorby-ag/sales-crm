import { expect, test } from "@playwright/test";

test("the list shows how each sequence is doing and opens one", async ({ page }) => {
  await page.goto("/en/sequences");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "New logo outreach" })).toContainText("Nina Petrova");

  await page.getByRole("button", { name: "New logo outreach", exact: true }).click();
  await expect(page).toHaveURL(/sequence=new-logo-outreach/);
  await expect(page.getByRole("heading", { name: "New logo outreach" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Steps" }).getByRole("listitem")).toHaveCount(5);

  // The preview writes the first email to an enrolled contact.
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toContainText("Quick question about Northpeak");
  await preview.getByLabel("For").click();
  await page.getByRole("option", { name: "Anna Nowak" }).click();
  await expect(preview).toContainText("Quick question about Cobaltix");

  await page.getByRole("button", { name: "Sequences", exact: true }).click();
  await expect(page).not.toHaveURL(/sequence=/);
});

test("a new sequence gets its steps and contacts, and its calls become activities", async ({ page }) => {
  await page.goto("/en/sequences");
  await page.getByRole("button", { name: "New Sequence" }).click();
  const create = page.getByRole("dialog", { name: "New Sequence" });
  await create.getByLabel("Name").fill("Q1 outbound");
  await create.getByRole("button", { name: "Create Sequence" }).click();
  await expect(page.getByRole("heading", { name: "Q1 outbound" })).toBeVisible();
  const steps = page.getByRole("region", { name: "Steps" }).getByRole("listitem");
  await expect(steps).toHaveCount(3);

  await page.getByRole("button", { name: "Add step" }).click();
  const step = page.getByRole("dialog", { name: "New Step" });
  await step.getByRole("radio", { name: "Task" }).click();
  await step.getByLabel("Subject").fill("Research {{company}}");
  await step.getByRole("button", { name: "Add Step" }).click();
  await expect(steps).toHaveCount(4);

  await page.getByRole("button", { name: "Enroll Contacts" }).click();
  const enroll = page.getByRole("dialog", { name: "Enroll Contacts" });
  await enroll.getByRole("searchbox", { name: "Search contacts" }).fill("priya");
  await enroll.getByRole("checkbox", { name: "Priya Raman" }).check();
  await enroll.getByRole("button", { name: "Enroll 1 Contact" }).click();
  await expect(page.getByText("1 contact enrolled in Q1 outbound")).toBeVisible();
  await expect(page.getByRole("row", { name: /Priya Raman/ })).toContainText("Active");

  await page.getByRole("link", { name: /^Activities/ }).first().click();
  await expect(page.getByRole("button", { name: "Call Priya at Lumenfold", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Research Lumenfold", exact: true })).toBeVisible();
});

test("a reply stops the sequence for that contact and clears what was planned", async ({ page }) => {
  await page.goto("/en/activities");
  await expect(page.getByRole("button", { name: "Connect with Pieter on LinkedIn", exact: true })).toBeVisible();

  await page.goto("/en/sequences?sequence=new-logo-outreach");
  await page.getByRole("button", { name: "Actions for Pieter de Vries" }).click();
  await page.getByRole("menuitem", { name: "Mark as replied" }).click();
  await expect(page.getByText("Pieter de Vries replied: the sequence stops for them")).toBeVisible();
  await expect(page.getByRole("row", { name: /Pieter de Vries/ })).toContainText("Replied");

  await page.getByRole("link", { name: /^Activities/ }).first().click();
  await expect(page.getByRole("region", { name: /^Upcoming/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect with Pieter on LinkedIn", exact: true })).toHaveCount(0);
});

test("a paused sequence can't take new contacts until it resumes", async ({ page }) => {
  await page.goto("/en/sequences?sequence=post-demo-follow-up");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText(/is paused/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enroll Contacts" })).toBeDisabled();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Enroll Contacts" })).toBeEnabled();
});

test("contacts can be added to a sequence from their sheet", async ({ page }) => {
  await page.goto("/en/contacts?contact=priya-raman");
  const sheet = page.getByRole("dialog", { name: "Contact Details" });
  await expect(sheet.getByText("Not in any sequence.")).toBeVisible();
  await sheet.getByRole("button", { name: "Add to sequence" }).click();
  await page.getByRole("menuitem", { name: "New logo outreach" }).click();
  await expect(page.getByText("Priya Raman was enrolled in New logo outreach")).toBeVisible();
  await expect(sheet.getByRole("link", { name: "New logo outreach" })).toBeVisible();
});

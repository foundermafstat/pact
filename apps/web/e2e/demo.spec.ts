import { expect, test } from "@playwright/test";

test("demo routes and attack panel smoke", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Private proof. Public accountability." })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start demo" })).toBeVisible();

  await page.goto("/sponsor");
  await expect(page.getByRole("heading", { name: "Sponsor Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create program" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fund program" })).toBeVisible();
  await expect(page.getByText("MilestoneUnlock proof accepted")).toBeVisible();

  await page.goto("/project");
  await expect(page.getByRole("heading", { name: "Project Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Issue signed KYB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit payout" })).toBeVisible();

  await page.goto("/issuer");
  await expect(page.getByRole("heading", { name: "Issuer Console" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create credential" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rotate root" })).toBeVisible();

  await page.goto("/attestor");
  await expect(page.getByRole("heading", { name: "Attestor Console" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create evidence" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create proof input" })).toBeVisible();

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Public Audit View" })).toBeVisible();
  await expect(page.locator(".timeline li").filter({ hasText: "Tranche released" })).toBeVisible();
  await page.getByRole("button", { name: "Replay milestone proof" }).click();
  await expect(page.getByText("Expected rejection: NullifierAlreadyUsed")).toBeVisible();
});

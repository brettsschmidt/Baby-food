import { test, expect } from "./fixtures/auth";

test("create household and add baby", async ({ signedIn: page }) => {
  await page.waitForURL(/\/onboarding/);
  await page.getByRole("link", { name: /create household/i }).click();

  await page.getByLabel(/household name/i).fill("E2E Family");
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL(/\/onboarding\/baby/);
  await page.getByLabel(/baby/i).fill("Tiny Tester");
  await page.getByLabel(/birth date/i).fill("2025-01-15");
  await page.getByRole("button", { name: /finish/i }).click();

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText(/Tiny Tester/)).toBeVisible();
});

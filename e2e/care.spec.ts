import { test, expect } from "./fixtures/auth";

test("log a diaper change", async ({ signedIn: page }) => {
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Care");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Care Baby");
    await page.getByLabel(/birth date/i).fill("2025-01-15");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/care");
  await page.getByRole("button", { name: /^💧 wet$/i }).click();
  await expect(page.getByRole("listitem").filter({ hasText: /wet/i })).toBeVisible();
});

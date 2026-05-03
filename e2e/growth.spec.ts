import { test, expect } from "./fixtures/auth";

test("log a growth measurement", async ({ signedIn: page }) => {
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Growth");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Growth Baby");
    await page.getByLabel(/birth date/i).fill("2025-01-15");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/growth");
  await page.getByLabel(/weight/i).fill("7.2");
  await page.getByLabel(/length/i).fill("65");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("7.2 kg", { exact: false })).toBeVisible();
});

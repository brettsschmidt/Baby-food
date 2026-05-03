import { test, expect } from "./fixtures/auth";

test("adjusting inventory updates the displayed count", async ({ signedIn: page }) => {
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Adjust");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Adjust Baby");
    await page.getByLabel(/birth date/i).fill("2025-01-15");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/inventory/new");
  await page.getByLabel(/what is it/i).fill("Pea cubes");
  await page.getByLabel(/quantity/i).fill("10");
  await page.getByRole("button", { name: /save/i }).click();

  await page.waitForURL(/\/inventory$/);
  await page.getByText("Pea cubes").click();
  await page.waitForURL(/\/inventory\/.+/);

  // Decrement once via the −1 quick button (reason=feeding).
  await page.getByRole("button", { name: /^-?[\s−-]*1$/ }).first().click();
  await expect(page.getByText("9", { exact: false })).toBeVisible();
});

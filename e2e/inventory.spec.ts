import { test, expect } from "./fixtures/auth";

test("add an inventory item", async ({ signedIn: page }) => {
  // Quick onboarding
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Inventory");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Inventory Baby");
    await page.getByLabel(/birth date/i).fill("2025-02-01");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/inventory/new");
  await page.getByLabel(/what is it/i).fill("Sweet potato puree");
  await page.getByLabel(/quantity/i).fill("8");
  await page.getByRole("button", { name: /save/i }).click();

  await page.waitForURL(/\/inventory$/);
  await expect(page.getByText("Sweet potato puree")).toBeVisible();
  await expect(page.getByText("8 of 8 cube")).toBeVisible();
});

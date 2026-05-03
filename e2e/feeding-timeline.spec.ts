import { test, expect } from "./fixtures/auth";

test("log a feeding and see it on the timeline", async ({ signedIn: page }) => {
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Feeding");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Feeding Baby");
    await page.getByLabel(/birth date/i).fill("2025-03-01");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/feedings/new");
  await page.getByLabel(/or write it in/i).fill("First taste of avocado");
  await page.getByLabel(/loved/i).check();
  await page.getByRole("button", { name: /save feeding/i }).click();

  await page.waitForURL(/\/feedings$/);
  await expect(page.getByText("First taste of avocado")).toBeVisible();
});

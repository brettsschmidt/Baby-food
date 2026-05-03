import { test, expect } from "./fixtures/auth";

test("add and check off a shopping item", async ({ signedIn: page }) => {
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("E2E Shopping");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Shopping Baby");
    await page.getByLabel(/birth date/i).fill("2025-01-15");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  await page.goto("/shopping");
  await page.getByPlaceholder(/add item/i).fill("Sweet potatoes");
  await page.getByPlaceholder("qty").fill("2");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.getByText("Sweet potatoes")).toBeVisible();

  await page.getByText("Sweet potatoes").click();
  await expect(page.getByRole("heading", { name: /got it/i })).toBeVisible();
});

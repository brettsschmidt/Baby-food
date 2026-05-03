import AxeBuilder from "@axe-core/playwright";

import { test, expect } from "./fixtures/auth";

const ROUTES = [
  "/dashboard",
  "/inventory",
  "/inventory/new",
  "/feedings",
  "/feedings/new",
  "/planner",
  "/planner/new",
  "/recipes",
  "/recipes/new",
  "/shopping",
  "/insights",
  "/care",
  "/growth",
  "/library",
  "/settings",
  "/memories",
];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ signedIn: page }) => {
    if (page.url().includes("/onboarding")) {
      await page.getByRole("link", { name: /create household/i }).click();
      await page.getByLabel(/household name/i).fill("E2E A11y");
      await page.getByRole("button", { name: /continue/i }).click();
      await page.getByLabel(/baby/i).fill("A11y Baby");
      await page.getByLabel(/birth date/i).fill("2025-01-15");
      await page.getByRole("button", { name: /finish/i }).click();
      await page.waitForURL(/\/dashboard/);
    }
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // re-enable after a design pass
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

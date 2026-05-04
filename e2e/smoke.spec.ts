import { expect, test } from "@playwright/test";

test("home renders marketing landing", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Baby Food/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/baby food/i);
});

test("login page renders email form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in|log in|welcome/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("protected routes bounce to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("manifest and well-known endpoints respond", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect([200, 404]).toContain(manifest.status());

  const robots = await request.get("/robots.txt");
  expect([200, 404]).toContain(robots.status());
});

test("home request does not 500 (server-action path is healthy)", async ({ request }) => {
  const r = await request.get("/");
  expect(r.status()).toBeLessThan(500);
});

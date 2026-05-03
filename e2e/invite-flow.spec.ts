import { chromium } from "@playwright/test";

import { test, expect } from "./fixtures/auth";
import { adminClient, createTestUser, deleteTestUser } from "./fixtures/supabase-admin";

test("two parents share a household via invite code", async ({ signedIn: page, baseURL }) => {
  test.setTimeout(120_000);

  // Parent A creates a household
  if (page.url().includes("/onboarding")) {
    await page.getByRole("link", { name: /create household/i }).click();
    await page.getByLabel(/household name/i).fill("Shared Family");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/baby/i).fill("Shared Baby");
    await page.getByLabel(/birth date/i).fill("2025-04-01");
    await page.getByRole("button", { name: /finish/i }).click();
    await page.waitForURL(/\/dashboard/);
  }

  // Parent A mints an invite via Settings
  await page.goto("/settings");
  await page.getByRole("button", { name: /generate invite/i }).click();

  // Read the code straight from the DB (deterministic)
  const admin = adminClient();
  const { data: invites } = await admin
    .from("household_invites")
    .select("code, household_id")
    .order("created_at", { ascending: false })
    .limit(1);
  const inviteCode = invites?.[0]?.code;
  expect(inviteCode).toBeTruthy();

  // Parent B joins in a fresh browser context
  const partnerEmail = `e2e-partner-${Date.now()}@test.local`;
  const partner = await createTestUser(partnerEmail, "Test123!password");

  const browser = await chromium.launch();
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: partnerEmail,
  });
  await pageB.goto(linkData!.properties!.action_link);
  await pageB.waitForURL(/\/onboarding/);

  await pageB.goto(`${baseURL}/onboarding/join?code=${inviteCode}`);
  await pageB.getByRole("button", { name: /join household/i }).click();
  await pageB.waitForURL(/\/dashboard/);

  await pageB.goto(`${baseURL}/inventory`);
  // Both parents should see the same (empty) inventory
  await expect(pageB.getByText(/nothing in your freezer/i)).toBeVisible();

  await ctxB.close();
  await browser.close();
  await deleteTestUser(partner.id);
});

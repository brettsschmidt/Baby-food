import { test as base, type Page } from "@playwright/test";

import { adminClient, createTestUser, deleteTestUser } from "./supabase-admin";

interface TestUser {
  id: string;
  email: string;
  password: string;
}

interface AuthFixtures {
  user: TestUser;
  signedIn: Page;
}

const PASSWORD = "Test123!password";

function uniqueEmail(prefix = "user") {
  return `e2e-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

export const test = base.extend<AuthFixtures>({
  user: async ({}, use) => {
    const email = uniqueEmail();
    const created = await createTestUser(email, PASSWORD);
    await use({ id: created.id, email, password: PASSWORD });
    try {
      await deleteTestUser(created.id);
    } catch {
      /* user already gone */
    }
  },

  signedIn: async ({ page, user }, use) => {
    // Sign in via password (faster than magic link in tests).
    const admin = adminClient();
    const { data } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });
    if (!data?.properties?.action_link) {
      throw new Error("Failed to generate magic link in admin");
    }
    // The action_link is a Supabase URL that redirects to /auth/callback?code=...
    await page.goto(data.properties.action_link);
    await page.waitForURL(/\/(dashboard|onboarding|login)/, { timeout: 15_000 });
    await use(page);
  },
});

export { expect } from "@playwright/test";
export { uniqueEmail };

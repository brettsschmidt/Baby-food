import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../types/supabase";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to point at a TEST Supabase project. Set them in .env.test.local.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createTestUser(email: string, password: string) {
  const admin = adminClient();
  // Try to create; if exists, generate a new email instead.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!;
}

export async function deleteTestUser(userId: string) {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(userId);
}

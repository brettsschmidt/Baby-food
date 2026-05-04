"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in");
  if (!adminEmails().has(user.email.toLowerCase())) {
    throw new Error("Admin only");
  }
  return user;
}

export async function clearErrorLogs(): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("error_logs")
    .delete()
    .gte("created_at", "1970-01-01");
  revalidatePath("/admin");
}

export async function clearTimingLogs(): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("timing_logs")
    .delete()
    .gte("created_at", "1970-01-01");
  revalidatePath("/admin");
}

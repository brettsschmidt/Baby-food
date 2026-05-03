import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

interface ErrorContext {
  surface?: "client" | "server" | "edge";
  digest?: string;
  url?: string;
  userAgent?: string;
  householdId?: string;
}

/**
 * Insert an error into the self-hosted `error_logs` table.
 * Falls back to console if the admin client isn't configured.
 */
export async function captureException(
  error: unknown,
  context: ErrorContext = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[observability]", message, context);

  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({
      surface: context.surface ?? "server",
      message,
      digest: context.digest ?? null,
      stack: stack?.slice(0, 8000) ?? null,
      url: context.url ?? null,
      user_agent: context.userAgent ?? null,
      household_id: context.householdId ?? null,
    });
  } catch {
    // observability must not throw
  }
}

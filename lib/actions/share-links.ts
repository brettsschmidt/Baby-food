"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { generateShareToken } from "@/lib/share-token";

const SCOPES = ["feed", "growth", "memories", "all"] as const;
type Scope = (typeof SCOPES)[number];

export async function createShareLink(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, role, userId } = await requireHousehold(supabase);
  if (role !== "owner") return;

  const scopeRaw = String(formData.get("scope") ?? "all");
  const scope = SCOPES.includes(scopeRaw as Scope) ? (scopeRaw as Scope) : "all";

  for (let i = 0; i < 5; i++) {
    const token = generateShareToken();
    const { error } = await supabase.from("share_links").insert({
      household_id: householdId,
      token,
      scope,
      created_by: userId,
    });
    if (!error) break;
    if (error.code !== "23505") throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function revokeShareLink(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/settings");
}

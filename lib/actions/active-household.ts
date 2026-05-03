"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function setActiveHousehold(formData: FormData): Promise<void> {
  const householdId = String(formData.get("household_id") ?? "");
  if (!householdId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Confirm membership before saving.
  const { data: member } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!member) return;

  await supabase
    .from("household_member_prefs")
    .upsert(
      { household_id: householdId, user_id: user.id, active_household_id: householdId },
      { onConflict: "household_id,user_id" },
    );

  revalidatePath("/", "layout");
}

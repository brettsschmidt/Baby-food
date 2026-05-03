"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function setActiveBaby(formData: FormData): Promise<void> {
  const babyId = String(formData.get("baby_id") ?? "");
  if (!babyId) return;

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  await supabase
    .from("household_member_prefs")
    .upsert(
      { household_id: householdId, user_id: userId, active_baby_id: babyId },
      { onConflict: "household_id,user_id" },
    );

  revalidatePath("/", "layout");
}

export async function addBabyFromSettings(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");
  if (!name || !birthDate) throw new Error("Name and birth date required");

  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: baby, error } = await supabase
    .from("babies")
    .insert({ household_id: householdId, name, birth_date: birthDate })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (baby) {
    await supabase.rpc("log_activity", {
      p_household_id: householdId,
      p_kind: "baby_added",
      p_ref_id: baby.id,
      p_summary: name,
    });
  }

  revalidatePath("/", "layout");
  redirect("/settings");
}

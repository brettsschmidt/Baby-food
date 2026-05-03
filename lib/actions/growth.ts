"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export async function logGrowth(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const measuredOn = String(formData.get("measured_on") ?? new Date().toISOString().slice(0, 10));
  const wRaw = String(formData.get("weight_kg") ?? "").trim();
  const lRaw = String(formData.get("length_cm") ?? "").trim();
  const hRaw = String(formData.get("head_cm") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const weight = wRaw ? Number(wRaw) : null;
  const length = lRaw ? Number(lRaw) : null;
  const head = hRaw ? Number(hRaw) : null;

  if (weight == null && length == null && head == null) {
    throw new Error("Enter at least one measurement");
  }

  await supabase.from("growth_measurements").insert({
    household_id: householdId,
    baby_id: baby.id,
    measured_on: measuredOn,
    weight_kg: weight,
    length_cm: length,
    head_cm: head,
    notes,
    created_by: userId,
  });
  revalidatePath("/growth");
}

export async function deleteGrowth(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("growth_measurements").delete().eq("id", id);
  revalidatePath("/growth");
}

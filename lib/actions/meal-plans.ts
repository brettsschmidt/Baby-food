"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const SLOTS = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "bedtime_bottle",
  "other",
] as const;
type Slot = (typeof SLOTS)[number];

export async function addMealPlan(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const plannedFor = String(
    formData.get("planned_for") ?? new Date().toISOString().slice(0, 10),
  );
  const slotRaw = String(formData.get("meal_slot") ?? "lunch");
  const slot = SLOTS.includes(slotRaw as Slot) ? (slotRaw as Slot) : "lunch";
  const inventoryItemId = String(formData.get("inventory_item_id") ?? "") || null;
  const customLabel = String(formData.get("custom_label") ?? "").trim() || null;
  if (!inventoryItemId && !customLabel) throw new Error("Pick an inventory item or label");

  await supabase.from("meal_plans").insert({
    household_id: householdId,
    baby_id: baby.id,
    planned_for: plannedFor,
    meal_slot: slot,
    inventory_item_id: inventoryItemId,
    custom_label: customLabel,
    created_by: userId,
  });
  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

export async function toggleMealDone(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const done = formData.get("done") === "true";
  if (!id) return;
  await supabase.from("meal_plans").update({ done: !done }).eq("id", id);
  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

export async function deleteMealPlan(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("meal_plans").delete().eq("id", id);
  revalidatePath("/meals");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold, getActiveBaby } from "@/lib/queries/household";

const MOODS = ["loved", "liked", "neutral", "disliked", "refused"] as const;
const METHODS = ["spoon", "self_feed", "bottle", "breast"] as const;

type Mood = (typeof MOODS)[number];
type Method = (typeof METHODS)[number];

export async function logFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId);
  if (!baby) throw new Error("Add a baby first");

  const fedAtRaw = String(formData.get("fed_at") ?? "");
  const fedAt = fedAtRaw ? new Date(fedAtRaw).toISOString() : new Date().toISOString();
  const moodRaw = String(formData.get("mood") ?? "");
  const mood = MOODS.includes(moodRaw as Mood) ? (moodRaw as Mood) : null;
  const methodRaw = String(formData.get("method") ?? "spoon");
  const method = METHODS.includes(methodRaw as Method) ? (methodRaw as Method) : "spoon";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const inventoryItemId = String(formData.get("inventory_item_id") ?? "") || null;
  const customFood = String(formData.get("custom_food") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  const { data: feeding, error } = await supabase
    .from("feedings")
    .insert({
      household_id: householdId,
      baby_id: baby.id,
      fed_at: fedAt,
      fed_by: userId,
      method,
      mood,
      notes,
    })
    .select("id")
    .single();

  if (error || !feeding) throw new Error(error?.message ?? "Failed");

  if (inventoryItemId || customFood) {
    await supabase.from("feeding_items").insert({
      feeding_id: feeding.id,
      inventory_item_id: inventoryItemId,
      quantity: inventoryItemId ? quantity : null,
      notes: customFood || null,
    });
  }

  revalidatePath("/feedings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/feedings");
}

export async function deleteFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id"));
  if (!id) return;
  await supabase
    .from("feedings")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/feedings");
}

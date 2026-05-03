"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function addShoppingItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const text = String(formData.get("text") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  if (!text) return;

  await supabase.from("shopping_list_items").insert({
    household_id: householdId,
    text,
    quantity,
    created_by: userId,
  });
  revalidatePath("/shopping");
}

export async function toggleShoppingItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const completed = formData.get("completed") === "true";
  if (!id) return;
  await supabase
    .from("shopping_list_items")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/shopping");
}

export async function clearCompletedShopping(): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  await supabase
    .from("shopping_list_items")
    .delete()
    .eq("household_id", householdId)
    .not("completed_at", "is", null);
  revalidatePath("/shopping");
}

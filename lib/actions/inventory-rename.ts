"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function renameInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await supabase.from("inventory_items").update({ name }).eq("id", id);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function toggleStarItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { data: row } = await supabase
    .from("inventory_items")
    .select("starred")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("inventory_items").update({ starred: !row?.starred }).eq("id", id);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function restoreFeedingAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.rpc("restore_feeding", { p_id: id });
  revalidatePath("/feedings");
  revalidatePath("/feedings/archive");
}

export async function restoreInventoryAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.rpc("restore_inventory_item", { p_id: id });
  revalidatePath("/inventory");
  revalidatePath("/inventory/archive");
}

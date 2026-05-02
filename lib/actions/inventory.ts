"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const STORAGES = ["fridge", "freezer", "pantry"] as const;
const UNITS = ["cube", "jar", "pouch", "g", "ml", "serving"] as const;
const REASONS = ["prep", "feeding", "waste", "correction", "restock"] as const;

type Storage = (typeof STORAGES)[number];
type Unit = (typeof UNITS)[number];
type Reason = (typeof REASONS)[number];

export async function createInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const name = String(formData.get("name") ?? "").trim();
  const storageRaw = String(formData.get("storage") ?? "freezer");
  const unitRaw = String(formData.get("unit") ?? "cube");
  const quantity = Number(formData.get("quantity") ?? 0);
  const expiry = String(formData.get("expiry_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("Name required");
  if (Number.isNaN(quantity) || quantity < 0) throw new Error("Invalid quantity");

  const storage = STORAGES.includes(storageRaw as Storage)
    ? (storageRaw as Storage)
    : "freezer";
  const unit = UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube";

  const { error } = await supabase.from("inventory_items").insert({
    household_id: householdId,
    name,
    storage,
    unit,
    quantity,
    initial_quantity: quantity,
    prep_date: new Date().toISOString().slice(0, 10),
    expiry_date: expiry,
    notes,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

export async function adjustInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const id = String(formData.get("id"));
  const delta = Number(formData.get("delta"));
  const reasonRaw = String(formData.get("reason") ?? "correction");
  const reason = REASONS.includes(reasonRaw as Reason) ? (reasonRaw as Reason) : "correction";

  if (!id || Number.isNaN(delta) || delta === 0) return;

  const { error } = await supabase.from("inventory_movements").insert({
    household_id: householdId,
    inventory_item_id: id,
    delta,
    reason,
    created_by: userId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
}

export async function archiveInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase
    .from("inventory_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/inventory");
  redirect("/inventory");
}

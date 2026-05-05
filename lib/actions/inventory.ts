"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getHouseholdSettings, requireHousehold } from "@/lib/queries/household";
import { addDays, formatISODate } from "@/lib/dates";

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
  let expiry = String(formData.get("expiry_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lowStockRaw = String(formData.get("low_stock_threshold") ?? "");
  const lowStock = lowStockRaw ? Number(lowStockRaw) : null;
  const photoPath = String(formData.get("photo_path") ?? "") || null;
  const subLocation = String(formData.get("sub_location") ?? "").trim() || null;

  if (!name) throw new Error("Name required");
  if (Number.isNaN(quantity) || quantity < 0) throw new Error("Invalid quantity");

  const storage = STORAGES.includes(storageRaw as Storage)
    ? (storageRaw as Storage)
    : "freezer";
  const unit = UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube";

  // Smart expiry default: derive from household setting if user left blank.
  if (!expiry) {
    const settings = await getHouseholdSettings(supabase, householdId);
    const days =
      storage === "freezer"
        ? settings.freezerDays
        : storage === "fridge"
          ? settings.fridgeDays
          : settings.pantryDays;
    expiry = formatISODate(addDays(new Date(), days));
  }

  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({
      household_id: householdId,
      name,
      storage,
      unit,
      quantity,
      initial_quantity: quantity,
      prep_date: new Date().toISOString().slice(0, 10),
      expiry_date: expiry,
      notes,
      low_stock_threshold: lowStock,
      photo_path: photoPath,
      sub_location: subLocation,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (item) {
    await supabase.rpc("log_activity", {
      p_household_id: householdId,
      p_kind: "inventory_added",
      p_ref_id: item.id,
      p_summary: `${name} (${quantity} ${unit})`,
    });
  }

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

  // Restock auto-prep: when an item drops to/under its low_stock_threshold and
  // we know the recipe that produced it, queue a draft prep_plan (status='planned')
  // for tomorrow. Idempotent: skip if a planned prep already exists for the same recipe.
  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name, quantity, low_stock_threshold, batch_id")
    .eq("id", id)
    .maybeSingle();

  if (
    item &&
    item.low_stock_threshold != null &&
    item.quantity <= item.low_stock_threshold &&
    item.batch_id
  ) {
    const { data: lastPrep } = await supabase
      .from("prep_plans")
      .select("recipe_id")
      .eq("id", item.batch_id)
      .maybeSingle();
    const recipeId = lastPrep?.recipe_id;
    if (recipeId) {
      const { data: existing } = await supabase
        .from("prep_plans")
        .select("id")
        .eq("household_id", householdId)
        .eq("recipe_id", recipeId)
        .eq("status", "planned")
        .maybeSingle();
      if (!existing) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await supabase.from("prep_plans").insert({
          household_id: householdId,
          recipe_id: recipeId,
          scheduled_for: tomorrow.toISOString().slice(0, 10),
          notes: `Auto-restock for ${item.name}`,
          created_by: userId,
        });
      }
    }
  }

  // Auto-add to shopping list when low stock and no pending entry exists.
  if (
    item &&
    item.name &&
    item.low_stock_threshold != null &&
    item.quantity <= item.low_stock_threshold
  ) {
    const { data: existingShop } = await supabase
      .from("shopping_list_items")
      .select("id")
      .eq("household_id", householdId)
      .ilike("text", item.name)
      .is("completed_at", null)
      .maybeSingle();
    if (!existingShop) {
      await supabase.from("shopping_list_items").insert({
        household_id: householdId,
        text: item.name,
        quantity: "low stock",
        created_by: userId,
      });
    }
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/planner");
  revalidatePath("/shopping");
}

export async function archiveInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase
    .from("inventory_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "inventory_archived",
    p_ref_id: id,
    p_summary: null,
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function bulkArchiveInventory(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const ids = formData.getAll("id").map(String).filter(Boolean);
  const reasonRaw = String(formData.get("reason") ?? "waste");
  const reason = REASONS.includes(reasonRaw as Reason) ? (reasonRaw as Reason) : "waste";
  if (ids.length === 0) return;

  // Insert a movement zero-ing out each item, then archive it.
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, quantity")
    .in("id", ids);

  for (const item of items ?? []) {
    if (item.quantity > 0) {
      await supabase.from("inventory_movements").insert({
        household_id: householdId,
        inventory_item_id: item.id,
        delta: -item.quantity,
        reason,
        created_by: userId,
      });
    }
  }
  await supabase
    .from("inventory_items")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids);

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "inventory_archived",
    p_ref_id: null,
    p_summary: `Bulk: ${ids.length} items (${reason})`,
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

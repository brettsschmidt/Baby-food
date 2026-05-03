"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const STORAGES = ["fridge", "freezer", "pantry"] as const;
type Storage = (typeof STORAGES)[number];

export async function reserveInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const dateRaw = String(formData.get("reserved_for") ?? "");
  if (!id) return;

  await supabase
    .from("inventory_items")
    .update({
      reserved_at: new Date().toISOString(),
      reserved_for: dateRaw || new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function releaseInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("inventory_items")
    .update({ reserved_at: null, reserved_for: null })
    .eq("id", id);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function moveInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const storageRaw = String(formData.get("storage") ?? "");
  const subLocation = String(formData.get("sub_location") ?? "").trim() || null;
  if (!id) return;
  const storage = STORAGES.includes(storageRaw as Storage)
    ? (storageRaw as Storage)
    : undefined;
  await supabase
    .from("inventory_items")
    .update({
      ...(storage ? { storage } : {}),
      sub_location: subLocation,
    })
    .eq("id", id);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function setInventoryCost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const dollars = Number(formData.get("cost_dollars") ?? 0);
  if (!id || Number.isNaN(dollars) || dollars < 0) return;
  await supabase
    .from("inventory_items")
    .update({ cost_cents: Math.round(dollars * 100) })
    .eq("id", id);
  revalidatePath(`/inventory/${id}`);
}

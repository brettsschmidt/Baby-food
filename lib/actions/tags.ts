"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const ENTITY_TYPES = ["food", "recipe", "memory", "feeding", "inventory_item"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

export async function addTag(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const entityTypeRaw = String(formData.get("entity_type") ?? "");
  const entityId = String(formData.get("entity_id") ?? "");
  const labelRaw = String(formData.get("label") ?? "").trim();
  if (!ENTITY_TYPES.includes(entityTypeRaw as EntityType) || !entityId || !labelRaw) return;

  const label = labelRaw.toLowerCase().slice(0, 32);
  await supabase.from("tags").insert({
    household_id: householdId,
    entity_type: entityTypeRaw as EntityType,
    entity_id: entityId,
    label,
  });

  revalidatePath("/", "layout");
}

export async function removeTag(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("tags").delete().eq("id", id);
  revalidatePath("/", "layout");
}

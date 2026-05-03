"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export async function addMemory(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  const photoPath = String(formData.get("photo_path") ?? "") || null;
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurred_on") ?? new Date().toISOString().slice(0, 10));
  const milestoneKind = String(formData.get("milestone_kind") ?? "").trim() || null;

  if (!photoPath && !caption && !milestoneKind) {
    throw new Error("Add a photo, caption, or milestone first");
  }

  await supabase.from("memories").insert({
    household_id: householdId,
    baby_id: baby?.id ?? null,
    photo_path: photoPath,
    caption,
    occurred_on: occurredOn,
    milestone_kind: milestoneKind,
    created_by: userId,
  });
  revalidatePath("/memories");
  redirect("/memories");
}

export async function deleteMemory(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Purge attached photo from Storage if present.
  const { data: row } = await supabase
    .from("memories")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.photo_path) {
    await supabase.storage.from("household-photos").remove([row.photo_path]);
  }
  await supabase.from("memories").delete().eq("id", id);
  revalidatePath("/memories");
}

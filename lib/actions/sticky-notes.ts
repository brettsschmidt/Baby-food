"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const COLORS = ["amber", "rose", "sky", "emerald", "violet"] as const;
type Color = (typeof COLORS)[number];

export async function addStickyNote(formData: FormData): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const colorRaw = String(formData.get("color") ?? "amber");
  const color = COLORS.includes(colorRaw as Color) ? colorRaw : "amber";

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  await supabase.from("sticky_notes").insert({
    household_id: householdId,
    body,
    color,
    created_by: userId,
  });
  revalidatePath("/dashboard");
}

export async function deleteStickyNote(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await requireHousehold(supabase);
  await supabase.from("sticky_notes").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export async function togglePinStickyNote(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const pinned = formData.get("pinned") === "true";
  if (!id) return;
  const supabase = await createClient();
  await requireHousehold(supabase);
  await supabase.from("sticky_notes").update({ pinned: !pinned }).eq("id", id);
  revalidatePath("/dashboard");
}

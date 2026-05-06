"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { getMilestoneItem, isChecklistKind } from "@/lib/milestones-catalog";

function parseAchievedAt(raw: string): string {
  const value = raw.trim();
  if (!value) return new Date().toISOString();
  // <input type="date"> gives "YYYY-MM-DD"; treat as that day at noon UTC
  // so a different timezone doesn't shift it to the previous day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00Z`).toISOString();
  }
  return new Date(value).toISOString();
}

export async function saveChecklistMilestone(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const kind = String(formData.get("kind") ?? "");
  if (!kind || !isChecklistKind(kind) || !getMilestoneItem(kind)) {
    throw new Error("Unknown milestone");
  }

  const achievedAt = parseAchievedAt(String(formData.get("achieved_at") ?? ""));
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const photoPath = String(formData.get("photo_path") ?? "").trim() || null;

  // If a new photo replaced an old one, clean up the previous file.
  const { data: existing } = await supabase
    .from("milestones")
    .select("id, photo_path")
    .eq("household_id", householdId)
    .eq("baby_id", baby.id)
    .eq("kind", kind)
    .maybeSingle();

  if (existing?.photo_path && existing.photo_path !== photoPath) {
    await supabase.storage.from("household-photos").remove([existing.photo_path]);
  }

  if (existing) {
    await supabase
      .from("milestones")
      .update({
        achieved_at: achievedAt,
        detail,
        photo_path: photoPath,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("milestones").insert({
      household_id: householdId,
      baby_id: baby.id,
      kind,
      achieved_at: achievedAt,
      detail,
      photo_path: photoPath,
    });
  }

  revalidatePath("/milestones");
}

export async function clearChecklistMilestone(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const kind = String(formData.get("kind") ?? "");
  if (!kind || !isChecklistKind(kind)) return;

  const { data: row } = await supabase
    .from("milestones")
    .select("id, photo_path")
    .eq("household_id", householdId)
    .eq("baby_id", baby.id)
    .eq("kind", kind)
    .maybeSingle();

  if (!row) return;

  if (row.photo_path) {
    await supabase.storage.from("household-photos").remove([row.photo_path]);
  }

  await supabase.from("milestones").delete().eq("id", row.id);
  revalidatePath("/milestones");
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const KINDS = ["vitamin_d", "iron", "other"] as const;
type Kind = (typeof KINDS)[number];

export async function logSupplement(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const kindRaw = String(formData.get("kind") ?? "vitamin_d");
  const kind = KINDS.includes(kindRaw as Kind) ? (kindRaw as Kind) : "vitamin_d";
  const dose = String(formData.get("dose") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await supabase.from("supplement_logs").insert({
    household_id: householdId,
    baby_id: baby.id,
    kind,
    dose,
    notes,
    created_by: userId,
  });
  revalidatePath("/care/supplements");
  revalidatePath("/care");
}

export async function deleteSupplement(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("supplement_logs").delete().eq("id", id);
  revalidatePath("/care/supplements");
}

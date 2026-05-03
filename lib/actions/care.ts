"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const DIAPER_KINDS = ["wet", "dirty", "both", "dry"] as const;
type DiaperKind = (typeof DIAPER_KINDS)[number];
const SLEEP_KINDS = ["night", "nap"] as const;
type SleepKind = (typeof SLEEP_KINDS)[number];

export async function logDiaper(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const kindRaw = String(formData.get("kind") ?? "wet");
  const kind = DIAPER_KINDS.includes(kindRaw as DiaperKind)
    ? (kindRaw as DiaperKind)
    : "wet";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const changedAtRaw = String(formData.get("changed_at") ?? "");
  const changedAt = changedAtRaw ? new Date(changedAtRaw).toISOString() : new Date().toISOString();

  await supabase.from("diaper_logs").insert({
    household_id: householdId,
    baby_id: baby.id,
    changed_at: changedAt,
    kind,
    notes,
    created_by: userId,
  });
  revalidatePath("/care");
  revalidatePath("/dashboard");
}

export async function startSleep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const kindRaw = String(formData.get("kind") ?? "nap");
  const kind = SLEEP_KINDS.includes(kindRaw as SleepKind) ? (kindRaw as SleepKind) : "nap";

  await supabase.from("sleep_logs").insert({
    household_id: householdId,
    baby_id: baby.id,
    started_at: new Date().toISOString(),
    kind,
    created_by: userId,
  });
  revalidatePath("/care");
}

export async function endSleep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("sleep_logs")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/care");
}

export async function deleteSleep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("sleep_logs").delete().eq("id", id);
  revalidatePath("/care");
}

export async function deleteDiaper(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("diaper_logs").delete().eq("id", id);
  revalidatePath("/care");
}

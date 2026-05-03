"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function clearActivityLog(): Promise<void> {
  const supabase = await createClient();
  const { householdId, role } = await requireHousehold(supabase);
  if (role !== "owner") return;
  await supabase.from("activity_log").delete().eq("household_id", householdId);
  revalidatePath("/activity");
  revalidatePath("/settings");
}

export async function pruneActivityNow(): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  await supabase.rpc("prune_activity_log", { p_household_id: householdId });
  revalidatePath("/activity");
}

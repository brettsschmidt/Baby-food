"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function startCaregiverShift(): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  // Close any open shift the user has.
  await supabase
    .from("caregiver_shifts")
    .update({ ends_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .is("ends_at", null);

  await supabase.from("caregiver_shifts").insert({
    household_id: householdId,
    user_id: userId,
    starts_at: new Date().toISOString(),
  });
  revalidatePath("/", "layout");
}

export async function endCaregiverShift(): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  await supabase
    .from("caregiver_shifts")
    .update({ ends_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .is("ends_at", null);
  revalidatePath("/", "layout");
}

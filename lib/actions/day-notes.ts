"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export async function upsertDayNote(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  const onDate = String(formData.get("on_date") ?? new Date().toISOString().slice(0, 10));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await supabase.from("day_notes").upsert(
    {
      household_id: householdId,
      baby_id: baby?.id ?? null,
      on_date: onDate,
      body,
      created_by: userId,
    },
    { onConflict: "household_id,baby_id,on_date" },
  );
  revalidatePath("/dashboard");
}

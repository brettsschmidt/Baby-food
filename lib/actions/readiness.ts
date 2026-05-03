"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export async function saveReadiness(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const sits = formData.get("sits_unsupported") === "on";
  const head = formData.get("has_head_control") === "on";
  const tongue = formData.get("lost_tongue_thrust") === "on";
  const interest = formData.get("shows_interest") === "on";
  const grasp = formData.get("can_grasp") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // "Ready" if 4 of 5 signs are present.
  const yes = [sits, head, tongue, interest, grasp].filter(Boolean).length;
  const ready = yes >= 4;

  await supabase.from("readiness_evaluations").insert({
    household_id: householdId,
    baby_id: baby.id,
    sits_unsupported: sits,
    has_head_control: head,
    lost_tongue_thrust: tongue,
    shows_interest: interest,
    can_grasp: grasp,
    ready,
    notes,
    created_by: userId,
  });

  revalidatePath("/care/readiness");
  revalidatePath("/feedings/new");
  redirect("/care/readiness");
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function rateFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { userId } = await requireHousehold(supabase);
  const feedingId = String(formData.get("feeding_id") ?? "");
  const stars = Number(formData.get("stars") ?? 0);
  if (!feedingId || stars < 1 || stars > 5) return;
  await supabase.from("feeding_ratings").upsert(
    { feeding_id: feedingId, rater_id: userId, stars },
    { onConflict: "feeding_id,rater_id" },
  );
  revalidatePath(`/feedings/${feedingId}`);
  revalidatePath("/feedings");
}

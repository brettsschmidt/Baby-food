"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function addFeedingComment(formData: FormData): Promise<void> {
  const feedingId = String(formData.get("feeding_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!feedingId || !body) return;

  const supabase = await createClient();
  const { userId } = await requireHousehold(supabase);

  await supabase.from("feeding_comments").insert({
    feeding_id: feedingId,
    author_id: userId,
    body: body.slice(0, 1000),
  });

  revalidatePath(`/feedings/${feedingId}`);
}

export async function deleteFeedingComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const feedingId = String(formData.get("feeding_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await requireHousehold(supabase);
  await supabase.from("feeding_comments").delete().eq("id", id);
  revalidatePath(`/feedings/${feedingId}`);
}

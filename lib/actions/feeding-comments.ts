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

export async function markCommentsRead(feedingId: string): Promise<void> {
  if (!feedingId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: rows } = await supabase
    .from("feeding_comments")
    .select("id, read_by")
    .eq("feeding_id", feedingId);
  for (const r of rows ?? []) {
    if (!(r.read_by ?? []).includes(user.id)) {
      await supabase
        .from("feeding_comments")
        .update({ read_by: [...(r.read_by ?? []), user.id] })
        .eq("id", r.id);
    }
  }
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

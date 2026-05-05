"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const EMOJIS = ["❤️", "👍", "🎉", "😂", "😮", "🥕"];

export async function toggleReaction(formData: FormData): Promise<void> {
  const activityId = String(formData.get("activity_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!activityId || !EMOJIS.includes(emoji)) return;

  const supabase = await createClient();
  const { userId } = await requireHousehold(supabase);

  const { data: existing } = await supabase
    .from("activity_reactions")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("activity_reactions").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("activity_reactions")
      .insert({ activity_id: activityId, user_id: userId, emoji });
  }
  revalidatePath("/activity");
}

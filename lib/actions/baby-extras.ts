"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function updateBabyTheme(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const themeColor = String(formData.get("theme_color") ?? "").trim() || null;
  const photoPath = String(formData.get("photo_path") ?? "").trim() || null;
  if (!id) return;
  const update: { theme_color?: string | null; photo_path?: string | null } = {};
  if (formData.has("theme_color")) update.theme_color = themeColor;
  if (formData.has("photo_path")) update.photo_path = photoPath;
  if (Object.keys(update).length === 0) return;
  await supabase.from("babies").update(update).eq("id", id);
  revalidatePath("/", "layout");
}

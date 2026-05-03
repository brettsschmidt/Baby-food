"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const PAGES = ["inventory", "feedings", "search"] as const;
type Page = (typeof PAGES)[number];

export async function saveFilter(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const pageRaw = String(formData.get("page") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const query = String(formData.get("query") ?? "").trim();
  if (!PAGES.includes(pageRaw as Page) || !name || !query) return;
  await supabase.from("saved_filters").insert({
    user_id: userId,
    household_id: householdId,
    page: pageRaw as Page,
    name,
    query,
  });
  revalidatePath(`/${pageRaw}`);
}

export async function deleteSavedFilter(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const page = String(formData.get("page") ?? "");
  if (!id) return;
  await supabase.from("saved_filters").delete().eq("id", id);
  revalidatePath(`/${page}`);
}

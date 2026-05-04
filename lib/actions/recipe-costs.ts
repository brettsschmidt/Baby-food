"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function addRecipeCost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);

  const recipeId = String(formData.get("recipe_id") ?? "");
  const ingredient = String(formData.get("ingredient") ?? "").trim();
  const dollars = Number(formData.get("cost_dollars") ?? 0);
  if (!recipeId || !ingredient || Number.isNaN(dollars) || dollars < 0) return;

  await supabase.from("recipe_costs").insert({
    recipe_id: recipeId,
    ingredient,
    cost_cents: Math.round(dollars * 100),
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function deleteRecipeCost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const recipeId = String(formData.get("recipe_id") ?? "");
  if (!id) return;
  await supabase.from("recipe_costs").delete().eq("id", id);
  revalidatePath(`/recipes/${recipeId}`);
}

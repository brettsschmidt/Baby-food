"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function importSharedFood(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: shared } = await supabase
    .from("shared_foods")
    .select("name, category, min_age_months, allergens, texture")
    .eq("id", id)
    .maybeSingle();
  if (!shared) return;

  await supabase.from("foods").upsert(
    {
      household_id: householdId,
      name: shared.name,
      category: shared.category,
      min_age_months: shared.min_age_months,
      allergens: shared.allergens,
      texture: shared.texture,
    },
    { onConflict: "household_id,name" },
  );
  revalidatePath("/recipes/library");
}

export async function contributeFoodToLibrary(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);

  const id = String(formData.get("food_id") ?? "");
  if (!id) return;
  const { data: food } = await supabase
    .from("foods")
    .select("name, category, min_age_months, allergens, texture")
    .eq("id", id)
    .maybeSingle();
  if (!food) return;

  await supabase.rpc("contribute_shared_food", {
    p_name: food.name,
    p_category: food.category,
    p_min_age_months: food.min_age_months,
    p_allergens: food.allergens,
    p_texture: food.texture,
  });
  revalidatePath("/recipes/library");
}

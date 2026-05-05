"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function rateRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { userId } = await requireHousehold(supabase);
  const recipeId = String(formData.get("recipe_id") ?? "");
  const stars = Number(formData.get("stars") ?? 0);
  if (!recipeId || stars < 1 || stars > 5) return;
  await supabase.from("recipe_ratings").upsert(
    { recipe_id: recipeId, rater_id: userId, stars },
    { onConflict: "recipe_id,rater_id" },
  );
  revalidatePath(`/recipes/${recipeId}`);
}

export async function addSubstitution(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const recipeId = String(formData.get("recipe_id") ?? "");
  const ingredient = String(formData.get("ingredient") ?? "").trim();
  const substitution = String(formData.get("substitution") ?? "").trim();
  if (!recipeId || !ingredient || !substitution) return;
  await supabase.from("recipe_substitutions").insert({
    recipe_id: recipeId,
    ingredient,
    substitution,
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function deleteSubstitution(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const recipeId = String(formData.get("recipe_id") ?? "");
  if (!id) return;
  await supabase.from("recipe_substitutions").delete().eq("id", id);
  revalidatePath(`/recipes/${recipeId}`);
}

export async function addRecipeStep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const recipeId = String(formData.get("recipe_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const photoPath = String(formData.get("photo_path") ?? "") || null;
  if (!recipeId || !body) return;
  const { count } = await supabase
    .from("recipe_steps")
    .select("*", { count: "exact", head: true })
    .eq("recipe_id", recipeId);
  await supabase.from("recipe_steps").insert({
    recipe_id: recipeId,
    body,
    photo_path: photoPath,
    position: count ?? 0,
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function deleteRecipeStep(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  const recipeId = String(formData.get("recipe_id") ?? "");
  if (!id) return;
  await supabase.from("recipe_steps").delete().eq("id", id);
  revalidatePath(`/recipes/${recipeId}`);
}

export async function setRecipeEquipment(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("recipe_id") ?? "");
  const equipment = String(formData.get("equipment") ?? "").trim() || null;
  if (!id) return;
  await supabase.from("recipes").update({ equipment }).eq("id", id);
  revalidatePath(`/recipes/${id}`);
}

export async function cloneRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const sourceId = String(formData.get("recipe_id") ?? "");
  if (!sourceId) return;

  const { data: src } = await supabase
    .from("recipes")
    .select(
      "name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, storage_default, default_expiry_days, steps, source_url, equipment, recipe_ingredients(ingredient, quantity, position)",
    )
    .eq("id", sourceId)
    .eq("household_id", householdId)
    .maybeSingle()
    .returns<{
      name: string;
      description: string | null;
      min_age_months: number | null;
      yield_quantity: number | null;
      yield_unit: "cube" | "jar" | "pouch" | "g" | "ml" | "serving" | null;
      prep_minutes: number | null;
      storage_default: "fridge" | "freezer" | "pantry" | null;
      default_expiry_days: number | null;
      steps: string | null;
      source_url: string | null;
      equipment: string | null;
      recipe_ingredients: { ingredient: string; quantity: string | null; position: number }[];
    }>();
  if (!src) return;

  const { data: copy, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      name: `${src.name} (variant)`,
      description: src.description,
      min_age_months: src.min_age_months,
      yield_quantity: src.yield_quantity,
      yield_unit: src.yield_unit ?? "cube",
      prep_minutes: src.prep_minutes,
      storage_default: src.storage_default ?? "freezer",
      default_expiry_days: src.default_expiry_days,
      steps: src.steps,
      source_url: src.source_url,
      equipment: src.equipment,
      parent_recipe_id: sourceId,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !copy) return;

  if (src.recipe_ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      src.recipe_ingredients.map((i) => ({
        recipe_id: copy.id,
        ingredient: i.ingredient,
        quantity: i.quantity,
        position: i.position,
      })),
    );
  }
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${copy.id}`);
}

export async function importRecipeJson(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const raw = String(formData.get("json") ?? "").trim();
  if (!raw) throw new Error("Paste a recipe JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (typeof parsed !== "object" || !parsed) throw new Error("Invalid recipe");
  const r = parsed as {
    name?: string;
    description?: string;
    ingredients?: { ingredient: string; quantity?: string }[];
    steps?: string;
    yield_quantity?: number;
    yield_unit?: string;
    min_age_months?: number;
  };
  if (!r.name) throw new Error("Recipe needs a name");
  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      name: r.name,
      description: r.description ?? null,
      yield_quantity: r.yield_quantity ?? null,
      yield_unit:
        r.yield_unit === "cube" ||
        r.yield_unit === "jar" ||
        r.yield_unit === "pouch" ||
        r.yield_unit === "g" ||
        r.yield_unit === "ml" ||
        r.yield_unit === "serving"
          ? r.yield_unit
          : "cube",
      min_age_months: r.min_age_months ?? null,
      steps: r.steps ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !recipe) throw new Error(error?.message ?? "Failed");
  if (Array.isArray(r.ingredients) && r.ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      r.ingredients.map((i, position) => ({
        recipe_id: recipe.id,
        ingredient: i.ingredient,
        quantity: i.quantity ?? null,
        position,
      })),
    );
  }
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.id}`);
}

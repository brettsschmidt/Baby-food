"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const STORAGES = ["fridge", "freezer", "pantry"] as const;
const UNITS = ["cube", "jar", "pouch", "g", "ml", "serving"] as const;
type Storage = (typeof STORAGES)[number];
type Unit = (typeof UNITS)[number];

function parseIngredients(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");

  const description = String(formData.get("description") ?? "").trim() || null;
  const minAge = formData.get("min_age_months");
  const yieldQty = formData.get("yield_quantity");
  const yieldUnitRaw = String(formData.get("yield_unit") ?? "cube");
  const prepMin = formData.get("prep_minutes");
  const storageRaw = String(formData.get("storage_default") ?? "freezer");
  const expiryDays = formData.get("default_expiry_days");
  const steps = String(formData.get("steps") ?? "").trim() || null;
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  const photoPath = String(formData.get("photo_path") ?? "") || null;
  const ingredientsRaw = String(formData.get("ingredients") ?? "");
  const ingredients = parseIngredients(ingredientsRaw);

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      name,
      description,
      min_age_months: minAge ? Number(minAge) : null,
      yield_quantity: yieldQty ? Number(yieldQty) : null,
      yield_unit: UNITS.includes(yieldUnitRaw as Unit) ? (yieldUnitRaw as Unit) : "cube",
      prep_minutes: prepMin ? Number(prepMin) : null,
      storage_default: STORAGES.includes(storageRaw as Storage)
        ? (storageRaw as Storage)
        : "freezer",
      default_expiry_days: expiryDays ? Number(expiryDays) : null,
      steps,
      source_url: sourceUrl,
      photo_path: photoPath,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !recipe) throw new Error(error?.message ?? "Failed");

  if (ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ingredient, position) => ({
        recipe_id: recipe.id,
        ingredient,
        position,
      })),
    );
  }

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "recipe_added",
    p_ref_id: recipe.id,
    p_summary: name,
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function archiveRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id"));
  if (!id) return;
  await supabase
    .from("recipes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/recipes");
  redirect("/recipes");
}

/** Cook a recipe → create a prep_plan + carry ingredients to shopping list. */
export async function planRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const recipeId = String(formData.get("recipe_id") ?? "");
  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  const addToShopping = formData.get("add_to_shopping") === "on";
  const scaleFactor = Math.max(
    0.25,
    Math.min(5, Number(formData.get("scale_factor") ?? 1) || 1),
  );
  if (!recipeId || !scheduledFor) throw new Error("Missing fields");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("name, yield_quantity, yield_unit")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) throw new Error("Recipe not found");

  const noteSuffix = scaleFactor === 1 ? "" : ` (×${scaleFactor})`;
  const { data: plan, error } = await supabase
    .from("prep_plans")
    .insert({
      household_id: householdId,
      scheduled_for: scheduledFor,
      notes: recipe.name + noteSuffix,
      recipe_id: recipeId,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "Failed");

  if (recipe.yield_quantity) {
    await supabase.from("prep_plan_items").insert({
      prep_plan_id: plan.id,
      planned_quantity: recipe.yield_quantity * scaleFactor,
      unit: recipe.yield_unit ?? "cube",
    });
  }

  if (addToShopping) {
    const { data: ings } = await supabase
      .from("recipe_ingredients")
      .select("ingredient, quantity")
      .eq("recipe_id", recipeId);
    if (ings && ings.length > 0) {
      await supabase.from("shopping_list_items").insert(
        ings.map((i) => ({
          household_id: householdId,
          text: i.ingredient,
          quantity: i.quantity,
          source_recipe_id: recipeId,
          source_prep_plan_id: plan.id,
          created_by: userId,
        })),
      );
    }
  }

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "prep_planned",
    p_ref_id: plan.id,
    p_summary: recipe.name,
  });

  revalidatePath("/planner");
  revalidatePath("/shopping");
  redirect("/planner");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function createCollection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  const description = String(formData.get("description") ?? "").trim() || null;
  const isPublic = formData.get("is_public_template") === "on";

  const { data: row, error } = await supabase
    .from("recipe_collections")
    .insert({
      household_id: householdId,
      name,
      description,
      is_public_template: isPublic,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed");

  revalidatePath("/recipes/collections");
  redirect(`/recipes/collections/${row.id}`);
}

export async function toggleRecipeInCollection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);

  const collectionId = String(formData.get("collection_id") ?? "");
  const recipeId = String(formData.get("recipe_id") ?? "");
  if (!collectionId || !recipeId) return;

  const { data: existing } = await supabase
    .from("recipe_collection_items")
    .select("collection_id")
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("recipe_collection_items")
      .delete()
      .eq("collection_id", collectionId)
      .eq("recipe_id", recipeId);
  } else {
    await supabase.from("recipe_collection_items").insert({
      collection_id: collectionId,
      recipe_id: recipeId,
    });
  }

  revalidatePath(`/recipes/collections/${collectionId}`);
}

export async function importCollection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const sourceId = String(formData.get("collection_id") ?? "");
  if (!sourceId) return;

  const { data: source } = await supabase
    .from("recipe_collections")
    .select("name, description, is_public_template, recipe_collection_items(recipes(name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, storage_default, default_expiry_days, steps, source_url))")
    .eq("id", sourceId)
    .maybeSingle()
    .returns<{
      name: string;
      description: string | null;
      is_public_template: boolean;
      recipe_collection_items: {
        recipes: {
          name: string;
          description: string | null;
          min_age_months: number | null;
          yield_quantity: number | null;
          yield_unit: string | null;
          prep_minutes: number | null;
          storage_default: string | null;
          default_expiry_days: number | null;
          steps: string | null;
          source_url: string | null;
        } | null;
      }[];
    }>();
  if (!source || !source.is_public_template) return;

  const { data: copy, error } = await supabase
    .from("recipe_collections")
    .insert({
      household_id: householdId,
      name: source.name,
      description: source.description,
      is_public_template: false,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !copy) return;

  const newRecipeIds: string[] = [];
  for (const item of source.recipe_collection_items ?? []) {
    if (!item.recipes) continue;
    const r = item.recipes;
    const { data: rec } = await supabase
      .from("recipes")
      .insert({
        household_id: householdId,
        name: r.name,
        description: r.description,
        min_age_months: r.min_age_months,
        yield_quantity: r.yield_quantity,
        yield_unit: (r.yield_unit ?? "cube") as
          | "cube"
          | "jar"
          | "pouch"
          | "g"
          | "ml"
          | "serving",
        prep_minutes: r.prep_minutes,
        storage_default: (r.storage_default ?? "freezer") as "fridge" | "freezer" | "pantry",
        default_expiry_days: r.default_expiry_days,
        steps: r.steps,
        source_url: r.source_url,
        created_by: userId,
      })
      .select("id")
      .single();
    if (rec) newRecipeIds.push(rec.id);
  }

  if (newRecipeIds.length > 0) {
    await supabase.from("recipe_collection_items").insert(
      newRecipeIds.map((id, position) => ({
        collection_id: copy.id,
        recipe_id: id,
        position,
      })),
    );
  }

  revalidatePath("/recipes/collections");
  redirect(`/recipes/collections/${copy.id}`);
}

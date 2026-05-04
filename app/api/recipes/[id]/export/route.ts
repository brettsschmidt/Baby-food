import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, steps, source_url, recipe_ingredients(ingredient, quantity, position)",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle()
    .returns<{
      name: string;
      description: string | null;
      min_age_months: number | null;
      yield_quantity: number | null;
      yield_unit: string | null;
      prep_minutes: number | null;
      steps: string | null;
      source_url: string | null;
      recipe_ingredients: { ingredient: string; quantity: string | null; position: number }[];
    }>();

  if (!recipe) return new NextResponse("not found", { status: 404 });

  const json = {
    name: recipe.name,
    description: recipe.description,
    min_age_months: recipe.min_age_months,
    yield_quantity: recipe.yield_quantity,
    yield_unit: recipe.yield_unit,
    prep_minutes: recipe.prep_minutes,
    steps: recipe.steps,
    source_url: recipe.source_url,
    ingredients: [...recipe.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ ingredient: i.ingredient, quantity: i.quantity })),
  };
  return NextResponse.json(json, {
    headers: {
      "Content-Disposition": `attachment; filename="${recipe.name.replace(/[^a-z0-9-_ ]/gi, "_")}.json"`,
    },
  });
}

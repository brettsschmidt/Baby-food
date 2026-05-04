import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown/markdown";
import { PrintTrigger } from "@/app/print/report/print-trigger";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export const dynamic = "force-dynamic";

export default async function RecipeCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, equipment, steps, source_url, recipe_ingredients(ingredient, quantity, position)",
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
      equipment: string | null;
      steps: string | null;
      source_url: string | null;
      recipe_ingredients: { ingredient: string; quantity: string | null; position: number }[];
    }>();
  if (!recipe) notFound();

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 print:p-2">
      <PrintTrigger />
      <header className="border-b pb-3">
        <h1 className="text-3xl font-bold">{recipe.name}</h1>
        {recipe.description && (
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {[
            recipe.min_age_months ? `${recipe.min_age_months}m+` : null,
            recipe.prep_minutes ? `${recipe.prep_minutes} min` : null,
            recipe.yield_quantity ? `Yields ${recipe.yield_quantity} ${recipe.yield_unit ?? ""}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <section>
        <h2 className="font-semibold">Ingredients</h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {ingredients.map((i) => (
            <li key={i.position}>
              {i.quantity ? <strong>{i.quantity}</strong> : null} {i.ingredient}
            </li>
          ))}
        </ul>
      </section>

      {recipe.equipment && (
        <section>
          <h2 className="font-semibold">Equipment</h2>
          <p className="text-sm">{recipe.equipment}</p>
        </section>
      )}

      {recipe.steps && (
        <section>
          <h2 className="font-semibold">Steps</h2>
          <Markdown source={recipe.steps} />
        </section>
      )}

      {recipe.source_url && (
        <p className="text-xs text-muted-foreground">
          Source: <a className="underline" href={recipe.source_url}>{recipe.source_url}</a>
        </p>
      )}
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveRecipe, planRecipe } from "@/lib/actions/recipes";
import { Markdown } from "@/components/markdown/markdown";
import { ScaleIngredients } from "@/components/recipes/scale-ingredients";
import { RecipeCostPanel } from "@/components/recipes/recipe-cost-panel";
import { StarRating } from "@/components/feedings/star-rating";
import { TagList } from "@/components/tags/tag-list";
import {
  addSubstitution,
  cloneRecipe,
  deleteSubstitution,
  setRecipeEquipment,
} from "@/lib/actions/recipe-extras";
import { createClient } from "@/lib/supabase/server";
import { getHouseholdSettings, requireHousehold } from "@/lib/queries/household";
import { lookupNutrition } from "@/lib/nutrition";

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return format(d, "yyyy-MM-dd");
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type RecipeDetail = {
    id: string;
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
    photo_path: string | null;
    equipment: string | null;
    recipe_ingredients: { id: string; ingredient: string; quantity: string | null; position: number }[];
  };

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, storage_default, default_expiry_days, steps, source_url, photo_path, equipment, recipe_ingredients(id, ingredient, quantity, position)",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .maybeSingle()
    .returns<RecipeDetail>();

  if (!recipe) notFound();
  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position);
  const settings = await getHouseholdSettings(supabase, householdId);

  const { data: tags } = await supabase
    .from("tags")
    .select("id, label")
    .eq("household_id", householdId)
    .eq("entity_type", "recipe")
    .eq("entity_id", recipe.id);

  const nutritionFacts = ingredients
    .map((i) => ({ ingredient: i.ingredient, n: lookupNutrition(i.ingredient) }))
    .filter((x): x is { ingredient: string; n: NonNullable<ReturnType<typeof lookupNutrition>> } => !!x.n);

  const { data: costs } = await supabase
    .from("recipe_costs")
    .select("id, ingredient, cost_cents")
    .eq("recipe_id", recipe.id)
    .order("created_at", { ascending: true });

  const { data: subs } = await supabase
    .from("recipe_substitutions")
    .select("id, ingredient, substitution")
    .eq("recipe_id", recipe.id)
    .order("created_at", { ascending: true });

  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  const myUserId = user?.id ?? null;
  const { data: ratings } = await supabase
    .from("recipe_ratings")
    .select("rater_id, stars")
    .eq("recipe_id", recipe.id);
  const myRating = (ratings ?? []).find((r) => r.rater_id === myUserId)?.stars ?? null;
  const avg =
    (ratings ?? []).length > 0
      ? (ratings ?? []).reduce((s, r) => s + r.stars, 0) / (ratings ?? []).length
      : null;

  return (
    <>
      <AppHeader
        title="Recipe"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold">{recipe.name}</h1>
            <div className="flex flex-wrap gap-1">
              {recipe.min_age_months != null && <Badge>{recipe.min_age_months}m+</Badge>}
              {recipe.prep_minutes && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {recipe.prep_minutes}m
                </Badge>
              )}
            </div>
          </div>
          {recipe.description && (
            <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <StarRating
              entityId={recipe.id}
              kind="recipe"
              current={myRating}
              averageStars={avg}
              size="sm"
            />
          </div>
          <div className="mt-2">
            <TagList entityType="recipe" entityId={recipe.id} tags={tags ?? []} />
          </div>
        </div>

        {recipe.photo_path && (
          <Image
            src={`/api/photo?path=${encodeURIComponent(recipe.photo_path)}`}
            alt={recipe.name}
            width={600}
            height={400}
            unoptimized
            className="w-full rounded-lg object-cover"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ScaleIngredients
              ingredients={ingredients}
              yieldQuantity={recipe.yield_quantity}
              yieldUnit={recipe.yield_unit}
              units={settings.units}
            />
          </CardContent>
        </Card>

        {recipe.steps && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown source={recipe.steps} className="text-sm" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Substitutions</CardTitle>
          </CardHeader>
          <CardContent>
            {(subs ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Note swaps you&apos;ve tried (e.g. butternut → sweet potato).
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {subs!.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                    <span>
                      <strong>{s.ingredient}</strong> → {s.substitution}
                    </span>
                    <form action={deleteSubstitution}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="recipe_id" value={recipe.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        aria-label="Remove substitution"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addSubstitution} className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1">
              <input type="hidden" name="recipe_id" value={recipe.id} />
              <Input name="ingredient" placeholder="Ingredient" />
              <Input name="substitution" placeholder="Swap with…" />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={setRecipeEquipment} className="flex gap-2">
              <input type="hidden" name="recipe_id" value={recipe.id} />
              <Input
                name="equipment"
                placeholder="Steamer basket, blender, ice cube tray…"
                defaultValue={recipe.equipment ?? ""}
              />
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <form action={cloneRecipe}>
            <input type="hidden" name="recipe_id" value={recipe.id} />
            <Button type="submit" variant="outline" size="sm">
              Clone as variant
            </Button>
          </form>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/print/recipe/${recipe.id}`} target="_blank">
              Print card
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/recipes/${recipe.id}/export`} download>
              Export JSON
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost per batch</CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeCostPanel
              recipeId={recipe.id}
              costs={costs ?? []}
              yieldQuantity={recipe.yield_quantity}
              yieldUnit={recipe.yield_unit}
            />
          </CardContent>
        </Card>

        {nutritionFacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated nutrition (per 100g raw)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {nutritionFacts.map((f) => (
                  <li key={f.ingredient} className="flex justify-between gap-2 border-b pb-1 last:border-0">
                    <span>{f.ingredient}</span>
                    <span className="text-muted-foreground">
                      {f.n.kcal} kcal · {f.n.protein_g}g protein · {f.n.iron_mg}mg iron
                      {f.n.vit_c_mg != null && <> · vit C {f.n.vit_c_mg}mg</>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Approximate values — not medical advice.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan a prep from this</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="plan-recipe" action={planRecipe} className="space-y-3">
              <input type="hidden" name="recipe_id" value={recipe.id} />
              <div className="space-y-2">
                <Label htmlFor="scheduled_for">When</Label>
                <Input
                  id="scheduled_for"
                  name="scheduled_for"
                  type="date"
                  defaultValue={tomorrow()}
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="add_to_shopping" defaultChecked />
                Add ingredients to shopping list
              </label>
              <Button type="submit" className="w-full">
                Schedule prep
              </Button>
            </form>
          </CardContent>
        </Card>

        {recipe.source_url && (
          <a
            className="block text-center text-xs text-muted-foreground underline"
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        )}

        <form action={archiveRecipe}>
          <input type="hidden" name="id" value={recipe.id} />
          <Button type="submit" variant="ghost" className="w-full text-destructive">
            <Trash2 className="h-4 w-4" /> Archive recipe
          </Button>
        </form>
      </div>
    </>
  );
}

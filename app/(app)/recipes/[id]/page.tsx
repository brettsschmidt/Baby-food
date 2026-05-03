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
import { ScaleIngredients } from "@/components/recipes/scale-ingredients";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

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
    recipe_ingredients: { id: string; ingredient: string; quantity: string | null; position: number }[];
  };

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, name, description, min_age_months, yield_quantity, yield_unit, prep_minutes, storage_default, default_expiry_days, steps, source_url, photo_path, recipe_ingredients(id, ingredient, quantity, position)",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .maybeSingle()
    .returns<RecipeDetail>();

  if (!recipe) notFound();
  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position);

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
            />
          </CardContent>
        </Card>

        {recipe.steps && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm">{recipe.steps}</p>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleRecipeInCollection } from "@/lib/actions/collections";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: collection } = await supabase
    .from("recipe_collections")
    .select(
      "id, name, description, is_public_template, household_id, recipe_collection_items(recipe_id)",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<{
      id: string;
      name: string;
      description: string | null;
      is_public_template: boolean;
      household_id: string;
      recipe_collection_items: { recipe_id: string }[];
    }>();
  if (!collection) notFound();

  const owned = collection.household_id === householdId;
  const inIds = new Set(collection.recipe_collection_items.map((r) => r.recipe_id));

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, description, min_age_months, prep_minutes")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  return (
    <>
      <AppHeader
        title={collection.name}
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/recipes/collections">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        {collection.description && (
          <p className="text-sm text-muted-foreground">{collection.description}</p>
        )}
        {collection.is_public_template && (
          <Badge variant="secondary" className="gap-1">
            <Globe className="h-3 w-3" /> Public template
          </Badge>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {owned ? "Recipes in this collection" : "Included recipes"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recipes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recipes in your household yet. Add some on{" "}
                <Link href="/recipes" className="underline">
                  /recipes
                </Link>
                .
              </p>
            ) : (
              recipes!.map((r) => {
                const inCollection = inIds.has(r.id);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border bg-card p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          r.min_age_months ? `${r.min_age_months}m+` : null,
                          r.prep_minutes ? `${r.prep_minutes} min` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {owned ? (
                      <form action={toggleRecipeInCollection}>
                        <input type="hidden" name="collection_id" value={collection.id} />
                        <input type="hidden" name="recipe_id" value={r.id} />
                        <Button type="submit" size="sm" variant={inCollection ? "default" : "outline"}>
                          {inCollection ? "Remove" : "Add"}
                        </Button>
                      </form>
                    ) : (
                      <Badge variant={inCollection ? "default" : "secondary"}>
                        {inCollection ? "Included" : "—"}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

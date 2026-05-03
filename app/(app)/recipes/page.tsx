import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { ageInMonths } from "@/lib/dates";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  const babyAge = baby ? ageInMonths(baby.birth_date) : null;

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, description, min_age_months, prep_minutes")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <>
      <AppHeader
        title="Recipes"
        action={
          <Button asChild size="sm">
            <Link href="/recipes/new">
              <Plus className="h-4 w-4" />
              New
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-2 px-4 py-4 pb-8">
        {!recipes || recipes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border p-10 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No recipes yet</p>
              <p className="text-sm text-muted-foreground">
                Save the recipes you make often so prep is one tap away.
              </p>
            </div>
            <Button asChild>
              <Link href="/recipes/new">
                <Plus className="h-4 w-4" /> Add recipe
              </Link>
            </Button>
          </div>
        ) : (
          recipes.map((r) => {
            const tooYoung =
              r.min_age_months != null && babyAge != null && babyAge < r.min_age_months;
            return (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.description ??
                      [
                        r.min_age_months ? `${r.min_age_months}m+` : null,
                        r.prep_minutes ? `${r.prep_minutes} min` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                  </p>
                </div>
                {tooYoung && <Badge variant="warning">{r.min_age_months}m+</Badge>}
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}

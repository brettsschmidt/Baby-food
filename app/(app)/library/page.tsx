import { Globe, Plus } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importSharedFood } from "@/lib/actions/shared-foods";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { ageInMonths } from "@/lib/dates";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  const monthsOld = baby ? ageInMonths(baby.birth_date) : null;

  const { data: foods } = await supabase
    .from("shared_foods")
    .select("id, name, category, min_age_months, allergens, texture, intro_count")
    .order("intro_count", { ascending: false })
    .limit(100);

  // Pre-list which foods we already have in our catalog
  const { data: ours } = await supabase
    .from("foods")
    .select("name")
    .eq("household_id", householdId);
  const oursLower = new Set((ours ?? []).map((f) => f.name.toLowerCase()));

  return (
    <>
      <AppHeader title="Library" />
      <div className="flex-1 space-y-3 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" /> Foods other parents log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Anonymized catalog. Tap + to add to your household.
              {monthsOld != null && (
                <>
                  {" "}
                  Filtered to suit a {monthsOld}-month-old.
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <ul className="space-y-2">
          {(foods ?? [])
            .filter((f) => monthsOld == null || (f.min_age_months ?? 0) <= monthsOld)
            .map((f) => {
              const haveIt = oursLower.has(f.name.toLowerCase());
              return (
                <li
                  key={f.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        f.category,
                        f.min_age_months != null ? `${f.min_age_months}m+` : null,
                        f.texture,
                        `tried by ${f.intro_count}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {f.allergens.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.allergens.map((a) => (
                          <Badge key={a} variant="warning" className="text-[10px]">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {haveIt ? (
                    <span className="text-xs text-muted-foreground">Already added</span>
                  ) : (
                    <form action={importSharedFood}>
                      <input type="hidden" name="id" value={f.id} />
                      <Button type="submit" size="sm" variant="outline">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
        </ul>
      </div>
    </>
  );
}

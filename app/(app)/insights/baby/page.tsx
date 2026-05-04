import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ageInMonths } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export default async function BabyInsightsPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Baby insights" />
        <div className="flex-1 px-6 py-12 text-center text-sm text-muted-foreground">
          Add a baby first.
        </div>
      </>
    );
  }

  // First-introduction timeline + cumulative variety
  const { data: items } = await supabase
    .from("feeding_items")
    .select(
      "is_first_try, notes, inventory_items(name), foods(name), feedings!inner(fed_at, baby_id, household_id, archived_at)",
    )
    .eq("feedings.household_id", householdId)
    .eq("feedings.baby_id", baby.id)
    .is("feedings.archived_at", null)
    .order("feedings(fed_at)", { ascending: true })
    .returns<
      {
        is_first_try: boolean;
        notes: string | null;
        inventory_items: { name: string | null } | null;
        foods: { name: string | null } | null;
        feedings: { fed_at: string } | null;
      }[]
    >();

  const seen = new Set<string>();
  const introductions: { name: string; fedAt: string; cumulative: number }[] = [];
  for (const it of items ?? []) {
    const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
    if (!name || !it.feedings) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      introductions.push({ name, fedAt: it.feedings.fed_at, cumulative: seen.size });
    }
  }

  return (
    <>
      <AppHeader
        title={`Insights · ${baby.name}`}
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/insights">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{baby.name} · {ageInMonths(baby.birth_date)} months</p>
          <Badge variant="secondary">{seen.size} foods tried</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">First-introduction timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {introductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No introductions yet.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {introductions.slice(-30).map((i) => (
                  <li
                    key={i.name}
                    className="flex items-center justify-between border-b pb-1 last:border-0"
                  >
                    <span>{i.name}</span>
                    <span className="text-xs text-muted-foreground">
                      #{i.cumulative} ·{" "}
                      {new Date(i.fedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifetime variety</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{seen.size}</p>
            <p className="text-xs text-muted-foreground">distinct foods recorded</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

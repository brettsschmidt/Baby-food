import Link from "next/link";
import { Check, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { addMealPlan, deleteMealPlan, toggleMealDone } from "@/lib/actions/meal-plans";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { cn } from "@/lib/utils";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning snack",
  lunch: "Lunch",
  afternoon_snack: "Afternoon snack",
  dinner: "Dinner",
  bedtime_bottle: "Bedtime bottle",
  other: "Other",
};

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const date = d ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Meal plan" />
        <div className="flex-1 px-6 py-12 text-center text-sm text-muted-foreground">
          Add a baby first.
        </div>
      </>
    );
  }

  const [{ data: plans }, { data: inventory }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("id, meal_slot, inventory_item_id, custom_label, done, inventory_items(name)")
      .eq("baby_id", baby.id)
      .eq("planned_for", date)
      .order("created_at", { ascending: true })
      .returns<
        {
          id: string;
          meal_slot: string;
          inventory_item_id: string | null;
          custom_label: string | null;
          done: boolean;
          inventory_items: { name: string | null } | null;
        }[]
      >(),
    supabase
      .from("inventory_items")
      .select("id, name, unit, quantity")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gt("quantity", 0)
      .order("name", { ascending: true })
      .limit(100),
  ]);

  return (
    <>
      <RealtimeRefresher tables={["meal_plans"]} householdId={householdId} />
      <AppHeader title={`Meals · ${baby.name}`} />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{format(new Date(date), "EEEE, MMM d")}</h2>
          <div className="flex gap-1">
            {[-1, 0, 1].map((delta) => {
              const dt = new Date(date);
              dt.setDate(dt.getDate() + delta);
              const key = dt.toISOString().slice(0, 10);
              return (
                <Button key={key} asChild size="sm" variant={delta === 0 ? "default" : "ghost"}>
                  <Link href={`/meals?d=${key}`}>{format(dt, "EEE")}</Link>
                </Button>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> Add to today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addMealPlan} className="space-y-3">
              <input type="hidden" name="planned_for" value={date} />
              <div className="space-y-1">
                <Label htmlFor="meal_slot">Slot</Label>
                <select
                  id="meal_slot"
                  name="meal_slot"
                  defaultValue="lunch"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                >
                  {Object.entries(SLOT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="inventory_item_id">From inventory</Label>
                <select
                  id="inventory_item_id"
                  name="inventory_item_id"
                  defaultValue=""
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="">— pick —</option>
                  {inventory?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantity} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom_label">Or label</Label>
                <Input
                  id="custom_label"
                  name="custom_label"
                  placeholder="Banana on toast"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full">
                Plan this meal
              </Button>
            </form>
          </CardContent>
        </Card>

        <ul className="space-y-2">
          {(plans ?? []).length === 0 ? (
            <li className="rounded-md border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing planned yet for this day.
            </li>
          ) : (
            plans!.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border bg-card p-3",
                  p.done && "opacity-60",
                )}
              >
                <form action={toggleMealDone}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="done" value={String(p.done)} />
                  <button
                    type="submit"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border",
                      p.done && "border-primary bg-primary text-primary-foreground",
                    )}
                    aria-label={p.done ? "Mark as not done" : "Mark done"}
                  >
                    {p.done && <Check className="h-3 w-3" />}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", p.done && "line-through")}>
                    {p.inventory_items?.name ?? p.custom_label ?? "Meal"}
                  </p>
                  <Badge variant="secondary" className="capitalize">
                    {SLOT_LABELS[p.meal_slot] ?? p.meal_slot}
                  </Badge>
                </div>
                <form action={deleteMealPlan}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete planned meal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}

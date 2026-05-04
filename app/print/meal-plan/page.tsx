import { addDays, format, startOfWeek } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { PrintTrigger } from "@/app/print/report/print-trigger";

export const dynamic = "force-dynamic";

const SLOTS = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"] as const;

export default async function MealPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const weekStart = start ? new Date(start) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>Add a baby first.</p>
      </main>
    );
  }

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("planned_for, meal_slot, custom_label, inventory_items(name)")
    .eq("baby_id", baby.id)
    .gte("planned_for", format(dates[0], "yyyy-MM-dd"))
    .lte("planned_for", format(dates[6], "yyyy-MM-dd"))
    .returns<
      {
        planned_for: string;
        meal_slot: string;
        custom_label: string | null;
        inventory_items: { name: string | null } | null;
      }[]
    >();

  const byKey = new Map<string, string>();
  for (const p of plans ?? []) {
    byKey.set(`${p.planned_for}:${p.meal_slot}`, p.inventory_items?.name ?? p.custom_label ?? "—");
  }

  return (
    <main className="mx-auto max-w-4xl p-6 print:p-2">
      <PrintTrigger />
      <header className="border-b pb-3">
        <h1 className="text-2xl font-bold">Meal plan · {baby.name}</h1>
        <p className="text-sm text-muted-foreground">
          Week of {format(dates[0], "PPP")}
        </p>
      </header>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Slot</th>
            {dates.map((d) => (
              <th key={d.toISOString()} className="p-2 text-left">
                {format(d, "EEE d")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot} className="border-b">
              <td className="p-2 align-top capitalize text-muted-foreground">
                {slot.replace("_", " ")}
              </td>
              {dates.map((d) => {
                const key = `${format(d, "yyyy-MM-dd")}:${slot}`;
                return (
                  <td key={key} className="p-2 align-top">
                    {byKey.get(key) ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { ageInMonths } from "@/lib/dates";
import { PrintTrigger } from "@/app/print/report/print-trigger";

export const dynamic = "force-dynamic";

export default async function MonthlyRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const cursor = month ? new Date(month + "-01") : subMonths(new Date(), 0);
  const start = startOfMonth(cursor);
  const end = endOfMonth(cursor);

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  type Row = {
    fed_at: string;
    mood: string | null;
    feeding_items: {
      is_first_try: boolean;
      notes: string | null;
      inventory_items: { name: string | null } | null;
      foods: { name: string | null } | null;
    }[];
  };

  const { data: feedings } = await supabase
    .from("feedings")
    .select(
      "fed_at, mood, feeding_items(is_first_try, notes, inventory_items(name), foods(name))",
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .gte("fed_at", start.toISOString())
    .lt("fed_at", end.toISOString())
    .returns<Row[]>();

  const distinct = new Set<string>();
  const firstTries: string[] = [];
  let loved = 0;
  for (const f of feedings ?? []) {
    if (f.mood === "loved") loved++;
    for (const it of f.feeding_items) {
      const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
      if (!name) continue;
      distinct.add(name.toLowerCase());
      if (it.is_first_try) firstTries.push(name);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 print:p-2">
      <PrintTrigger />
      <header className="border-b pb-3">
        <h1 className="text-2xl font-bold">{format(cursor, "MMMM yyyy")} recap</h1>
        {baby && (
          <p className="text-sm text-muted-foreground">
            {baby.name} · {ageInMonths(baby.birth_date)} months
          </p>
        )}
      </header>

      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Feedings</p>
          <p className="text-2xl font-bold">{feedings?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Foods tried</p>
          <p className="text-2xl font-bold">{distinct.size}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Loved 😍</p>
          <p className="text-2xl font-bold">{loved}</p>
        </div>
      </section>

      {firstTries.length > 0 && (
        <section className="space-y-1">
          <h2 className="font-semibold">New foods this month</h2>
          <p className="text-sm text-muted-foreground">{firstTries.join(", ")}</p>
        </section>
      )}

      <p className="pt-6 text-xs text-muted-foreground print:hidden">
        Use your browser&apos;s Print → Save as PDF.
      </p>
    </main>
  );
}

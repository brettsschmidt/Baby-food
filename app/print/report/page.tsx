import { format, subDays } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { ageInMonths } from "@/lib/dates";

import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function PediatricianReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const window = Math.min(Math.max(Number(days ?? 30), 7), 120);

  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  const since = subDays(new Date(), window).toISOString();

  type FeedingRow = {
    id: string;
    fed_at: string;
    mood: string | null;
    notes: string | null;
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
      "id, fed_at, mood, notes, feeding_items(is_first_try, notes, inventory_items(name), foods(name))",
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .gte("fed_at", since)
    .order("fed_at", { ascending: true })
    .returns<FeedingRow[]>();

  // Build the introduced-foods list (first time we ever recorded each food)
  const introductions = new Map<string, { name: string; date: string; reaction: string | null }>();
  for (const f of feedings ?? []) {
    for (const it of f.feeding_items) {
      const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
      if (!name) continue;
      const k = name.toLowerCase();
      if (!introductions.has(k) || it.is_first_try) {
        introductions.set(k, { name, date: f.fed_at, reaction: f.mood });
      }
    }
  }
  const introList = Array.from(introductions.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Reactions of concern: refused/disliked
  const concerns = (feedings ?? [])
    .filter((f) => f.mood === "refused" || f.mood === "disliked")
    .slice(-15);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8 print:px-0 print:py-2">
      <PrintTrigger />
      <header className="space-y-1 border-b pb-4 print:pb-2">
        <h1 className="text-2xl font-bold">Feeding & Introduction Report</h1>
        <p className="text-sm text-muted-foreground">
          {baby ? (
            <>
              <strong>{baby.name}</strong> · born {format(new Date(baby.birth_date), "PPP")} ·{" "}
              {ageInMonths(baby.birth_date)} months old
            </>
          ) : (
            "No baby on file"
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Last {window} days · generated {format(new Date(), "PPP")}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Foods introduced</h2>
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-1">Food</th>
              <th className="py-1">First seen</th>
              <th className="py-1">Reaction</th>
            </tr>
          </thead>
          <tbody>
            {introList.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-muted-foreground">
                  Nothing recorded in this window.
                </td>
              </tr>
            ) : (
              introList.map((i) => (
                <tr key={i.name} className="border-b last:border-0">
                  <td className="py-1">{i.name}</td>
                  <td className="py-1">{format(new Date(i.date), "MMM d, yyyy")}</td>
                  <td className="py-1 capitalize">{i.reaction ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Notable reactions</h2>
        {concerns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No refused/disliked feedings recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {concerns.map((f) => (
              <li key={f.id}>
                <strong>{format(new Date(f.fed_at), "MMM d")}</strong> — {f.mood} —{" "}
                {f.feeding_items
                  .map((i) => i.inventory_items?.name ?? i.foods?.name ?? i.notes)
                  .filter(Boolean)
                  .join(", ") || f.notes}
                {f.notes && <span className="text-muted-foreground"> ({f.notes})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">All feedings ({feedings?.length ?? 0})</h2>
        <table className="w-full text-xs">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-1">When</th>
              <th className="py-1">Foods</th>
              <th className="py-1">Mood</th>
            </tr>
          </thead>
          <tbody>
            {feedings?.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="py-1 align-top">{format(new Date(f.fed_at), "MMM d, h:mm a")}</td>
                <td className="py-1 align-top">
                  {f.feeding_items
                    .map((i) => i.inventory_items?.name ?? i.foods?.name ?? i.notes)
                    .filter(Boolean)
                    .join(", ") || f.notes || "—"}
                </td>
                <td className="py-1 align-top capitalize">{f.mood ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="pt-6 text-xs text-muted-foreground print:hidden">
        Use your browser&apos;s Print → Save as PDF to share with your pediatrician.
      </footer>
    </main>
  );
}

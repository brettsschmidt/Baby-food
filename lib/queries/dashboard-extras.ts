import "server-only";
import { differenceInCalendarDays, format, subDays } from "date-fns";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FirstTryAnniversary {
  name: string;
  introducedAt: string;
  yearsAgo: number;
}

export async function getFirstTryAnniversaries(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<FirstTryAnniversary[]> {
  const { data: rows } = await supabase
    .from("feeding_items")
    .select(
      "is_first_try, notes, inventory_items(name), foods(name), feedings!inner(fed_at, household_id, archived_at)",
    )
    .eq("feedings.household_id", householdId)
    .is("feedings.archived_at", null)
    .eq("is_first_try", true)
    .returns<
      {
        is_first_try: boolean;
        notes: string | null;
        inventory_items: { name: string | null } | null;
        foods: { name: string | null } | null;
        feedings: { fed_at: string } | null;
      }[]
    >();

  const now = new Date();
  const todayMd = format(now, "MM-dd");
  const out: FirstTryAnniversary[] = [];

  for (const r of rows ?? []) {
    const fedAt = r.feedings?.fed_at;
    if (!fedAt) continue;
    const md = format(new Date(fedAt), "MM-dd");
    if (md !== todayMd) continue;
    const years = Math.floor(differenceInCalendarDays(now, new Date(fedAt)) / 365);
    if (years < 1) continue;
    const name = r.inventory_items?.name ?? r.foods?.name ?? r.notes;
    if (!name) continue;
    out.push({ name, introducedAt: fedAt, yearsAgo: years });
  }
  return out;
}

export interface WeeklyWinner {
  name: string;
  count: number;
}

export async function getWeeklyWinner(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<WeeklyWinner | null> {
  const since = subDays(new Date(), 7).toISOString();
  const { data } = await supabase
    .from("feeding_items")
    .select(
      "notes, inventory_items(name), foods(name), feedings!inner(mood, household_id, archived_at, fed_at)",
    )
    .eq("feedings.household_id", householdId)
    .is("feedings.archived_at", null)
    .eq("feedings.mood", "loved")
    .gte("feedings.fed_at", since)
    .returns<
      {
        notes: string | null;
        inventory_items: { name: string | null } | null;
        foods: { name: string | null } | null;
      }[]
    >();
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const name = r.inventory_items?.name ?? r.foods?.name ?? r.notes;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: WeeklyWinner | null = null;
  for (const [name, count] of counts.entries()) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export async function getMemoryOfTheDay(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<{
  caption: string | null;
  occurred_on: string;
  photo_path: string | null;
  yearsAgo: number;
} | null> {
  const todayMd = format(new Date(), "MM-dd");
  const { data: memories } = await supabase
    .from("memories")
    .select("caption, occurred_on, photo_path")
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false });
  for (const m of memories ?? []) {
    if (format(new Date(m.occurred_on), "MM-dd") !== todayMd) continue;
    const years = Math.floor(
      differenceInCalendarDays(new Date(), new Date(m.occurred_on)) / 365,
    );
    if (years < 1) continue;
    return { ...m, yearsAgo: years };
  }
  return null;
}

export async function getStreakDelta(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<{ thisMonth: number; lastMonth: number }> {
  const now = new Date();
  const start30 = subDays(now, 30).toISOString();
  const start60 = subDays(now, 60).toISOString();

  const [{ count: thisMonth }, { count: lastMonth }] = await Promise.all([
    supabase
      .from("feedings")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gte("fed_at", start30),
    supabase
      .from("feedings")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gte("fed_at", start60)
      .lt("fed_at", start30),
  ]);

  return { thisMonth: thisMonth ?? 0, lastMonth: lastMonth ?? 0 };
}

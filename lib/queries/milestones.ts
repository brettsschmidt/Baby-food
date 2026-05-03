import "server-only";
import { differenceInCalendarDays, format, subDays } from "date-fns";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface Streak {
  current: number;
  longest: number;
}

export async function getFeedingStreak(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<Streak> {
  const { data: rows } = await supabase
    .from("feedings")
    .select("fed_at")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .gte("fed_at", subDays(new Date(), 365).toISOString())
    .order("fed_at", { ascending: false });

  const dayKeys = new Set<string>();
  for (const r of rows ?? []) {
    dayKeys.add(format(new Date(r.fed_at), "yyyy-MM-dd"));
  }

  // Current streak: walk back from today
  let current = 0;
  for (let d = 0; d < 365; d++) {
    const key = format(subDays(new Date(), d), "yyyy-MM-dd");
    if (dayKeys.has(key)) current++;
    else break;
  }

  // Longest streak: scan over the last year
  const sortedDays = Array.from(dayKeys).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sortedDays) {
    if (prev && differenceInCalendarDays(new Date(k), new Date(prev)) === 1) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = k;
  }

  return { current, longest };
}

export interface MilestoneCheck {
  kind: string;
  detail?: string;
}

/**
 * Run all milestone detectors and insert any newly achieved ones (one-shot).
 * Returns the milestones triggered THIS call so the UI can celebrate.
 */
export async function evaluateMilestones(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<MilestoneCheck[]> {
  const { data: existing } = await supabase
    .from("milestones")
    .select("kind")
    .eq("household_id", householdId);
  const seen = new Set((existing ?? []).map((m) => m.kind));

  const fresh: MilestoneCheck[] = [];

  // Distinct foods: 10, 25, 50
  const { data: foods } = await supabase
    .from("feeding_items")
    .select("inventory_items(name), foods(name), notes, feedings!inner(household_id, archived_at)")
    .eq("feedings.household_id", householdId)
    .is("feedings.archived_at", null)
    .returns<
      {
        inventory_items: { name: string | null } | null;
        foods: { name: string | null } | null;
        notes: string | null;
      }[]
    >();
  const distinct = new Set(
    (foods ?? [])
      .map((f) => (f.inventory_items?.name ?? f.foods?.name ?? f.notes)?.toLowerCase())
      .filter(Boolean),
  );
  for (const t of [10, 25, 50] as const) {
    const k = `foods_${t}`;
    if (!seen.has(k) && distinct.size >= t) fresh.push({ kind: k, detail: `${t} unique foods tried` });
  }

  // Self-feed milestone
  const { data: selfFed } = await supabase
    .from("feedings")
    .select("id")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .eq("method", "self_feed")
    .limit(1);
  if (!seen.has("first_self_feed") && (selfFed?.length ?? 0) > 0) {
    fresh.push({ kind: "first_self_feed", detail: "First self-fed meal" });
  }

  // Finger-food milestone via foods.texture
  const { data: finger } = await supabase
    .from("feeding_items")
    .select("foods!inner(texture)")
    .eq("foods.texture", "finger")
    .limit(1);
  if (!seen.has("first_finger_food") && (finger?.length ?? 0) > 0) {
    fresh.push({ kind: "first_finger_food", detail: "First finger food" });
  }

  if (fresh.length > 0) {
    await supabase.from("milestones").insert(
      fresh.map((m) => ({
        household_id: householdId,
        kind: m.kind,
        detail: m.detail,
      })),
    );
  }

  return fresh;
}

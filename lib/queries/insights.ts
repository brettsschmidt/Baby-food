import "server-only";
import { subDays, differenceInHours } from "date-fns";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface MoodSummary {
  loved: number;
  liked: number;
  neutral: number;
  disliked: number;
  refused: number;
}

export interface InsightSummary {
  feedingsThisWeek: number;
  feedingsLastWeek: number;
  uniqueFoodsThisWeek: number;
  inventorySharePct: number; // % of feedings that came from inventory vs ad-hoc
  moodCounts: MoodSummary;
  byFood: { name: string; loved: number; total: number }[];
  refusedRecently: { name: string; count: number }[];
  triedNeverSince: string[];
  allergenWatch: {
    foodName: string;
    introducedAt: string;
    hoursSinceIntro: number;
    windowEnds: string;
  }[];
  consumptionPerDay: number; // average inventory units consumed per day this week
  daysOfStockLeft: number | null;
  totalUnitsLeft: number;
  varietyScore: number;          // 0..100, Shannon-evenness × log(unique)
  categoryShares: { category: string; share: number; count: number }[];
}

export async function getInsights(
  supabase: SupabaseServerClient,
  householdId: string,
  rangeDays = 7,
): Promise<InsightSummary> {
  const now = new Date();
  const weekAgo = subDays(now, rangeDays).toISOString();
  const twoWeeksAgo = subDays(now, rangeDays * 2).toISOString();
  const watchWindowAgo = subDays(now, 3).toISOString();

  type WeekRow = {
    fed_at: string;
    mood: string | null;
    feeding_items: {
      inventory_item_id: string | null;
      notes: string | null;
      is_first_try: boolean;
      inventory_items: { name: string | null } | null;
      foods: { name: string | null; category: string | null } | null;
    }[];
  };

  const [{ data: thisWeek }, { data: lastWeek }, { data: allTried }, { data: invStock }] =
    await Promise.all([
      supabase
        .from("feedings")
        .select(
          "fed_at, mood, feeding_items(inventory_item_id, notes, is_first_try, inventory_items(name), foods(name, category))",
        )
        .eq("household_id", householdId)
        .is("archived_at", null)
        .gte("fed_at", weekAgo)
        .returns<WeekRow[]>(),
      supabase
        .from("feedings")
        .select("id")
        .eq("household_id", householdId)
        .is("archived_at", null)
        .gte("fed_at", twoWeeksAgo)
        .lt("fed_at", weekAgo),
      supabase
        .from("feeding_items")
        .select(
          "notes, inventory_items(name), foods(name), feedings!inner(fed_at, household_id, archived_at)",
        )
        .eq("feedings.household_id", householdId)
        .is("feedings.archived_at", null)
        .returns<
          {
            notes: string | null;
            inventory_items: { name: string | null } | null;
            foods: { name: string | null } | null;
          }[]
        >(),
      supabase
        .from("inventory_items")
        .select("quantity")
        .eq("household_id", householdId)
        .is("archived_at", null),
    ]);

  const feedingsThisWeek = thisWeek?.length ?? 0;
  const feedingsLastWeek = lastWeek?.length ?? 0;

  const moodCounts: MoodSummary = {
    loved: 0,
    liked: 0,
    neutral: 0,
    disliked: 0,
    refused: 0,
  };

  const foodStats = new Map<string, { name: string; loved: number; total: number }>();
  const recentNames = new Set<string>();
  let inventorySource = 0;
  let totalSource = 0;

  // Allergen watch: most recent first_try per food name within last 72h
  const allergenSeen = new Map<string, { introducedAt: string; foodName: string }>();

  for (const f of thisWeek ?? []) {
    if (f.mood && (f.mood as keyof MoodSummary) in moodCounts) {
      moodCounts[f.mood as keyof MoodSummary] += 1;
    }
    for (const it of f.feeding_items) {
      const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
      if (!name) continue;
      recentNames.add(name.toLowerCase());

      const stat = foodStats.get(name.toLowerCase()) ?? { name, loved: 0, total: 0 };
      stat.total += 1;
      if (f.mood === "loved") stat.loved += 1;
      foodStats.set(name.toLowerCase(), stat);

      totalSource += 1;
      if (it.inventory_item_id) inventorySource += 1;

      if (it.is_first_try && f.fed_at >= watchWindowAgo) {
        const cur = allergenSeen.get(name.toLowerCase());
        if (!cur || cur.introducedAt < f.fed_at) {
          allergenSeen.set(name.toLowerCase(), { introducedAt: f.fed_at, foodName: name });
        }
      }
    }
  }

  // Refused-recently: items where >50% of recent feedings were disliked/refused
  const refusedRecently = Array.from(foodStats.values())
    .map((s) => ({
      name: s.name,
      count: s.total,
      refusedShare: 0,
    }));
  for (const f of thisWeek ?? []) {
    if (f.mood !== "refused" && f.mood !== "disliked") continue;
    for (const it of f.feeding_items) {
      const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
      if (!name) continue;
      const idx = refusedRecently.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) refusedRecently[idx].refusedShare += 1;
    }
  }
  const refusedFiltered = refusedRecently
    .filter((r) => r.count >= 2 && r.refusedShare / r.count >= 0.5)
    .map((r) => ({ name: r.name, count: r.refusedShare }));

  // Tried-but-never-since: foods we've ever logged but not in the last 14 days
  const everSeenNames = new Map<string, string>();
  for (const it of allTried ?? []) {
    const name = it.inventory_items?.name ?? it.foods?.name ?? it.notes;
    if (name) everSeenNames.set(name.toLowerCase(), name);
  }
  const triedNeverSince = Array.from(everSeenNames.entries())
    .filter(([k]) => !recentNames.has(k))
    .map(([, v]) => v)
    .slice(0, 6);

  const allergenWatch = Array.from(allergenSeen.values()).map((v) => {
    const introDate = new Date(v.introducedAt);
    const ends = new Date(introDate.getTime() + 72 * 3600 * 1000);
    return {
      foodName: v.foodName,
      introducedAt: v.introducedAt,
      hoursSinceIntro: differenceInHours(now, introDate),
      windowEnds: ends.toISOString(),
    };
  });

  // Consumption forecasting via inventory_movements ledger
  const { data: outflows } = await supabase
    .from("inventory_movements")
    .select("delta, created_at")
    .eq("household_id", householdId)
    .gte("created_at", weekAgo)
    .lt("delta", 0);

  const totalConsumed = (outflows ?? []).reduce((sum, m) => sum + Math.abs(m.delta), 0);
  const consumptionPerDay = totalConsumed / 7;
  const totalUnitsLeft = (invStock ?? []).reduce((sum, i) => sum + Number(i.quantity), 0);
  const daysOfStockLeft =
    consumptionPerDay > 0 ? Math.round(totalUnitsLeft / consumptionPerDay) : null;

  const byFood = Array.from(foodStats.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Variety score: Shannon evenness × log10(unique foods+1), normalized to 0..100.
  // Encourages both breadth (many distinct foods) and balance (no one food dominates).
  const totalLogged = Array.from(foodStats.values()).reduce((s, f) => s + f.total, 0);
  let entropy = 0;
  for (const f of foodStats.values()) {
    const p = f.total / Math.max(totalLogged, 1);
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const evenness = foodStats.size > 1 ? entropy / Math.log2(foodStats.size) : 0;
  const breadth = Math.log10(foodStats.size + 1) / Math.log10(11); // saturates around 10 unique foods
  const varietyScore = Math.round(evenness * breadth * 100);

  // Category shares (foods.category)
  const categoryCounts = new Map<string, number>();
  for (const f of thisWeek ?? []) {
    for (const it of f.feeding_items) {
      const cat = it.foods?.category ?? "uncategorized";
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
  }
  const catTotal = Array.from(categoryCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const categoryShares = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count, share: count / catTotal }))
    .sort((a, b) => b.count - a.count);

  return {
    feedingsThisWeek,
    feedingsLastWeek,
    uniqueFoodsThisWeek: foodStats.size,
    inventorySharePct: totalSource > 0 ? Math.round((inventorySource / totalSource) * 100) : 0,
    moodCounts,
    byFood,
    refusedRecently: refusedFiltered,
    triedNeverSince,
    allergenWatch,
    consumptionPerDay,
    daysOfStockLeft,
    totalUnitsLeft,
    varietyScore,
    categoryShares,
  };
}

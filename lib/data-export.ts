import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const TABLES = [
  "babies",
  "foods",
  "inventory_items",
  "inventory_movements",
  "prep_plans",
  "prep_plan_items",
  "feedings",
  "feeding_items",
  "feeding_sessions",
  "growth_measurements",
  "sleep_logs",
  "diaper_logs",
  "supplement_logs",
  "readiness_evaluations",
  "memories",
  "recipes",
  "recipe_ingredients",
  "shopping_list_items",
  "milestones",
] as const;

type Row = Record<string, unknown>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(","));
  }
  return lines.join("\n");
}

export async function exportHouseholdData(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<{ name: string; content: string }[]> {
  const files: { name: string; content: string }[] = [];

  for (const table of TABLES) {
    // Most tables have a household_id column we can filter by; for child tables
    // we filter via the parent's household_id by selecting through a join.
    let rows: Row[] = [];
    if (
      table === "feeding_items" ||
      table === "feeding_sessions" ||
      table === "prep_plan_items" ||
      table === "recipe_ingredients"
    ) {
      const parent =
        table === "feeding_items" || table === "feeding_sessions"
          ? "feedings"
          : table === "prep_plan_items"
            ? "prep_plans"
            : "recipes";
      const { data: parents } = await supabase
        .from(parent)
        .select("id")
        .eq("household_id", householdId);
      const parentIds = (parents ?? []).map((p) => p.id as string);
      if (parentIds.length > 0) {
        const fkColumn =
          parent === "recipes"
            ? "recipe_id"
            : parent === "prep_plans"
              ? "prep_plan_id"
              : "feeding_id";
        const { data } = await supabase.from(table).select("*").in(fkColumn, parentIds);
        rows = (data ?? []) as Row[];
      }
    } else {
      const { data } = await supabase.from(table).select("*").eq("household_id", householdId);
      rows = (data ?? []) as Row[];
    }
    files.push({ name: `${table}.json`, content: JSON.stringify(rows, null, 2) });
    files.push({ name: `${table}.csv`, content: toCsv(rows) });
  }

  files.push({
    name: "README.txt",
    content:
      "Baby Food data export\n" +
      `Generated: ${new Date().toISOString()}\n` +
      `Household: ${householdId}\n\n` +
      "Each table is included as both .json and .csv. Photos are NOT bundled — fetch them separately via the photo URLs in the relevant rows.\n",
  });

  return files;
}

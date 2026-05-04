"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold, getActiveBaby } from "@/lib/queries/household";

export async function bulkArchiveFeedings(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await supabase
    .from("feedings")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids)
    .eq("household_id", householdId);
  revalidatePath("/feedings");
}

function parseCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQ) {
      if (ch === '"' && input[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length > 0) {
    row.push(cur);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

export async function importFeedingsCsv(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const csv = String(formData.get("csv") ?? "").trim();
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Need a header row and at least one data row");
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => headers.indexOf(k);
  const fedAtCol = idx("fed_at");
  const foodCol = idx("food");
  const moodCol = idx("mood");
  if (fedAtCol < 0) throw new Error("Missing required column: fed_at");

  const created: string[] = [];
  for (const r of rows.slice(1)) {
    const fedAt = (r[fedAtCol] ?? "").trim();
    if (!fedAt) continue;
    const food = foodCol >= 0 ? (r[foodCol] ?? "").trim() : "";
    const mood = moodCol >= 0 ? (r[moodCol] ?? "").trim() : null;

    const { data: f } = await supabase
      .from("feedings")
      .insert({
        household_id: householdId,
        baby_id: baby.id,
        fed_at: new Date(fedAt).toISOString(),
        fed_by: userId,
        mood:
          mood === "loved" ||
          mood === "liked" ||
          mood === "neutral" ||
          mood === "disliked" ||
          mood === "refused"
            ? mood
            : null,
      })
      .select("id")
      .single();

    if (f && food) {
      await supabase
        .from("feeding_items")
        .insert({ feeding_id: f.id, notes: food });
      created.push(f.id);
    }
  }
  revalidatePath("/feedings");
}

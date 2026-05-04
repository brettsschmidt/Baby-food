"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays as addDaysFn } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const UNITS = ["cube", "jar", "pouch", "g", "ml", "serving"] as const;
type Unit = (typeof UNITS)[number];

export async function copyLastWeekPlans(): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const today = new Date();
  const weekAgo = addDaysFn(today, -7);

  const { data: prev } = await supabase
    .from("prep_plans")
    .select("scheduled_for, notes, recipe_id, prep_plan_items(planned_quantity, unit, food_id)")
    .eq("household_id", householdId)
    .gte("scheduled_for", addDaysFn(weekAgo, -1).toISOString().slice(0, 10))
    .lte("scheduled_for", today.toISOString().slice(0, 10))
    .returns<
      {
        scheduled_for: string;
        notes: string | null;
        recipe_id: string | null;
        prep_plan_items: { planned_quantity: number; unit: Unit; food_id: string | null }[];
      }[]
    >();

  if (!prev || prev.length === 0) return;

  for (const p of prev) {
    const newDate = addDaysFn(new Date(p.scheduled_for), 7).toISOString().slice(0, 10);
    const { data: created, error } = await supabase
      .from("prep_plans")
      .insert({
        household_id: householdId,
        scheduled_for: newDate,
        notes: p.notes,
        recipe_id: p.recipe_id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !created) continue;
    if (p.prep_plan_items.length > 0) {
      await supabase.from("prep_plan_items").insert(
        p.prep_plan_items.map((it) => ({
          prep_plan_id: created.id,
          planned_quantity: it.planned_quantity,
          unit: it.unit,
          food_id: it.food_id,
        })),
      );
    }
  }

  revalidatePath("/planner");
}

export async function createPrepPlan(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  const food = String(formData.get("food_name") ?? "").trim();
  const quantity = Number(formData.get("planned_quantity") ?? 0);
  const unitRaw = String(formData.get("unit") ?? "cube");
  const unit = UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const recurrenceRaw = String(formData.get("recurrence") ?? "").trim();
  const recurrence =
    recurrenceRaw === "weekly" || recurrenceRaw === "biweekly"
      ? (recurrenceRaw as "weekly" | "biweekly")
      : null;
  const untilRaw = String(formData.get("recurrence_until") ?? "").trim();
  const recurrenceUntil = untilRaw || null;

  if (!scheduledFor || !food || quantity <= 0) throw new Error("Missing fields");

  // Build the date series for the recurrence (capped to 26 occurrences).
  const dates: string[] = [scheduledFor];
  if (recurrence) {
    const stepDays = recurrence === "weekly" ? 7 : 14;
    const stop = recurrenceUntil ? new Date(recurrenceUntil) : addDaysFn(new Date(scheduledFor), 90);
    let cursor = addDaysFn(new Date(scheduledFor), stepDays);
    while (cursor <= stop && dates.length < 26) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor = addDaysFn(cursor, stepDays);
    }
  }

  const { data: created, error } = await supabase
    .from("prep_plans")
    .insert(
      dates.map((d) => ({
        household_id: householdId,
        scheduled_for: d,
        notes: notes ?? food,
        recurrence,
        recurrence_until: recurrenceUntil,
        created_by: userId,
      })),
    )
    .select("id");

  if (error || !created || created.length === 0) throw new Error(error?.message ?? "Failed");

  await supabase.from("prep_plan_items").insert(
    created.map((p) => ({
      prep_plan_id: p.id,
      planned_quantity: quantity,
      unit,
      food_id: null,
    })),
  );

  revalidatePath("/planner");
  revalidatePath("/dashboard");
  redirect("/planner");
}

export async function completePrepPlan(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const id = String(formData.get("id"));
  const actualQuantity = Number(formData.get("actual_quantity") ?? 0);
  const unitRaw = String(formData.get("unit") ?? "cube");
  const unit = UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube";
  const expiry = String(formData.get("expiry_date") ?? "") || null;
  const itemName = String(formData.get("item_name") ?? "").trim();

  if (!id || actualQuantity <= 0 || !itemName) throw new Error("Missing fields");

  const { data: item, error: invError } = await supabase
    .from("inventory_items")
    .insert({
      household_id: householdId,
      name: itemName,
      storage: "freezer",
      unit,
      quantity: actualQuantity,
      initial_quantity: actualQuantity,
      prep_date: new Date().toISOString().slice(0, 10),
      expiry_date: expiry,
      batch_id: id,
    })
    .select("id")
    .single();

  if (invError || !item) throw new Error(invError?.message ?? "Failed");

  await supabase.from("inventory_movements").insert({
    household_id: householdId,
    inventory_item_id: item.id,
    delta: 0,
    reason: "prep",
    prep_plan_id: id,
    created_by: userId,
  });

  await supabase
    .from("prep_plans")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/planner");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

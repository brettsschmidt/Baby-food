"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const UNITS = ["cube", "jar", "pouch", "g", "ml", "serving"] as const;
type Unit = (typeof UNITS)[number];

export async function createPrepPlan(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  const food = String(formData.get("food_name") ?? "").trim();
  const quantity = Number(formData.get("planned_quantity") ?? 0);
  const unitRaw = String(formData.get("unit") ?? "cube");
  const unit = UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!scheduledFor || !food || quantity <= 0) throw new Error("Missing fields");

  const { data: plan, error } = await supabase
    .from("prep_plans")
    .insert({
      household_id: householdId,
      scheduled_for: scheduledFor,
      notes: notes ?? food,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !plan) throw new Error(error?.message ?? "Failed");

  await supabase.from("prep_plan_items").insert({
    prep_plan_id: plan.id,
    planned_quantity: quantity,
    unit,
    food_id: null,
  });

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

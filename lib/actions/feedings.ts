"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold, getActiveBaby } from "@/lib/queries/household";
import { notifyHousehold } from "@/lib/push";
import { evaluateMilestones } from "@/lib/queries/milestones";

const MOODS = ["loved", "liked", "neutral", "disliked", "refused"] as const;
const METHODS = ["spoon", "self_feed", "bottle", "breast"] as const;

type Mood = (typeof MOODS)[number];
type Method = (typeof METHODS)[number];

interface ItemInput {
  inventoryItemId?: string | null;
  customFood?: string | null;
  quantity?: number | null;
  isFirstTry?: boolean;
}

function parseItems(formData: FormData): ItemInput[] {
  // Multi-item form encoding: items[i][...]
  // We collect them by scanning known keys.
  const out: Map<string, ItemInput> = new Map();
  for (const [key, raw] of formData.entries()) {
    const m = key.match(/^items\[(\d+)\]\[(\w+)\]$/);
    if (!m) continue;
    const [, idx, field] = m;
    const value = String(raw);
    const cur = out.get(idx) ?? {};
    if (field === "inventory_item_id") cur.inventoryItemId = value || null;
    if (field === "custom_food") cur.customFood = value || null;
    if (field === "quantity") cur.quantity = value ? Number(value) : null;
    if (field === "is_first_try") cur.isFirstTry = value === "on" || value === "true";
    out.set(idx, cur);
  }

  // Backwards-compatible single-item encoding (used by /feedings/new today)
  if (out.size === 0) {
    const inventoryItemId = String(formData.get("inventory_item_id") ?? "") || null;
    const customFood = String(formData.get("custom_food") ?? "").trim() || null;
    const q = formData.get("quantity");
    const quantity = q ? Number(q) : null;
    const isFirstTry = formData.get("is_first_try") === "on";
    if (inventoryItemId || customFood) {
      out.set("0", { inventoryItemId, customFood, quantity, isFirstTry });
    }
  }

  return Array.from(out.values()).filter((i) => i.inventoryItemId || i.customFood);
}

export async function logFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const fedAtRaw = String(formData.get("fed_at") ?? "");
  const fedAt = fedAtRaw ? new Date(fedAtRaw).toISOString() : new Date().toISOString();
  const moodRaw = String(formData.get("mood") ?? "");
  const mood = MOODS.includes(moodRaw as Mood) ? (moodRaw as Mood) : null;
  const methodRaw = String(formData.get("method") ?? "spoon");
  const method = METHODS.includes(methodRaw as Method) ? (methodRaw as Method) : "spoon";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const photoPath = String(formData.get("photo_path") ?? "") || null;
  const items = parseItems(formData);
  const overrideAllergens = formData.get("allergen_override") === "on";

  // Allergen check: gather any allergens from referenced foods/inventory items
  // and bail if they overlap with the baby's known_allergens unless explicitly overridden.
  if (!overrideAllergens) {
    const inventoryIds = items
      .map((i) => i.inventoryItemId)
      .filter((id): id is string => !!id);
    const { data: babyRow } = await supabase
      .from("babies")
      .select("known_allergens")
      .eq("id", baby.id)
      .maybeSingle();
    const known = new Set((babyRow?.known_allergens ?? []).map((a) => a.toLowerCase()));

    if (inventoryIds.length > 0 && known.size > 0) {
      const { data: invs } = await supabase
        .from("inventory_items")
        .select("id, foods(allergens)")
        .in("id", inventoryIds)
        .returns<{ id: string; foods: { allergens: string[] } | null }[]>();

      const conflicting = new Set<string>();
      for (const inv of invs ?? []) {
        for (const a of inv.foods?.allergens ?? []) {
          if (known.has(a.toLowerCase())) conflicting.add(a);
        }
      }
      if (conflicting.size > 0) {
        const list = Array.from(conflicting).join(", ");
        throw new Error(
          `Blocked: this feeding contains ${baby.name}'s known allergens (${list}). Confirm to override.`,
        );
      }
    }
  }

  const { data: feeding, error } = await supabase
    .from("feedings")
    .insert({
      household_id: householdId,
      baby_id: baby.id,
      fed_at: fedAt,
      fed_by: userId,
      method,
      mood,
      notes,
      photo_path: photoPath,
    })
    .select("id")
    .single();

  if (error || !feeding) throw new Error(error?.message ?? "Failed");

  if (items.length > 0) {
    await supabase.from("feeding_items").insert(
      items.map((i) => ({
        feeding_id: feeding.id,
        inventory_item_id: i.inventoryItemId ?? null,
        quantity: i.inventoryItemId ? (i.quantity ?? 1) : null,
        notes: i.customFood ?? null,
        is_first_try: i.isFirstTry ?? false,
      })),
    );
  }

  // Bottle / breast session detail (only saved when meaningful values supplied).
  const bottleMlRaw = String(formData.get("bottle_ml") ?? "").trim();
  const bottleMl = bottleMlRaw ? Number(bottleMlRaw) : null;
  const breastSideRaw = String(formData.get("breast_side") ?? "").trim();
  const breastSide =
    breastSideRaw === "left" || breastSideRaw === "right" || breastSideRaw === "both"
      ? (breastSideRaw as "left" | "right" | "both")
      : null;
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const durationMinutes = durationRaw ? Number(durationRaw) : null;

  if (
    (method === "bottle" && bottleMl != null && !Number.isNaN(bottleMl)) ||
    (method === "breast" && (breastSide || durationMinutes != null))
  ) {
    await supabase.from("feeding_sessions").insert({
      feeding_id: feeding.id,
      bottle_ml: method === "bottle" ? bottleMl : null,
      breast_side: method === "breast" ? breastSide : null,
      duration_minutes: durationMinutes,
    });
  }

  const summary = items
    .map((i) => i.customFood ?? null)
    .filter(Boolean)
    .join(", ") || (items.length ? `${items.length} item(s)` : "feeding");

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "feeding_logged",
    p_ref_id: feeding.id,
    p_summary: summary,
  });

  // Best-effort push to other parents.
  try {
    await notifyHousehold(householdId, userId, {
      title: `${baby.name} just ate`,
      body: summary,
      url: "/feedings",
    });
  } catch {
    /* push not configured in this environment */
  }

  // Best-effort milestone evaluation.
  try {
    const fresh = await evaluateMilestones(supabase, householdId);
    for (const m of fresh) {
      try {
        await notifyHousehold(householdId, null, {
          title: "Milestone unlocked",
          body: m.detail ?? m.kind,
          url: "/dashboard",
        });
      } catch {
        /* push not configured */
      }
    }
  } catch {
    /* milestone eval failure shouldn't block the feeding log */
  }

  revalidatePath("/feedings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/feedings?logged=${feeding.id}`);
}

export async function updateFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const id = String(formData.get("id"));
  if (!id) throw new Error("Missing id");

  const fedAtRaw = String(formData.get("fed_at") ?? "");
  const fedAt = fedAtRaw ? new Date(fedAtRaw).toISOString() : null;
  const moodRaw = String(formData.get("mood") ?? "");
  const mood = MOODS.includes(moodRaw as Mood) ? (moodRaw as Mood) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await supabase
    .from("feedings")
    .update({
      fed_at: fedAt ?? undefined,
      mood,
      notes,
    })
    .eq("id", id);

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "feeding_edited",
    p_ref_id: id,
    p_summary: null,
  });

  revalidatePath("/feedings");
  revalidatePath(`/feedings/${id}`);
  redirect(`/feedings/${id}`);
}

export async function deleteFeeding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const id = String(formData.get("id"));
  if (!id) return;

  // Reverse any inventory_movements this feeding caused, so the freezer
  // count is restored. Then archive the feeding (soft delete).
  const { data: moves } = await supabase
    .from("inventory_movements")
    .select("inventory_item_id, delta")
    .eq("feeding_id", id);

  for (const m of moves ?? []) {
    await supabase.from("inventory_movements").insert({
      household_id: householdId,
      inventory_item_id: m.inventory_item_id,
      delta: -m.delta,
      reason: "correction",
      created_by: userId,
    });
  }

  // Photo lifecycle: purge the attached photo from Storage.
  const { data: feedingRow } = await supabase
    .from("feedings")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  if (feedingRow?.photo_path) {
    await supabase.storage.from("household-photos").remove([feedingRow.photo_path]);
  }

  await supabase
    .from("feedings")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "feeding_deleted",
    p_ref_id: id,
    p_summary: null,
  });

  revalidatePath("/feedings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

/** Repeat the user's most recent feeding with a new fed_at = now(). */
export async function repeatLastFeeding(): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) return;

  const { data: last } = await supabase
    .from("feedings")
    .select(
      "id, mood, method, notes, feeding_items(inventory_item_id, quantity, notes, is_first_try)",
    )
    .eq("household_id", householdId)
    .eq("baby_id", baby.id)
    .is("archived_at", null)
    .order("fed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<{
      id: string;
      mood: string | null;
      method: string | null;
      notes: string | null;
      feeding_items: {
        inventory_item_id: string | null;
        quantity: number | null;
        notes: string | null;
        is_first_try: boolean;
      }[];
    }>();

  if (!last) return;

  const { data: feeding, error } = await supabase
    .from("feedings")
    .insert({
      household_id: householdId,
      baby_id: baby.id,
      fed_at: new Date().toISOString(),
      fed_by: userId,
      method: (last.method as Method) ?? "spoon",
      mood: last.mood as Mood | null,
      notes: last.notes,
    })
    .select("id")
    .single();

  if (error || !feeding) return;

  if (last.feeding_items.length > 0) {
    await supabase.from("feeding_items").insert(
      last.feeding_items.map((i) => ({
        feeding_id: feeding.id,
        inventory_item_id: i.inventory_item_id,
        quantity: i.quantity,
        notes: i.notes,
        is_first_try: false,
      })),
    );
  }

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "feeding_logged",
    p_ref_id: feeding.id,
    p_summary: "Repeat of last feeding",
  });

  revalidatePath("/feedings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

/** Quick-log a single food (used by dashboard chips). */
export async function quickLogFood(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  if (!baby) throw new Error("Add a baby first");

  const inventoryItemId = String(formData.get("inventory_item_id") ?? "") || null;
  const customFood = String(formData.get("custom_food") ?? "").trim() || null;
  if (!inventoryItemId && !customFood) return;

  const { data: feeding, error } = await supabase
    .from("feedings")
    .insert({
      household_id: householdId,
      baby_id: baby.id,
      fed_at: new Date().toISOString(),
      fed_by: userId,
    })
    .select("id")
    .single();
  if (error || !feeding) return;

  await supabase.from("feeding_items").insert({
    feeding_id: feeding.id,
    inventory_item_id: inventoryItemId,
    quantity: inventoryItemId ? 1 : null,
    notes: customFood,
  });

  await supabase.rpc("log_activity", {
    p_household_id: householdId,
    p_kind: "feeding_logged",
    p_ref_id: feeding.id,
    p_summary: customFood ?? "Quick log",
  });

  revalidatePath("/feedings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

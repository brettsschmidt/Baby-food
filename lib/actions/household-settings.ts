"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export async function updateHouseholdTheme(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, role } = await requireHousehold(supabase);
  if (role !== "owner") return;

  const themeColor = String(formData.get("theme_color") ?? "").trim() || null;
  const accentEmoji = String(formData.get("accent_emoji") ?? "").trim() || null;
  const householdName = String(formData.get("name") ?? "").trim();

  const update: {
    theme_color?: string;
    accent_emoji?: string;
    name?: string;
  } = {};
  if (themeColor) update.theme_color = themeColor;
  if (accentEmoji) update.accent_emoji = accentEmoji;
  if (householdName) update.name = householdName;
  if (Object.keys(update).length === 0) return;

  await supabase.from("households").update(update).eq("id", householdId);
  revalidatePath("/", "layout");
}

export async function updateExpiryDefaults(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, role } = await requireHousehold(supabase);
  if (role !== "owner") return;

  const freezer = Number(formData.get("freezer") ?? 60);
  const fridge = Number(formData.get("fridge") ?? 3);
  const pantry = Number(formData.get("pantry") ?? 365);

  await supabase
    .from("households")
    .update({
      default_freezer_expiry_days: freezer,
      default_fridge_expiry_days: fridge,
      default_pantry_expiry_days: pantry,
    })
    .eq("id", householdId);

  revalidatePath("/", "layout");
}

export async function updateActivityRetention(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, role } = await requireHousehold(supabase);
  if (role !== "owner") return;

  const days = Number(formData.get("days") ?? 365);
  await supabase
    .from("households")
    .update({ activity_retention_days: days })
    .eq("id", householdId);

  // Prune now if shrinking the window.
  await supabase.rpc("prune_activity_log", { p_household_id: householdId });

  revalidatePath("/settings");
  revalidatePath("/activity");
}

export async function toggleSharedFoodsOptIn(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, role } = await requireHousehold(supabase);
  if (role !== "owner") return;

  const enabled = formData.get("enabled") === "on";
  await supabase
    .from("households")
    .update({ shared_foods_opt_in: enabled })
    .eq("id", householdId);

  revalidatePath("/settings");
}

export async function updateBabyAllergens(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);

  const id = String(formData.get("id") ?? "");
  const allergensRaw = String(formData.get("allergens") ?? "");
  const allergens = allergensRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!id) return;
  await supabase.from("babies").update({ known_allergens: allergens }).eq("id", id);

  revalidatePath("/settings");
  revalidatePath("/feedings/new");
}

export async function updateNotifyPrefs(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const partner = formData.get("notify_on_partner_log") === "on";
  const lowStock = formData.get("notify_on_low_stock") === "on";
  const digest = formData.get("notify_weekly_digest") === "on";
  const dow = Number(formData.get("digest_send_dow") ?? 0);
  const hour = Number(formData.get("digest_send_hour") ?? 9);

  await supabase
    .from("household_member_prefs")
    .upsert(
      {
        household_id: householdId,
        user_id: userId,
        notify_on_partner_log: partner,
        notify_on_low_stock: lowStock,
        notify_weekly_digest: digest,
        digest_send_dow: dow,
        digest_send_hour: hour,
      },
      { onConflict: "household_id,user_id" },
    );
  revalidatePath("/settings");
}

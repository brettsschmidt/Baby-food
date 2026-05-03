import "server-only";
import { redirect } from "next/navigation";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function requireHousehold(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: membership.household_id,
    role: membership.role as "owner" | "member",
  };
}

export async function getBabies(supabase: SupabaseServerClient, householdId: string) {
  const { data } = await supabase
    .from("babies")
    .select("id, name, birth_date")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getActiveBaby(
  supabase: SupabaseServerClient,
  householdId: string,
  userId?: string,
) {
  const babies = await getBabies(supabase, householdId);
  if (babies.length === 0) return null;
  if (babies.length === 1 || !userId) return babies[0];

  const { data: prefs } = await supabase
    .from("household_member_prefs")
    .select("active_baby_id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs?.active_baby_id) {
    const found = babies.find((b) => b.id === prefs.active_baby_id);
    if (found) return found;
  }
  return babies[0];
}

export async function getHouseholdSettings(
  supabase: SupabaseServerClient,
  householdId: string,
) {
  const { data } = await supabase
    .from("households")
    .select(
      "default_freezer_expiry_days, default_fridge_expiry_days, default_pantry_expiry_days",
    )
    .eq("id", householdId)
    .maybeSingle();
  return {
    freezerDays: data?.default_freezer_expiry_days ?? 60,
    fridgeDays: data?.default_fridge_expiry_days ?? 3,
    pantryDays: data?.default_pantry_expiry_days ?? 365,
  };
}

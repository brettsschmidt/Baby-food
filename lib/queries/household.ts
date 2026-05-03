import "server-only";
import { redirect } from "next/navigation";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function requireHousehold(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) redirect("/onboarding");

  // Honour active_household_id from prefs if set + valid; otherwise first joined.
  const { data: prefs } = await supabase
    .from("household_member_prefs")
    .select("active_household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const activeId = prefs?.active_household_id ?? null;
  const matched = activeId ? memberships.find((m) => m.household_id === activeId) : undefined;
  const chosen = matched ?? memberships[0];

  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: chosen.household_id,
    role: chosen.role as "owner" | "member" | "caregiver",
    memberships,
  };
}

export async function getMyHouseholds(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("household_members")
    .select("household_id, role, households(name, accent_emoji)")
    .eq("user_id", user.id)
    .returns<
      {
        household_id: string;
        role: "owner" | "member" | "caregiver";
        households: { name: string; accent_emoji: string | null } | null;
      }[]
    >();
  return data ?? [];
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
      "default_freezer_expiry_days, default_fridge_expiry_days, default_pantry_expiry_days, units_preference",
    )
    .eq("id", householdId)
    .maybeSingle();
  return {
    freezerDays: data?.default_freezer_expiry_days ?? 60,
    fridgeDays: data?.default_fridge_expiry_days ?? 3,
    pantryDays: data?.default_pantry_expiry_days ?? 365,
    units: (data?.units_preference ?? "metric") as "metric" | "imperial",
  };
}

export type Role = "owner" | "member" | "caregiver";

const ROLE_RANK: Record<Role, number> = { caregiver: 1, member: 2, owner: 3 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

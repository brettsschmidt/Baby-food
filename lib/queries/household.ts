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

export async function getActiveBaby(supabase: SupabaseServerClient, householdId: string) {
  const { data } = await supabase
    .from("babies")
    .select("id, name, birth_date")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

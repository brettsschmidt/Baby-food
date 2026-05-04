"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, normalizeInviteCode } from "@/lib/invite-code";

export async function createHousehold(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Household name required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/onboarding/baby");
}

export async function redeemInvite(formData: FormData): Promise<void> {
  const raw = String(formData.get("code") ?? "");
  const code = normalizeInviteCode(raw);
  if (code.length < 4) throw new Error("Enter a valid invite code");

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invite", { p_code: code });

  if (error) {
    const map: Record<string, string> = {
      P0002: "Invite not found",
      P0003: "This invite has been revoked",
      P0004: "This invite has expired",
      P0005: "This invite has been used up",
    };
    throw new Error(map[error.code ?? ""] ?? error.message);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function generateInvite(
  role: "member" | "caregiver" = "member",
): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "Not in a household" };
  if (membership.role !== "owner") return { error: "Only the owner can mint invites" };
  const roleSafe = role === "caregiver" ? "caregiver" : "member";

  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const { error } = await supabase.from("household_invites").insert({
      household_id: membership.household_id,
      code,
      role: roleSafe,
      created_by: user.id,
    });
    if (!error) {
      revalidatePath("/settings");
      return { code };
    }
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not generate a unique code, try again" };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("household_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/settings");
}

export async function addBaby(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");
  if (!name || !birthDate) throw new Error("Name and birth date required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { error } = await supabase.from("babies").insert({
    household_id: membership.household_id,
    name,
    birth_date: birthDate,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/totp";

const TOTP_PASS_COOKIE = "babyfood_2fa_passed";

export async function startTotpEnrollment(): Promise<{
  secret: string;
  recovery: string[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const secret = generateTotpSecret();
  const recovery = generateRecoveryCodes();

  await supabase.from("totp_secrets").upsert({
    user_id: user.id,
    secret_encrypted: encryptSecret(secret),
    recovery_codes: recovery,
    confirmed_at: null,
  });

  return { secret, recovery };
}

export async function confirmTotpEnrollment(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: row } = await supabase
    .from("totp_secrets")
    .select("secret_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) throw new Error("Start enrollment first");

  const secret = decryptSecret(row.secret_encrypted);
  if (!verifyTotp(secret, code)) throw new Error("Code didn't match — try again");

  await supabase
    .from("totp_secrets")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // Skip the immediate /auth/2fa challenge for the confirming session.
  const jar = await cookies();
  jar.set(TOTP_PASS_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });

  revalidatePath("/settings/security");
  redirect("/settings/security?ok=1");
}

export async function disableTotp(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("totp_secrets").delete().eq("user_id", user.id);
  const jar = await cookies();
  jar.delete(TOTP_PASS_COOKIE);
  revalidatePath("/settings/security");
}

export async function verifyTotpChallenge(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("totp_secrets")
    .select("secret_encrypted, recovery_codes")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) redirect(next);

  const secret = decryptSecret(row.secret_encrypted);
  const cleaned = code.trim().toUpperCase();

  if (verifyTotp(secret, cleaned)) {
    const jar = await cookies();
    jar.set(TOTP_PASS_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
    redirect(next);
  }

  // Try recovery code (single-use)
  const codes = (row.recovery_codes ?? []) as string[];
  const idx = codes.indexOf(cleaned);
  if (idx >= 0) {
    const remaining = codes.filter((_, i) => i !== idx);
    await supabase
      .from("totp_secrets")
      .update({ recovery_codes: remaining })
      .eq("user_id", user.id);
    const jar = await cookies();
    jar.set(TOTP_PASS_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
    redirect(next);
  }

  redirect(`/auth/2fa?next=${encodeURIComponent(next)}&error=1`);
}

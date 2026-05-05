"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login?error=auth_failed");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    if (error.status === 429) redirect("/login?error=rate_limited");
    redirect("/login?error=auth_failed");
  }
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing_fields");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) redirect("/login?error=rate_limited");
    redirect("/login?error=invalid_credentials");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!email || !password) redirect("/signup?error=missing_fields");
  if (password.length < 8) redirect("/signup?error=weak_password");
  if (password !== confirm) redirect("/signup?error=password_mismatch");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    if (error.status === 429) redirect("/signup?error=rate_limited");
    if (error.message?.toLowerCase().includes("already")) {
      redirect("/signup?error=already_registered");
    }
    redirect("/signup?error=signup_failed");
  }

  // If email confirmation is disabled in Supabase, signUp returns an active session
  // and we can go straight to onboarding. Otherwise we land on /verify to wait for
  // the confirmation email.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Drop household data + profile via security-definer RPC.
  await supabase.rpc("delete_account");

  // Hard-delete the auth user via admin (service role).
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // If service role isn't configured we can't kill the auth row;
    // sign out instead and let the operator clean up.
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?sent=1");
}

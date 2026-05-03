import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/verify",
  "/auth/callback",
  "/auth/2fa",
  "/privacy",
  "/share",
  "/share-receive",
];
const ONBOARDING_PATH = "/onboarding";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated → bounce to /login (except for public routes and the marketing root)
  if (!user && !isPublic(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on auth pages → bounce to dashboard
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Enforce 2FA when a confirmed TOTP secret exists.
  if (user && !pathname.startsWith("/auth/2fa") && !isPublic(pathname) && pathname !== "/") {
    const passed = request.cookies.get("babyfood_2fa_passed")?.value === "1";
    if (!passed) {
      const { data: row } = await supabase
        .from("totp_secrets")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row?.confirmed_at) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/2fa";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  // Authenticated but not in a household → force onboarding
  if (user && !pathname.startsWith(ONBOARDING_PATH) && !isPublic(pathname) && pathname !== "/") {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

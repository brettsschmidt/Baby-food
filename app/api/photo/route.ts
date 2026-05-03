import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "household-photos";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) return new NextResponse("missing path", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorised", { status: 401 });

  // Verify the requester belongs to the household whose id is the first
  // path segment. RLS on Storage also enforces this, but we check early.
  const householdId = path.split("/")[0];
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!membership) return new NextResponse("forbidden", { status: 403 });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) {
    return new NextResponse(error?.message ?? "not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}

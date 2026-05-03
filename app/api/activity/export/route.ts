import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorised", { status: 401 });

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return new NextResponse("no household", { status: 404 });

  const { data: rows } = await supabase
    .from("activity_log")
    .select("id, kind, summary, created_at, profiles:actor_id(display_name)")
    .eq("household_id", membership.household_id)
    .order("created_at", { ascending: false });

  // Build CSV (id, when, who, what, summary)
  const headers = ["id", "when", "who", "what", "summary"];
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of (rows ?? []) as Array<{
    id: string;
    kind: string;
    summary: string | null;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }>) {
    lines.push(
      [
        r.id,
        r.created_at,
        r.profiles?.display_name ?? "",
        r.kind,
        r.summary ?? "",
      ]
        .map(escape)
        .join(","),
    );
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="activity.csv"',
    },
  });
}

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildICS } from "@/lib/ics";

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

  const { data: plans } = await supabase
    .from("prep_plans")
    .select("id, scheduled_for, notes, status")
    .eq("household_id", membership.household_id)
    .neq("status", "skipped");

  const events = (plans ?? []).map((p) => ({
    uid: `${p.id}@babyfood`,
    start: new Date(p.scheduled_for),
    summary: `${p.status === "done" ? "✅ " : "🥕 "}${p.notes ?? "Baby food prep"}`,
    description: `Prep status: ${p.status}`,
  }));

  const ics = buildICS(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="baby-food-preps.ics"',
    },
  });
}

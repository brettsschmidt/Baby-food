import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getInsights } from "@/lib/queries/insights";
import { notifyHousehold } from "@/lib/push";

/**
 * Weekly digest cron. Run hourly via Vercel Cron / GitHub Actions; the route
 * picks subscribers whose `digest_send_dow + digest_send_hour` matches "now".
 *
 * Protected by CRON_SECRET; set the same value in `Authorization: Bearer ...`.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const dow = now.getUTCDay();
  const hour = now.getUTCHours();

  const { data: subs } = await admin
    .from("household_member_prefs")
    .select("household_id, user_id")
    .eq("notify_weekly_digest", true)
    .eq("digest_send_dow", dow)
    .eq("digest_send_hour", hour);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      const insights = await getInsights(
        admin as unknown as Parameters<typeof getInsights>[0],
        s.household_id,
        7,
      );
      const body = `${insights.feedingsThisWeek} feedings · ${insights.uniqueFoodsThisWeek} foods · variety ${insights.varietyScore}/100`;
      await notifyHousehold(s.household_id, null, {
        title: "Your week in baby food",
        body,
        url: "/insights?range=7",
      });
      sent++;
    } catch (err) {
      console.error("digest send failed", err);
    }
  }
  return NextResponse.json({ ok: true, sent });
}

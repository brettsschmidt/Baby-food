"use server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { notifyHousehold } from "@/lib/push";
import { getInsights } from "@/lib/queries/insights";

export async function sendTestPush(): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  await notifyHousehold(householdId, null, {
    title: "Baby Food test push",
    body: "If you're seeing this, push is wired up. 🥕",
    url: "/dashboard",
  });
}

export async function sendDigestNow(): Promise<void> {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  const insights = await getInsights(supabase, householdId, 7);
  await notifyHousehold(householdId, null, {
    title: "Your week in baby food",
    body: `${insights.feedingsThisWeek} feedings · ${insights.uniqueFoodsThisWeek} foods · variety ${insights.varietyScore}/100`,
    url: "/insights?range=7",
  });
}

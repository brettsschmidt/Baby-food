"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const METRICS = ["unique_foods", "feedings", "variety_score", "self_feed_meals"] as const;
type Metric = (typeof METRICS)[number];

export async function setGoal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);
  const metricRaw = String(formData.get("metric") ?? "");
  const target = Number(formData.get("target") ?? 0);
  if (!METRICS.includes(metricRaw as Metric) || target <= 0) return;
  await supabase.from("goals").upsert(
    {
      household_id: householdId,
      baby_id: baby?.id ?? null,
      metric: metricRaw as Metric,
      target,
      period: "month",
      created_by: userId,
    },
    { onConflict: "household_id,baby_id,metric,period" },
  );
  revalidatePath("/dashboard");
  revalidatePath("/insights");
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await requireHousehold(supabase);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/dashboard");
}

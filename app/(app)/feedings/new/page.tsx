import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedingItemsField } from "@/components/feedings/feeding-items-field";
import { FeedingForm } from "@/components/feedings/feeding-form";
import { MethodFields } from "@/components/feedings/method-fields";
import { OfflineBridge } from "@/components/offline/offline-bridge";
import { PhotoField } from "@/components/photo/photo-field";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

function nowLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function NewFeedingPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, unit, quantity, expiry_date")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(50);

  // Smart suggestions: demote items fed in the last 4 hours, leave the rest in expiry order.
  const nowMs = new Date().getTime();
  const since4h = new Date(nowMs - 4 * 3600 * 1000).toISOString();
  const since7d = new Date(nowMs - 7 * 86400 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("feeding_items")
    .select("inventory_item_id, feedings!inner(fed_at, household_id, archived_at)")
    .eq("feedings.household_id", householdId)
    .is("feedings.archived_at", null)
    .gte("feedings.fed_at", since7d)
    .returns<{ inventory_item_id: string | null; feedings: { fed_at: string } | null }[]>();

  const lastFedAt = new Map<string, string>();
  for (const r of recent ?? []) {
    if (!r.inventory_item_id || !r.feedings) continue;
    const cur = lastFedAt.get(r.inventory_item_id);
    if (!cur || r.feedings.fed_at > cur) lastFedAt.set(r.inventory_item_id, r.feedings.fed_at);
  }
  const sortedItems = (items ?? [])
    .map((it) => ({ ...it, demote: (lastFedAt.get(it.id) ?? "") >= since4h }))
    .sort((a, b) => Number(a.demote) - Number(b.demote));

  const { data: babyRow } = baby
    ? await supabase
        .from("babies")
        .select("known_allergens")
        .eq("id", baby.id)
        .maybeSingle()
    : { data: null };
  const allergens = babyRow?.known_allergens ?? [];

  const { data: readiness } = baby
    ? await supabase
        .from("readiness_evaluations")
        .select("ready, evaluated_on")
        .eq("baby_id", baby.id)
        .order("evaluated_on", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const notReady = baby && readiness && !readiness.ready;

  return (
    <>
      <AppHeader
        title="Log feeding"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/feedings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <FeedingForm>
        <OfflineBridge />
        {notReady && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-xs dark:bg-amber-950/30">
            <p className="font-medium">{baby?.name} hasn&apos;t been marked ready for solids.</p>
            <p className="mt-1 text-muted-foreground">
              Run through the{" "}
              <Link href="/care/readiness" className="underline">
                readiness checklist
              </Link>{" "}
              first.
            </p>
          </div>
        )}
        {allergens.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-xs dark:bg-amber-950/30">
            <p className="font-medium">
              {baby?.name} has known allergens: {allergens.join(", ")}
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="allergen_override" />
              Override and log anyway
            </label>
          </div>
        )}
        <FeedingItemsField inventory={sortedItems} />

        <div className="space-y-2">
          <Label>Reaction</Label>
          <div className="grid grid-cols-5 gap-2">
            {(["loved", "liked", "neutral", "disliked", "refused"] as const).map((m) => (
              <label
                key={m}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-md border bg-background p-2 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input type="radio" name="mood" value={m} className="sr-only" />
                <span className="text-lg">
                  {m === "loved" ? "😍" : m === "liked" ? "🙂" : m === "neutral" ? "😐" : m === "disliked" ? "😕" : "🙅"}
                </span>
                <span className="capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>

        <MethodFields />
        <div className="space-y-2">
          <Label htmlFor="fed_at">When</Label>
          <Input id="fed_at" name="fed_at" type="datetime-local" defaultValue={nowLocalISO()} />
        </div>

        <PhotoField name="photo_path" label="Photo (optional)" />

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="First time trying — no rash" />
        </div>

      </FeedingForm>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logFeeding } from "@/lib/actions/feedings";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

function nowLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function NewFeedingPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, unit, quantity")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(50);

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
      <form action={logFeeding} className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="space-y-2">
          <Label htmlFor="inventory_item_id">From inventory</Label>
          <select
            id="inventory_item_id"
            name="inventory_item_id"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            defaultValue=""
          >
            <option value="">— pick or leave empty —</option>
            {items?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity} {i.unit} left)
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="quantity">Amount</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="0.5"
              defaultValue={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_food">Or write it in</Label>
            <Input
              id="custom_food"
              name="custom_food"
              placeholder="A bite of banana"
              autoComplete="off"
            />
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              name="method"
              defaultValue="spoon"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="spoon">Spoon-fed</option>
              <option value="self_feed">Self-fed</option>
              <option value="bottle">Bottle</option>
              <option value="breast">Breast</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fed_at">When</Label>
            <Input id="fed_at" name="fed_at" type="datetime-local" defaultValue={nowLocalISO()} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="First time trying — no rash" />
        </div>

        <Button type="submit" size="lg" className="w-full">
          Save feeding
        </Button>
      </form>
    </>
  );
}

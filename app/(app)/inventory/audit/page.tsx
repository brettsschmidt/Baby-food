import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { expiryStatus } from "@/lib/dates";
import { bulkArchiveInventory } from "@/lib/actions/inventory";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function InventoryAuditPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, storage, unit, quantity, expiry_date")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  return (
    <>
      <AppHeader
        title="Audit"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <form action={bulkArchiveInventory} className="flex-1 space-y-4 px-4 py-4 pb-8">
        <p className="text-sm text-muted-foreground">
          Tick anything that&apos;s gone bad or is no longer in the freezer. Submitting will
          mark them wasted in one pass.
        </p>

        <div className="space-y-2">
          {items?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing to audit — your freezer is empty.</p>
          )}
          {items?.map((item) => {
            const status = expiryStatus(item.expiry_date);
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors has-[:checked]:bg-destructive/10 has-[:checked]:border-destructive/40"
              >
                <input
                  type="checkbox"
                  name="id"
                  value={item.id}
                  className="h-5 w-5 accent-destructive"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} · {item.storage}
                  </p>
                </div>
                {item.expiry_date && (
                  <span className="text-xs text-muted-foreground">{status.label}</span>
                )}
              </label>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reason</label>
          <select
            name="reason"
            defaultValue="waste"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="waste">Wasted (spoiled / freezer-burnt)</option>
            <option value="correction">Correction (count was off)</option>
          </select>
        </div>

        <Button type="submit" size="lg" variant="destructive" className="w-full">
          Archive selected
        </Button>
      </form>
    </>
  );
}

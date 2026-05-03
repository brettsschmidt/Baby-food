import Link from "next/link";
import { ListChecks, Package, Plus, Refrigerator, Snowflake } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { expiryStatus } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const storageIcon = {
  freezer: Snowflake,
  fridge: Refrigerator,
  pantry: Package,
} as const;

export default async function InventoryPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: items } = await supabase
    .from("inventory_items")
    .select(
      "id, name, storage, unit, quantity, initial_quantity, expiry_date, low_stock_threshold, sub_location",
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const lowStockItems = (items ?? []).filter(
    (i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold,
  );

  return (
    <>
      <RealtimeRefresher
        tables={["inventory_items", "inventory_movements"]}
        householdId={householdId}
      />
      <AppHeader
        title="Inventory"
        action={
          <Button asChild size="sm">
            <Link href="/inventory/new">
              <Plus className="h-4 w-4" />
              Add
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-3 px-4 py-4 pb-8">
        {lowStockItems.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/30">
            <p className="font-medium">{lowStockItems.length} low-stock item(s)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lowStockItems.map((i) => i.name).join(", ")}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link
                href={`/planner/new?food_name=${encodeURIComponent(lowStockItems[0].name ?? "")}`}
              >
                Plan a refill
              </Link>
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory/import">Import CSV</Link>
          </Button>
          {(items ?? []).length > 0 && (
            <Button asChild size="sm" variant="ghost">
              <Link href="/inventory/audit">
                <ListChecks className="h-4 w-4" /> Bulk audit
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {items && items.length > 0 ? (
            items.map((item) => {
              const Icon = storageIcon[item.storage as keyof typeof storageIcon] ?? Package;
              const status = expiryStatus(item.expiry_date);
              const isLow =
                item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold;
              return (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} of {item.initial_quantity} {item.unit}
                      {item.sub_location && <> · {item.sub_location}</>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isLow && <Badge variant="warning">Low</Badge>}
                    {item.expiry_date && <Badge variant={status.variant}>{status.label}</Badge>}
                  </div>
                </Link>
              );
            })
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border p-10 text-center">
      <Package className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">Nothing in your freezer yet</p>
        <p className="text-sm text-muted-foreground">Add your first batch of baby food.</p>
      </div>
      <Button asChild>
        <Link href="/inventory/new">
          <Plus className="h-4 w-4" /> Add item
        </Link>
      </Button>
    </div>
  );
}

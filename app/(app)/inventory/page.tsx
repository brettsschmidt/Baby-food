import Image from "next/image";
import Link from "next/link";
import { ListChecks, Lock, Package, Plus, Refrigerator, Snowflake } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickAdjust } from "@/components/inventory/quick-adjust";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { expiryStatus } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const storageIcon = {
  freezer: Snowflake,
  fridge: Refrigerator,
  pantry: Package,
} as const;

type StorageKey = keyof typeof storageIcon;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ storage?: string; sort?: string; group?: string }>;
}) {
  const { storage: storageFilter, sort, group } = await searchParams;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  let query = supabase
    .from("inventory_items")
    .select(
      "id, name, storage, unit, quantity, initial_quantity, expiry_date, low_stock_threshold, sub_location, photo_path, reserved_at, cost_cents",
    )
    .eq("household_id", householdId)
    .is("archived_at", null);

  if (storageFilter && storageFilter in storageIcon) {
    query = query.eq("storage", storageFilter as StorageKey);
  }

  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else if (sort === "qty") {
    query = query.order("quantity", { ascending: false });
  } else {
    query = query.order("expiry_date", { ascending: true, nullsFirst: false });
  }

  const { data: items } = await query;
  const lowStockItems = (items ?? []).filter(
    (i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold,
  );

  const { data: household } = await supabase
    .from("households")
    .select("storage_capacity_freezer, storage_capacity_fridge, storage_capacity_pantry")
    .eq("id", householdId)
    .maybeSingle();

  const totals: Record<StorageKey, number> = { freezer: 0, fridge: 0, pantry: 0 };
  for (const it of items ?? []) {
    if (it.storage in totals) {
      totals[it.storage as StorageKey] += Number(it.quantity);
    }
  }
  const capacity: Record<StorageKey, number | null> = {
    freezer: household?.storage_capacity_freezer ?? null,
    fridge: household?.storage_capacity_fridge ?? null,
    pantry: household?.storage_capacity_pantry ?? null,
  };

  // Optional grouping by sub-location.
  const groupBySub = group === "location";
  const groups = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const key = groupBySub ? (it.sub_location ?? "Unsorted") : it.storage;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

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
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-3 px-4 py-4 pb-8">
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(Object.keys(totals) as StorageKey[]).map((k) => {
            const count = totals[k];
            const cap = capacity[k];
            const pct = cap && cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
            const Icon = storageIcon[k];
            return (
              <div key={k} className="rounded-md border bg-card/60 p-2">
                <p className="flex items-center gap-1 capitalize">
                  <Icon className="h-3 w-3" aria-hidden="true" /> {k}
                </p>
                <p className="font-semibold">
                  {count} {cap != null ? `/ ${cap}` : ""}
                </p>
                {cap && (
                  <div className="mt-1 h-1 overflow-hidden rounded bg-muted">
                    <div
                      className={pct >= 90 ? "h-full bg-destructive" : "h-full bg-primary"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {lowStockItems.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/30">
            <p className="font-medium">{lowStockItems.length} low-stock item(s)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lowStockItems.map((i) => i.name).join(", ")}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">Filter:</span>
          {(["all", "freezer", "fridge", "pantry"] as const).map((k) => (
            <Button
              key={k}
              asChild
              size="sm"
              variant={storageFilter === k || (!storageFilter && k === "all") ? "default" : "ghost"}
            >
              <Link href={k === "all" ? "/inventory" : `/inventory?storage=${k}`}>{k}</Link>
            </Button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">Sort:</span>
          {(["expiry", "name", "qty"] as const).map((k) => {
            const params = new URLSearchParams();
            if (storageFilter) params.set("storage", storageFilter);
            if (k !== "expiry") params.set("sort", k);
            if (group) params.set("group", group);
            return (
              <Button
                key={k}
                asChild
                size="sm"
                variant={(sort ?? "expiry") === k ? "default" : "ghost"}
              >
                <Link href={`/inventory?${params}`}>{k}</Link>
              </Button>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">Group:</span>
          {(["none", "location"] as const).map((k) => {
            const params = new URLSearchParams();
            if (storageFilter) params.set("storage", storageFilter);
            if (sort) params.set("sort", sort);
            if (k === "location") params.set("group", "location");
            return (
              <Button
                key={k}
                asChild
                size="sm"
                variant={(group ?? "none") === k ? "default" : "ghost"}
              >
                <Link href={`/inventory?${params}`}>{k}</Link>
              </Button>
            );
          })}
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory/import">CSV</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory/audit">
              <ListChecks className="h-4 w-4" aria-hidden="true" /> Audit
            </Link>
          </Button>
        </div>

        {items && items.length > 0 ? (
          Array.from(groups.entries()).map(([key, list]) => (
            <section key={key} className="space-y-2">
              {(groupBySub || groups.size > 1) && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {key}
                </h2>
              )}
              <div className="space-y-2">
                {(list ?? []).map((item) => {
                  const Icon = storageIcon[item.storage as StorageKey] ?? Package;
                  const status = expiryStatus(item.expiry_date);
                  const isLow =
                    item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      <Link
                        href={`/inventory/${item.id}`}
                        className="flex flex-1 items-center gap-3 min-w-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                          {item.photo_path ? (
                            <Image
                              src={`/api/photo?path=${encodeURIComponent(item.photo_path)}`}
                              alt=""
                              width={40}
                              height={40}
                              unoptimized
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {item.name}
                            {item.reserved_at && (
                              <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} of {item.initial_quantity} {item.unit}
                            {item.sub_location && <> · {item.sub_location}</>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isLow && <Badge variant="warning">Low</Badge>}
                          {item.expiry_date && (
                            <Badge variant={status.variant}>{status.label}</Badge>
                          )}
                        </div>
                      </Link>
                      <QuickAdjust id={item.id} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="Nothing in your freezer yet"
            description="Add your first batch of baby food."
            action={
              <Button asChild>
                <Link href="/inventory/new">
                  <Plus className="h-4 w-4" /> Add item
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { expiryStatus, relativeTime } from "@/lib/dates";
import { adjustInventoryItem, archiveInventoryItem } from "@/lib/actions/inventory";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: item } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (!item) notFound();

  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("id, delta, reason, created_at")
    .eq("inventory_item_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const status = expiryStatus(item.expiry_date);

  return (
    <>
      <AppHeader
        title={item.name ?? "Item"}
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{item.name}</span>
              {item.expiry_date && <Badge variant={status.variant}>{status.label}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">
              {item.quantity}{" "}
              <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <form action={adjustInventoryItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="delta" value="-1" />
                <input type="hidden" name="reason" value="feeding" />
                <Button type="submit" variant="outline" className="w-full">
                  <Minus className="h-4 w-4" /> 1
                </Button>
              </form>
              <form action={adjustInventoryItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="delta" value="1" />
                <input type="hidden" name="reason" value="restock" />
                <Button type="submit" variant="outline" className="w-full">
                  <Plus className="h-4 w-4" /> 1
                </Button>
              </form>
              <form action={archiveInventoryItem}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="outline" className="w-full">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {movements && movements.length > 0 ? (
              movements.map((m, i) => (
                <div key={m.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between px-4 py-2">
                    <div>
                      <p className="text-sm font-medium capitalize">{m.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(m.created_at)}
                      </p>
                    </div>
                    <span
                      className={
                        m.delta < 0
                          ? "font-mono text-sm text-destructive"
                          : "font-mono text-sm text-emerald-600"
                      }
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function WastePage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: rows } = await supabase
    .from("inventory_movements")
    .select("delta, reason, inventory_item_id, inventory_items(name)")
    .eq("household_id", householdId)
    .lt("delta", 0)
    .returns<
      {
        delta: number;
        reason: string;
        inventory_item_id: string;
        inventory_items: { name: string | null } | null;
      }[]
    >();

  let consumed = 0;
  let wasted = 0;
  const wastedByItem = new Map<string, number>();
  for (const r of rows ?? []) {
    const abs = Math.abs(Number(r.delta));
    if (r.reason === "feeding") consumed += abs;
    else if (r.reason === "waste") {
      wasted += abs;
      const name = r.inventory_items?.name ?? "Unknown";
      wastedByItem.set(name, (wastedByItem.get(name) ?? 0) + abs);
    }
  }
  const total = consumed + wasted;
  const wastePct = total > 0 ? Math.round((wasted / total) * 100) : 0;

  const top = Array.from(wastedByItem.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <AppHeader
        title="Waste analytics"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/insights">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Consumed</p>
              <p className="text-2xl font-bold">{consumed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Wasted</p>
              <p className="text-2xl font-bold">{wasted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Waste %</p>
              <p className={`text-2xl font-bold ${wastePct > 20 ? "text-destructive" : ""}`}>
                {wastePct}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-destructive" /> Top wasted items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No waste recorded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {top.map(([name, qty]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between border-b pb-1 last:border-0"
                  >
                    <span>{name}</span>
                    <Badge variant="destructive">{qty}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

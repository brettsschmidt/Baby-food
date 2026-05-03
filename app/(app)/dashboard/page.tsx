import Link from "next/link";
import { CalendarDays, Package, Plus, Utensils } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { ageInMonths, expiryStatus, relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId);

  type LastFeeding = {
    id: string;
    fed_at: string;
    mood: string | null;
    notes: string | null;
    feeding_items: {
      notes: string | null;
      quantity: number | null;
      inventory_items: { name: string | null } | null;
    }[];
  };

  const [{ data: lastFeeding }, { data: expiring }, { data: upcomingPlan }] = await Promise.all([
    supabase
      .from("feedings")
      .select("id, fed_at, mood, notes, feeding_items(notes, quantity, inventory_items(name))")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .order("fed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<LastFeeding>(),
    supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, expiry_date")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gt("quantity", 0)
      .not("expiry_date", "is", null)
      .order("expiry_date", { ascending: true })
      .limit(3),
    supabase
      .from("prep_plans")
      .select("id, scheduled_for, notes, status")
      .eq("household_id", householdId)
      .eq("status", "planned")
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <RealtimeRefresher
        tables={["feedings", "inventory_items"]}
        householdId={householdId}
      />
      <AppHeader
        title="Baby Food"
        action={
          <Button asChild size="sm">
            <Link href="/feedings/new">
              <Plus className="h-4 w-4" />
              Log
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        {baby && (
          <div className="rounded-lg bg-accent/40 p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 className="text-lg font-semibold">
              {baby.name} · {ageInMonths(baby.birth_date)} months
            </h2>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-primary" /> Last feeding
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/feedings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lastFeeding ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {lastFeeding.feeding_items?.[0]?.inventory_items?.name ??
                    lastFeeding.feeding_items?.[0]?.notes ??
                    lastFeeding.notes ??
                    "Logged feeding"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {relativeTime(lastFeeding.fed_at)}
                  {lastFeeding.mood ? ` · ${lastFeeding.mood}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No feedings logged yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" /> Expiring soon
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/inventory">Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiring && expiring.length > 0 ? (
              expiring.map((item) => {
                const status = expiryStatus(item.expiry_date);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nothing in the freezer yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Next prep
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/planner">Planner</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingPlan ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{upcomingPlan.notes ?? "Prep session"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(upcomingPlan.scheduled_for).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming preps scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

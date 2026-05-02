import Link from "next/link";
import { Plus, CalendarDays, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function PlannerPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type PlanRow = {
    id: string;
    scheduled_for: string;
    status: "planned" | "in_progress" | "done" | "skipped";
    notes: string | null;
    prep_plan_items: { planned_quantity: number; unit: string }[];
  };

  const { data: plans } = await supabase
    .from("prep_plans")
    .select("id, scheduled_for, status, notes, prep_plan_items(planned_quantity, unit)")
    .eq("household_id", householdId)
    .order("scheduled_for", { ascending: true })
    .returns<PlanRow[]>();

  const upcoming = plans?.filter((p) => p.status === "planned" || p.status === "in_progress") ?? [];
  const past = plans?.filter((p) => p.status === "done" || p.status === "skipped") ?? [];

  return (
    <>
      <AppHeader
        title="Planner"
        action={
          <Button asChild size="sm">
            <Link href="/planner/new">
              <Plus className="h-4 w-4" />
              Plan
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-6 px-4 py-4 pb-8">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming
          </h2>
          {upcoming.length > 0 ? (
            upcoming.map((p) => (
              <Link
                key={p.id}
                href={`/planner/${p.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.notes ?? "Prep session"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.scheduled_for), "EEE, MMM d")}
                    {p.prep_plan_items?.[0]
                      ? ` · ${p.prep_plan_items[0].planned_quantity} ${p.prep_plan_items[0].unit}`
                      : ""}
                  </p>
                </div>
                <Badge variant={p.status === "in_progress" ? "warning" : "secondary"}>
                  {p.status}
                </Badge>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No prep sessions planned. Tap Plan to schedule one.
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </h2>
            {past.slice(0, 10).map((p) => (
              <Link
                key={p.id}
                href={`/planner/${p.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card/50 p-3 text-muted-foreground transition-colors hover:bg-accent/40"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.notes ?? "Prep"}</p>
                  <p className="text-xs">{format(new Date(p.scheduled_for), "MMM d")}</p>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

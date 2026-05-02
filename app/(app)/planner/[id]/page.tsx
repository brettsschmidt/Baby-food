import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePrepPlan } from "@/lib/actions/planner";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function PrepPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type PlanDetail = {
    id: string;
    scheduled_for: string;
    status: "planned" | "in_progress" | "done" | "skipped";
    notes: string | null;
    completed_at: string | null;
    prep_plan_items: { planned_quantity: number; unit: string }[];
  };

  const { data: plan } = await supabase
    .from("prep_plans")
    .select("id, scheduled_for, status, notes, completed_at, prep_plan_items(planned_quantity, unit)")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle()
    .returns<PlanDetail>();

  if (!plan) notFound();
  const item = plan.prep_plan_items?.[0];

  return (
    <>
      <AppHeader
        title="Prep details"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/planner">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{plan.notes ?? "Prep session"}</span>
              <Badge
                variant={
                  plan.status === "done"
                    ? "success"
                    : plan.status === "in_progress"
                      ? "warning"
                      : "secondary"
                }
              >
                {plan.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              Scheduled for{" "}
              <strong className="text-foreground">
                {format(new Date(plan.scheduled_for), "EEEE, MMM d")}
              </strong>
            </p>
            {item && (
              <p>
                Aiming for{" "}
                <strong className="text-foreground">
                  {item.planned_quantity} {item.unit}
                </strong>
              </p>
            )}
            {plan.completed_at && <p>Completed {format(new Date(plan.completed_at), "PPP")}</p>}
          </CardContent>
        </Card>

        {plan.status !== "done" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark as done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={completePrepPlan} className="space-y-4">
                <input type="hidden" name="id" value={plan.id} />
                <div className="space-y-2">
                  <Label htmlFor="item_name">Inventory name</Label>
                  <Input
                    id="item_name"
                    name="item_name"
                    required
                    defaultValue={plan.notes ?? ""}
                    placeholder="What did you produce?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="actual_quantity">Actual</Label>
                    <Input
                      id="actual_quantity"
                      name="actual_quantity"
                      type="number"
                      min="1"
                      defaultValue={item?.planned_quantity ?? 12}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <select
                      id="unit"
                      name="unit"
                      defaultValue={item?.unit ?? "cube"}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                    >
                      <option value="cube">cubes</option>
                      <option value="jar">jars</option>
                      <option value="pouch">pouches</option>
                      <option value="serving">servings</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Use-by</Label>
                  <Input id="expiry_date" name="expiry_date" type="date" />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Add to inventory
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

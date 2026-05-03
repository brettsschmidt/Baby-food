import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveReadiness } from "@/lib/actions/readiness";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const SIGNS = [
  { name: "sits_unsupported", label: "Sits up unsupported", hint: "Without leaning on hands or pillows." },
  { name: "has_head_control", label: "Strong head control", hint: "Holds head steady when upright." },
  { name: "lost_tongue_thrust", label: "Lost tongue-thrust reflex", hint: "Doesn't push food back out automatically." },
  { name: "shows_interest", label: "Shows interest in food", hint: "Watches you eat, opens mouth, reaches." },
  { name: "can_grasp", label: "Can grasp objects", hint: "Brings hands to mouth deliberately." },
];

export default async function ReadinessPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Readiness" />
        <div className="flex-1 px-6 py-12 text-center text-sm text-muted-foreground">
          Add a baby first.
        </div>
      </>
    );
  }

  const { data: history } = await supabase
    .from("readiness_evaluations")
    .select("id, evaluated_on, ready, notes")
    .eq("baby_id", baby.id)
    .order("evaluated_on", { ascending: false })
    .limit(10);

  const latest = history?.[0];

  return (
    <>
      <AppHeader
        title="Readiness"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/care">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signs of readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveReadiness} className="space-y-3">
              {SIGNS.map((s) => (
                <label
                  key={s.name}
                  className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input type="checkbox" name={s.name} className="peer mt-1 sr-only" />
                  <Circle className="h-5 w-5 text-muted-foreground peer-checked:hidden" aria-hidden="true" />
                  <CheckCircle2 className="hidden h-5 w-5 text-primary peer-checked:block" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.hint}</p>
                  </div>
                </label>
              ))}
              <Textarea
                name="notes"
                placeholder="Notes for the pediatrician (optional)"
                rows={2}
              />
              <Button type="submit" className="w-full">
                Save evaluation
              </Button>
              <p className="text-xs text-muted-foreground">
                Verdict: 4-of-5 signs present means ready for solids. The signal is heuristic — talk
                to your pediatrician first.
              </p>
            </form>
          </CardContent>
        </Card>

        {latest && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest verdict</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={latest.ready ? "success" : "warning"}>
                {latest.ready ? "Ready" : "Not yet"}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                Recorded {format(new Date(latest.evaluated_on), "PPP")}
              </p>
              {latest.notes && <p className="mt-2 text-sm">{latest.notes}</p>}
            </CardContent>
          </Card>
        )}

        {history && history.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                    <span>{format(new Date(h.evaluated_on), "MMM d, yyyy")}</span>
                    <Badge variant={h.ready ? "success" : "secondary"}>
                      {h.ready ? "Ready" : "Not yet"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft, Pill } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { deleteSupplement, logSupplement } from "@/lib/actions/supplements";
import { relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

const KINDS = [
  { value: "vitamin_d", label: "Vitamin D", emoji: "☀️" },
  { value: "iron", label: "Iron", emoji: "🩸" },
  { value: "other", label: "Other", emoji: "💊" },
] as const;

export default async function SupplementsPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Supplements" />
        <div className="flex-1 px-6 py-12 text-center text-sm text-muted-foreground">
          Add a baby first.
        </div>
      </>
    );
  }

  const { data: logs } = await supabase
    .from("supplement_logs")
    .select("id, kind, given_at, dose, notes")
    .eq("baby_id", baby.id)
    .order("given_at", { ascending: false })
    .limit(40);

  const lastVitD = logs?.find((l) => l.kind === "vitamin_d");
  const nowMs = new Date().getTime();
  const hoursSinceVitD = lastVitD
    ? Math.floor((nowMs - new Date(lastVitD.given_at).getTime()) / 3600000)
    : null;

  return (
    <>
      <RealtimeRefresher tables={["supplement_logs"]} householdId={householdId} />
      <AppHeader
        title="Supplements"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/care">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        {hoursSinceVitD != null && hoursSinceVitD > 24 && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-xs dark:bg-amber-950/30">
            <p className="font-medium">Vitamin D not logged in the last 24 hours</p>
            <p className="text-muted-foreground">Last given {hoursSinceVitD}h ago.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-primary" /> Quick log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <form key={k.value} action={logSupplement}>
                  <input type="hidden" name="kind" value={k.value} />
                  <Button type="submit" variant="outline" className="w-full">
                    <span aria-hidden="true">{k.emoji}</span> {k.label}
                  </Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>

        {logs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {logs.map((l) => {
                  const meta = KINDS.find((k) => k.value === l.kind);
                  return (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2"
                    >
                      <div>
                        <p>
                          <span aria-hidden="true">{meta?.emoji}</span>{" "}
                          {meta?.label ?? l.kind}
                          {l.dose && <span className="text-muted-foreground"> · {l.dose}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(l.given_at), "MMM d, h:mm a")} · {relativeTime(l.given_at)}
                        </p>
                      </div>
                      <form action={deleteSupplement}>
                        <input type="hidden" name="id" value={l.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          aria-label={`Remove supplement ${meta?.label ?? l.kind}`}
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  );
                })}
                {!logs.length && <Badge variant="secondary">No supplements logged yet.</Badge>}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

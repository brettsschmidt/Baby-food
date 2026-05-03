import { Baby, Droplets, Moon } from "lucide-react";
import { differenceInMinutes, format, isToday, isYesterday } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import {
  deleteDiaper,
  deleteSleep,
  endSleep,
  logDiaper,
  startSleep,
} from "@/lib/actions/care";
import { relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export default async function CarePage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Care" />
        <div className="flex-1 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Add a baby first.</p>
        </div>
      </>
    );
  }

  const [{ data: diapers }, { data: sleeps }] = await Promise.all([
    supabase
      .from("diaper_logs")
      .select("id, changed_at, kind, notes")
      .eq("baby_id", baby.id)
      .order("changed_at", { ascending: false })
      .limit(40),
    supabase
      .from("sleep_logs")
      .select("id, started_at, ended_at, kind, notes")
      .eq("baby_id", baby.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const activeSleep = sleeps?.find((s) => !s.ended_at);

  return (
    <>
      <RealtimeRefresher tables={["diaper_logs", "sleep_logs"]} householdId={householdId} />
      <AppHeader title="Care" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4 text-primary" /> Sleep
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSleep ? (
              <form action={endSleep} className="space-y-2">
                <input type="hidden" name="id" value={activeSleep.id} />
                <div className="rounded-md bg-accent/40 p-3 text-sm">
                  <p className="font-medium capitalize">{activeSleep.kind} sleeping</p>
                  <p className="text-xs text-muted-foreground">
                    Started {relativeTime(activeSleep.started_at)}
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Wake up
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <form action={startSleep}>
                  <input type="hidden" name="kind" value="nap" />
                  <Button type="submit" variant="outline" className="w-full">
                    Start nap
                  </Button>
                </form>
                <form action={startSleep}>
                  <input type="hidden" name="kind" value="night" />
                  <Button type="submit" variant="outline" className="w-full">
                    Bedtime
                  </Button>
                </form>
              </div>
            )}
            {sleeps && sleeps.filter((s) => s.ended_at).length > 0 && (
              <ul className="space-y-1 text-sm">
                {sleeps
                  .filter((s) => s.ended_at)
                  .slice(0, 5)
                  .map((s) => {
                    const dur = differenceInMinutes(new Date(s.ended_at!), new Date(s.started_at));
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="capitalize">{s.kind}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayLabel(new Date(s.started_at))} · {format(new Date(s.started_at), "h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {Math.floor(dur / 60)}h {dur % 60}m
                          </Badge>
                          <form action={deleteSleep}>
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4 text-primary" /> Diapers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={logDiaper} className="grid grid-cols-4 gap-2">
              {(["wet", "dirty", "both", "dry"] as const).map((k) => (
                <button
                  key={k}
                  name="kind"
                  value={k}
                  type="submit"
                  className="rounded-md border bg-background py-2 text-xs capitalize hover:bg-accent/40"
                >
                  {k === "wet" && "💧 "}
                  {k === "dirty" && "💩 "}
                  {k === "both" && "💧💩 "}
                  {k === "dry" && "✓ "}
                  {k}
                </button>
              ))}
            </form>
            {diapers && diapers.length > 0 && (
              <ul className="space-y-1 text-sm">
                {diapers.slice(0, 8).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="capitalize">{d.kind}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(d.changed_at)}
                      </p>
                    </div>
                    <form action={deleteDiaper}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="h-4 w-4 text-primary" /> Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <a href="/growth">Open growth log</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


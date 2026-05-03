import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedingHeatmap } from "@/components/feedings/heatmap";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const HEATMAP_WEEKS = 8;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const today = new Date();
  const cursor = month ? new Date(month + "-01") : today;
  const firstOfMonth = startOfMonth(cursor);
  const lastOfMonth = endOfMonth(cursor);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 });

  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const heatmapStart = subDays(today, HEATMAP_WEEKS * 7);
  const monthStartIso = gridStart.toISOString();

  const [{ data: monthRows }, { data: heatmapRows }] = await Promise.all([
    supabase
      .from("feedings")
      .select("fed_at")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gte("fed_at", monthStartIso)
      .lt("fed_at", addDays(lastOfMonth, 7).toISOString()),
    supabase
      .from("feedings")
      .select("fed_at")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .gte("fed_at", heatmapStart.toISOString()),
  ]);

  const counts = new Map<string, number>();
  for (const r of monthRows ?? []) {
    const key = format(new Date(r.fed_at), "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of heatmapRows ?? []) {
    const d = new Date(r.fed_at);
    matrix[d.getDay()][d.getHours()] += 1;
  }

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
  }

  const prev = format(subDays(firstOfMonth, 1), "yyyy-MM");
  const next = format(addDays(lastOfMonth, 1), "yyyy-MM");

  return (
    <>
      <AppHeader
        title="Calendar"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/feedings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="flex items-center justify-between">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/feedings/calendar?month=${prev}`} aria-label="Previous month">
              ← {format(subDays(firstOfMonth, 1), "MMM")}
            </Link>
          </Button>
          <h2 className="text-base font-semibold">{format(cursor, "MMMM yyyy")}</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/feedings/calendar?month=${next}`} aria-label="Next month">
              {format(addDays(lastOfMonth, 1), "MMM")} →
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {weeks.flat().map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const count = counts.get(key) ?? 0;
                const inMonth = isSameMonth(d, cursor);
                const isToday = isSameDay(d, today);
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex h-12 flex-col items-center justify-start rounded-md border p-1 text-[10px]",
                      !inMonth && "opacity-40",
                      isToday && "ring-2 ring-primary",
                      count > 0 && "bg-primary/10",
                    )}
                    aria-label={`${format(d, "PPP")}: ${count} feedings`}
                  >
                    <span className="font-semibold">{format(d, "d")}</span>
                    {count > 0 && <span className="text-primary">{count}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time-of-day heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <FeedingHeatmap matrix={matrix} weeks={HEATMAP_WEEKS} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

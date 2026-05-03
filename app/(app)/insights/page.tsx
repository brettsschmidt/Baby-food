import { AlertTriangle, Heart, RotateCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { getInsights } from "@/lib/queries/insights";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);
  const insights = await getInsights(supabase, householdId);

  const wowDelta = insights.feedingsThisWeek - insights.feedingsLastWeek;

  return (
    <>
      <AppHeader title="Insights" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        {insights.allergenWatch.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Allergen watch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {insights.allergenWatch.map((w) => (
                <div key={w.foodName} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{w.foodName}</p>
                    <p className="text-xs text-muted-foreground">
                      Introduced {w.hoursSinceIntro}h ago — watch until{" "}
                      {format(new Date(w.windowEnds), "EEE h:mm a")}
                    </p>
                  </div>
                  <Badge variant="warning">{Math.max(0, 72 - w.hoursSinceIntro)}h left</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Feedings (7d)" value={insights.feedingsThisWeek} delta={wowDelta} />
          <Stat label="Foods tried" value={insights.uniqueFoodsThisWeek} />
          <Stat label="From freezer" value={`${insights.inventorySharePct}%`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" /> Reactions this week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(insights.moodCounts).every(([, v]) => v === 0) ? (
              <p className="text-sm text-muted-foreground">No moods recorded yet.</p>
            ) : (
              Object.entries(insights.moodCounts).map(([mood, count]) => {
                const total =
                  Object.values(insights.moodCounts).reduce((a, b) => a + b, 0) || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={mood} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{mood}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {insights.byFood.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most-fed foods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.byFood.map((f) => (
                <div key={f.name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{f.name}</span>
                  <span className="text-muted-foreground">
                    {f.total} {f.loved > 0 && <span className="text-rose-500">· {f.loved}❤</span>}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {insights.refusedRecently.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" /> Often refused lately
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {insights.refusedRecently.map((r) => (
                <div key={r.name} className="flex items-center justify-between">
                  <span>{r.name}</span>
                  <Badge variant="destructive">{r.count}×</Badge>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Try again in a week — taste preferences shift fast at this age.
              </p>
            </CardContent>
          </Card>
        )}

        {insights.triedNeverSince.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCw className="h-4 w-4 text-muted-foreground" /> Tried but not in 2 weeks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {insights.triedNeverSince.map((n) => (
                  <Badge key={n} variant="secondary">
                    {n}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Stock forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Burning <strong>{insights.consumptionPerDay.toFixed(1)}</strong> units / day
            </p>
            <p>
              <strong>{insights.totalUnitsLeft}</strong> units in stock
            </p>
            {insights.daysOfStockLeft != null ? (
              <p
                className={
                  insights.daysOfStockLeft <= 5
                    ? "font-semibold text-destructive"
                    : "text-muted-foreground"
                }
              >
                ~{insights.daysOfStockLeft} days of stock left
              </p>
            ) : (
              <p className="text-muted-foreground">Not enough data to forecast yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`flex items-center gap-1 text-xs ${delta > 0 ? "text-emerald-600" : "text-destructive"}`}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? "+" : ""}
          {delta} vs last
        </p>
      )}
    </div>
  );
}

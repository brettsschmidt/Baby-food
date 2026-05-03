import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Flame, Heart, Package, Plus, Sparkles, Trophy, Utensils } from "lucide-react";
import { subDays } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { QuickLog } from "@/components/dashboard/quick-log";
import { StickyNotes } from "@/components/dashboard/sticky-notes";
import { FirstRunTour } from "@/components/onboarding/first-run-tour";
import { InstallBanner } from "@/components/pwa/install-banner";
import { SwUpdatePrompt } from "@/components/pwa/sw-update-prompt";
import { VoiceButton } from "@/components/voice/voice-button";
import { ageInMonths, expiryStatus, relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { getFeedingStreak } from "@/lib/queries/milestones";
import {
  getFirstTryAnniversaries,
  getMemoryOfTheDay,
  getStreakDelta,
  getWeeklyWinner,
} from "@/lib/queries/dashboard-extras";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

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

  type FavRow = {
    inventory_item_id: string | null;
    notes: string | null;
    inventory_items: { name: string | null } | null;
  };

  const since = subDays(new Date(), 7).toISOString();

  const [{ data: lastFeeding }, { data: expiring }, { data: upcomingPlan }, { data: favRows }] =
    await Promise.all([
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
      supabase
        .from("feeding_items")
        .select("inventory_item_id, notes, inventory_items(name), feedings!inner(fed_at, household_id, archived_at)")
        .eq("feedings.household_id", householdId)
        .is("feedings.archived_at", null)
        .gte("feedings.fed_at", since)
        .returns<FavRow[]>(),
    ]);

  const streak = await getFeedingStreak(supabase, householdId);
  const { data: latestMilestones } = await supabase
    .from("milestones")
    .select("kind, detail, achieved_at")
    .eq("household_id", householdId)
    .order("achieved_at", { ascending: false })
    .limit(1);
  const latestMilestone = latestMilestones?.[0];

  // Tally top-3 most-fed foods this week (by inventory item name OR custom note).
  const counts = new Map<string, { name: string; inventoryItemId: string | null; count: number }>();
  for (const r of favRows ?? []) {
    const name = r.inventory_items?.name ?? r.notes;
    if (!name) continue;
    const key = (r.inventory_item_id ?? "") + ":" + name.toLowerCase();
    const cur = counts.get(key) ?? { name, inventoryItemId: r.inventory_item_id, count: 0 };
    cur.count += 1;
    counts.set(key, cur);
  }
  const favourites = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const { data: stickyNotes } = await supabase
    .from("sticky_notes")
    .select("id, body, color, pinned")
    .eq("household_id", householdId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  const [anniversaries, motd, winner, delta, { data: recentMemories }] = await Promise.all([
    getFirstTryAnniversaries(supabase, householdId),
    getMemoryOfTheDay(supabase, householdId),
    getWeeklyWinner(supabase, householdId),
    getStreakDelta(supabase, householdId),
    supabase
      .from("memories")
      .select("id, photo_path, caption")
      .eq("household_id", householdId)
      .not("photo_path", "is", null)
      .order("occurred_on", { ascending: false })
      .limit(8),
  ]);

  const { data: goals } = await supabase
    .from("goals")
    .select("id, metric, target")
    .eq("household_id", householdId)
    .or(`baby_id.eq.${baby?.id ?? ""},baby_id.is.null`);

  const { data: openShifts } = await supabase
    .from("caregiver_shifts")
    .select("id, user_id, starts_at, profiles:user_id(display_name)")
    .eq("household_id", householdId)
    .is("ends_at", null)
    .returns<
      {
        id: string;
        user_id: string;
        starts_at: string;
        profiles: { display_name: string | null } | null;
      }[]
    >();
  const onDuty = openShifts?.[0];

  return (
    <>
      <RealtimeRefresher
        tables={["feedings", "inventory_items", "sticky_notes"]}
        householdId={householdId}
      />
      <FirstRunTour />
      <SwUpdatePrompt />
      <AppHeader
        title="Baby Food"
        action={
          <>
            <VoiceButton />
            <Button asChild size="sm">
              <Link href="/feedings/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Log
              </Link>
            </Button>
          </>
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

        <InstallBanner />
        <QuickLog favourites={favourites} hasLastFeeding={!!lastFeeding} />
        <StickyNotes notes={stickyNotes ?? []} />

        {onDuty && (
          <div className="rounded-md bg-emerald-100 p-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <strong>{onDuty.profiles?.display_name ?? "Member"}</strong> is on duty since{" "}
            {relativeTime(onDuty.starts_at)}.
          </div>
        )}

        {(streak.current > 0 || latestMilestone || winner) && (
          <div className="flex flex-wrap gap-2">
            {streak.current > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <Flame className="h-3 w-3" aria-hidden="true" />
                {streak.current}-day streak
              </span>
            )}
            {latestMilestone && (
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {latestMilestone.detail ?? latestMilestone.kind}
              </span>
            )}
            {winner && (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-900 dark:bg-rose-950 dark:text-rose-100">
                <Trophy className="h-3 w-3" aria-hidden="true" />
                Loved this week: {winner.name}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {delta.thisMonth} feedings this month ({delta.thisMonth - delta.lastMonth >= 0 ? "+" : ""}
              {delta.thisMonth - delta.lastMonth} vs last)
            </span>
          </div>
        )}

        {anniversaries.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/40 dark:bg-rose-950/20">
            <CardContent className="space-y-1 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Heart className="h-4 w-4 text-rose-500" aria-hidden="true" /> On this day
              </p>
              {anniversaries.map((a) => (
                <p key={a.name} className="text-xs text-muted-foreground">
                  {a.yearsAgo} year{a.yearsAgo === 1 ? "" : "s"} ago: first taste of{" "}
                  <strong className="text-foreground">{a.name}</strong>
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {motd && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-rose-500" aria-hidden="true" /> Memory of the day
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              {motd.photo_path && (
                <Image
                  src={`/api/photo?path=${encodeURIComponent(motd.photo_path)}`}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p>{motd.caption ?? "A moment to remember."}</p>
                <p className="text-xs text-muted-foreground">
                  {motd.yearsAgo} year{motd.yearsAgo === 1 ? "" : "s"} ago today
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {recentMemories && recentMemories.length > 0 && (
          <div className="overflow-x-auto">
            <ul className="flex gap-2">
              {recentMemories.map((m) => (
                <li key={m.id} className="shrink-0">
                  <Image
                    src={`/api/photo?path=${encodeURIComponent(m.photo_path!)}`}
                    alt={m.caption ?? "Memory"}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-md object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {(goals ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly goals</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {goals!.map((g) => (
                  <li key={g.id} className="flex items-center justify-between">
                    <span className="capitalize">{g.metric.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">target {g.target}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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

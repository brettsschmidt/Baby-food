import {
  ArrowLeft,
  Baby,
  CalendarDays,
  ChefHat,
  Package,
  PackageMinus,
  PackagePlus,
  UserPlus,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { ReactionRow } from "@/components/activity/reaction-row";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const iconFor = (kind: string) => {
  switch (kind) {
    case "feeding_logged":
    case "feeding_edited":
      return Utensils;
    case "feeding_deleted":
      return PackageMinus;
    case "inventory_added":
    case "inventory_adjusted":
      return PackagePlus;
    case "inventory_archived":
      return PackageMinus;
    case "prep_planned":
      return CalendarDays;
    case "prep_completed":
      return Package;
    case "recipe_added":
    case "recipe_edited":
      return ChefHat;
    case "baby_added":
      return Baby;
    case "member_joined":
      return UserPlus;
    default:
      return Utensils;
  }
};

const verbFor = (kind: string) => {
  switch (kind) {
    case "feeding_logged":
      return "logged a feeding";
    case "feeding_edited":
      return "edited a feeding";
    case "feeding_deleted":
      return "removed a feeding";
    case "inventory_added":
      return "added";
    case "inventory_adjusted":
      return "adjusted";
    case "inventory_archived":
      return "archived";
    case "prep_planned":
      return "scheduled a prep";
    case "prep_completed":
      return "finished a prep";
    case "recipe_added":
      return "saved a recipe";
    case "recipe_edited":
      return "edited a recipe";
    case "baby_added":
      return "added a baby";
    case "member_joined":
      return "joined the household";
    default:
      return kind;
  }
};

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind, q } = await searchParams;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type ActivityRow = {
    id: string;
    kind: string;
    summary: string | null;
    created_at: string;
    profiles: { display_name: string | null } | null;
  };

  let rowsQuery = supabase
    .from("activity_log")
    .select("id, kind, summary, created_at, profiles:actor_id(display_name)")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(100);

  type ActivityKind =
    | "feeding_logged"
    | "feeding_edited"
    | "feeding_deleted"
    | "inventory_added"
    | "inventory_adjusted"
    | "inventory_archived"
    | "prep_planned"
    | "prep_completed"
    | "recipe_added"
    | "recipe_edited"
    | "baby_added"
    | "member_joined";
  if (kind) rowsQuery = rowsQuery.eq("kind", kind as ActivityKind);
  if (q) rowsQuery = rowsQuery.ilike("summary", `%${q}%`);

  const { data: rows } = await rowsQuery.returns<ActivityRow[]>();

  const ids = (rows ?? []).map((r) => r.id);
  const { data: reactions } =
    ids.length > 0
      ? await supabase
          .from("activity_reactions")
          .select("activity_id, emoji, user_id")
          .in("activity_id", ids)
      : { data: [] };
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  const myUserId = user?.id ?? null;
  const reactionMap = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of reactions ?? []) {
    if (!reactionMap.has(r.activity_id)) reactionMap.set(r.activity_id, new Map());
    const m = reactionMap.get(r.activity_id)!;
    const cur = m.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.user_id === myUserId) cur.mine = true;
    m.set(r.emoji, cur);
  }

  const groups = new Map<string, ActivityRow[]>();
  rows?.forEach((r) => {
    const k = format(new Date(r.created_at), "yyyy-MM-dd");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  });

  return (
    <>
      <RealtimeRefresher tables={["activity_log"]} householdId={householdId} />
      <AppHeader
        title="Activity"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-6 px-4 py-4 pb-8">
        <form className="flex flex-wrap gap-2" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search summary…"
            className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
          />
          <select
            name="kind"
            defaultValue={kind ?? ""}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All kinds</option>
            <option value="feeding_logged">Feeding logged</option>
            <option value="feeding_edited">Feeding edited</option>
            <option value="feeding_deleted">Feeding deleted</option>
            <option value="inventory_added">Inventory added</option>
            <option value="inventory_adjusted">Inventory adjusted</option>
            <option value="prep_planned">Prep planned</option>
            <option value="prep_completed">Prep completed</option>
            <option value="recipe_added">Recipe added</option>
            <option value="member_joined">Member joined</option>
          </select>
          <Button type="submit" size="sm" variant="outline">
            Filter
          </Button>
        </form>
        {!rows || rows.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No activity yet. Once you start logging, both parents will see what changed here.
          </p>
        ) : (
          Array.from(groups.entries()).map(([dayKey, items]) => (
            <section key={dayKey} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dayLabel(new Date(dayKey))}
              </h2>
              <ol className="space-y-2">
                {items.map((r) => {
                  const Icon = iconFor(r.kind);
                  return (
                    <li
                      key={r.id}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <strong>{r.profiles?.display_name ?? "Someone"}</strong>{" "}
                          {verbFor(r.kind)}
                          {r.summary ? <> — <span className="text-muted-foreground">{r.summary}</span></> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relativeTime(r.created_at)}
                        </p>
                        <ReactionRow
                          activityId={r.id}
                          reactions={Array.from(
                            (reactionMap.get(r.id) ?? new Map<
                              string,
                              { count: number; mine: boolean }
                            >()).entries(),
                          ).map(([emoji, v]) => ({ emoji, ...v }))}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </div>
    </>
  );
}

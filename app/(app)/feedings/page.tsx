import Link from "next/link";
import { Plus, Smile, Frown, Meh, Heart, X, Sparkles } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { UndoBanner } from "@/components/feedings/undo-banner";
import { relativeTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const moodIcon = {
  loved: Heart,
  liked: Smile,
  neutral: Meh,
  disliked: Frown,
  refused: X,
} as const;

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export default async function FeedingsPage({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string }>;
}) {
  const { logged } = await searchParams;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type TimelineFeeding = {
    id: string;
    fed_at: string;
    mood: string | null;
    notes: string | null;
    feeding_items: {
      quantity: number | null;
      notes: string | null;
      is_first_try: boolean;
      inventory_items: { name: string | null } | null;
      foods: { name: string | null } | null;
    }[];
  };

  const { data: feedings } = await supabase
    .from("feedings")
    .select(
      "id, fed_at, mood, notes, feeding_items(quantity, notes, is_first_try, inventory_items(name), foods(name))",
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("fed_at", { ascending: false })
    .limit(100)
    .returns<TimelineFeeding[]>();

  const groups = new Map<string, TimelineFeeding[]>();
  feedings?.forEach((f) => {
    const key = format(new Date(f.fed_at), "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  });

  return (
    <>
      <RealtimeRefresher tables={["feedings", "feeding_items"]} householdId={householdId} />
      <AppHeader
        title="Feedings"
        action={
          <>
            <Button asChild size="sm" variant="ghost">
              <Link href="/feedings/calendar" aria-label="Calendar view">
                Cal
              </Link>
            </Button>
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
        {logged && <UndoBanner feedingId={logged} />}
        {feedings && feedings.length > 0 ? (
          Array.from(groups.entries()).map(([dayKey, items]) => (
            <section key={dayKey} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dayLabel(new Date(dayKey))}
              </h2>
              <ol className="space-y-2">
                {items.map((f) => {
                  const Icon = f.mood ? moodIcon[f.mood as keyof typeof moodIcon] : null;
                  const firstNames = f.feeding_items
                    .map((i) => i.inventory_items?.name ?? i.foods?.name ?? i.notes)
                    .filter(Boolean);
                  const summary = firstNames.length
                    ? firstNames.slice(0, 2).join(" + ") +
                      (firstNames.length > 2 ? ` (+${firstNames.length - 2})` : "")
                    : (f.notes ?? "Feeding");
                  const hasFirstTry = f.feeding_items.some((i) => i.is_first_try);
                  return (
                    <li key={f.id}>
                      <Link
                        href={`/feedings/${f.id}`}
                        className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          {Icon ? <Icon className="h-4 w-4" /> : <span>🍼</span>}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(f.fed_at), "h:mm a")} · {relativeTime(f.fed_at)}
                          </p>
                          {f.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{f.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {hasFirstTry && (
                            <Badge variant="warning" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              First
                            </Badge>
                          )}
                          {f.mood && (
                            <Badge variant="secondary" className="capitalize">
                              {f.mood}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border p-10 text-center">
      <Smile className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">No feedings logged yet</p>
        <p className="text-sm text-muted-foreground">Log a meal to start building your timeline.</p>
      </div>
      <Button asChild>
        <Link href="/feedings/new">
          <Plus className="h-4 w-4" /> Log feeding
        </Link>
      </Button>
    </div>
  );
}

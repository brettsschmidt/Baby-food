import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Circle, Sparkles, Trash2 } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoField } from "@/components/photo/photo-field";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import {
  clearChecklistMilestone,
  saveChecklistMilestone,
} from "@/lib/actions/milestones";
import {
  MILESTONE_CHECKLIST,
  isChecklistKind,
  type MilestoneCatalogItem,
} from "@/lib/milestones-catalog";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

interface AchievedRow {
  kind: string;
  achieved_at: string;
  detail: string | null;
  photo_path: string | null;
}

export default async function MilestonesPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Milestones" />
        <div className="flex-1 px-4 py-4 pb-8">
          <EmptyState
            icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
            title="Add a baby first"
            description="Milestones are tracked per baby. Add one in onboarding or settings to get started."
            action={
              <Button asChild>
                <Link href="/settings">Go to settings</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const { data: rows } = await supabase
    .from("milestones")
    .select("kind, achieved_at, detail, photo_path")
    .eq("household_id", householdId)
    .eq("baby_id", baby.id);

  const achieved = new Map<string, AchievedRow>();
  for (const r of (rows ?? []) as AchievedRow[]) {
    if (isChecklistKind(r.kind)) achieved.set(r.kind, r);
  }

  const totalItems = MILESTONE_CHECKLIST.reduce((n, m) => n + m.items.length, 0);
  const totalAchieved = MILESTONE_CHECKLIST.reduce(
    (n, m) => n + m.items.filter((i) => achieved.has(i.kind)).length,
    0,
  );

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <>
      <RealtimeRefresher tables={["milestones"]} householdId={householdId} />
      <AppHeader title="Milestones" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {baby.name}&rsquo;s first year
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {totalAchieved} of {totalItems} milestones reached
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${totalItems === 0 ? 0 : Math.round((totalAchieved / totalItems) * 100)}%`,
                }}
                aria-hidden="true"
              />
            </div>
          </CardContent>
        </Card>

        {MILESTONE_CHECKLIST.map((month) => {
          const monthAchieved = month.items.filter((i) => achieved.has(i.kind)).length;
          return (
            <section key={month.month} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {month.title}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {monthAchieved} / {month.items.length}
                </span>
              </div>
              <ul className="space-y-2">
                {month.items.map((item) => (
                  <li key={item.kind}>
                    <MilestoneRow
                      item={item}
                      row={achieved.get(item.kind)}
                      defaultDate={today}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

function MilestoneRow({
  item,
  row,
  defaultDate,
}: {
  item: MilestoneCatalogItem;
  row: AchievedRow | undefined;
  defaultDate: string;
}) {
  const isAchieved = !!row;
  const achievedDate = row ? format(new Date(row.achieved_at), "yyyy-MM-dd") : defaultDate;
  const niceDate = row ? format(new Date(row.achieved_at), "MMM d, yyyy") : null;

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        {isAchieved ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isAchieved ? "" : "text-foreground"}`}>
            {item.label}
          </p>
          {isAchieved && (
            <p className="truncate text-xs text-muted-foreground">
              {niceDate}
              {row?.detail ? ` · ${row.detail}` : ""}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground group-open:hidden">
          {isAchieved ? "Edit" : "Mark"}
        </span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">Close</span>
      </summary>

      <div className="border-t bg-muted/30 p-3">
        <form action={saveChecklistMilestone} className="space-y-3">
          <input type="hidden" name="kind" value={item.kind} />
          <div className="space-y-1">
            <Label htmlFor={`${item.kind}-date`}>Date reached</Label>
            <Input
              id={`${item.kind}-date`}
              name="achieved_at"
              type="date"
              defaultValue={achievedDate}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${item.kind}-note`}>Note</Label>
            <Textarea
              id={`${item.kind}-note`}
              name="detail"
              rows={2}
              placeholder="What was it like?"
              defaultValue={row?.detail ?? ""}
            />
          </div>
          <PhotoField name="photo_path" label="Photo" defaultPath={row?.photo_path ?? null} />
          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {isAchieved ? "Save changes" : "Mark as reached"}
            </Button>
          </div>
        </form>
        {isAchieved && (
          <form action={clearChecklistMilestone} className="mt-2">
            <input type="hidden" name="kind" value={item.kind} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Unmark
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}

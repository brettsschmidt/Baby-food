import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { format, subDays } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { restoreFeedingAction } from "@/lib/actions/inventory-rename";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function ArchivedFeedingsPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const cutoff = subDays(new Date(), 30).toISOString();
  const { data: rows } = await supabase
    .from("feedings")
    .select("id, fed_at, mood, notes, archived_at")
    .eq("household_id", householdId)
    .not("archived_at", "is", null)
    .gte("archived_at", cutoff)
    .order("archived_at", { ascending: false })
    .limit(100);

  return (
    <>
      <AppHeader
        title="Archived feedings"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/feedings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-2 px-4 py-4 pb-8">
        <p className="text-xs text-muted-foreground">
          Archived feedings can be restored within 30 days.
        </p>
        {(rows ?? []).length === 0 ? (
          <p className="rounded-md border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing here.
          </p>
        ) : (
          rows!.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {r.notes ?? "Feeding"}
                  {r.mood && (
                    <span className="ml-1 text-xs text-muted-foreground">· {r.mood}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.fed_at), "PPP p")}
                </p>
              </div>
              <form action={restoreFeedingAction}>
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" size="sm" variant="outline">
                  <RotateCcw className="h-3 w-3" /> Restore
                </Button>
              </form>
            </div>
          ))
        )}
      </div>
    </>
  );
}

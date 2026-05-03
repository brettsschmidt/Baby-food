import Image from "next/image";
import { Heart } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoField } from "@/components/photo/photo-field";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { addMemory, deleteMemory } from "@/lib/actions/memories";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function MemoriesPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: memories } = await supabase
    .from("memories")
    .select("id, caption, occurred_on, photo_path, milestone_kind")
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false })
    .limit(120);

  // Group by month
  const groups = new Map<string, typeof memories>();
  memories?.forEach((m) => {
    const key = format(new Date(m.occurred_on), "yyyy-MM");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });

  return (
    <>
      <RealtimeRefresher tables={["memories"]} householdId={householdId} />
      <AppHeader title="Memories" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" /> Save a moment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addMemory} className="space-y-3">
              <PhotoField name="photo_path" label="Photo" />
              <div className="space-y-1">
                <Label htmlFor="caption">Caption</Label>
                <Textarea id="caption" name="caption" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="occurred_on">Date</Label>
                  <Input
                    id="occurred_on"
                    name="occurred_on"
                    type="date"
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="milestone_kind">Milestone (optional)</Label>
                  <Input id="milestone_kind" name="milestone_kind" placeholder="First taste" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save memory
              </Button>
            </form>
          </CardContent>
        </Card>

        {Array.from(groups.entries()).map(([monthKey, items]) => (
          <section key={monthKey} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {format(new Date(monthKey + "-01"), "MMMM yyyy")}
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {items?.map((m) => (
                <li key={m.id} className="rounded-lg border bg-card p-2">
                  {m.photo_path ? (
                    <Image
                      src={`/api/photo?path=${encodeURIComponent(m.photo_path)}`}
                      alt={m.caption ?? "Memory"}
                      width={300}
                      height={300}
                      unoptimized
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-3xl">
                      💭
                    </div>
                  )}
                  <p className="mt-1 truncate text-xs font-medium">
                    {m.caption ?? m.milestone_kind ?? "Memory"}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(m.occurred_on), "MMM d")}
                    </p>
                    <form action={deleteMemory}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                        aria-label="Delete memory"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

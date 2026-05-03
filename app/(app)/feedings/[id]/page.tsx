import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteFeeding, updateFeeding } from "@/lib/actions/feedings";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function FeedingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type FeedingDetail = {
    id: string;
    fed_at: string;
    mood: string | null;
    method: string | null;
    notes: string | null;
    photo_path: string | null;
    feeding_items: {
      id: string;
      quantity: number | null;
      notes: string | null;
      is_first_try: boolean;
      inventory_items: { name: string | null } | null;
    }[];
  };

  const { data: feeding } = await supabase
    .from("feedings")
    .select(
      "id, fed_at, mood, method, notes, photo_path, feeding_items(id, quantity, notes, is_first_try, inventory_items(name))",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .maybeSingle()
    .returns<FeedingDetail>();

  if (!feeding) notFound();

  const localDateTime = (() => {
    const d = new Date(feeding.fed_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();

  return (
    <>
      <AppHeader
        title="Feeding"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/feedings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Foods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feeding.feeding_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items recorded.</p>
            ) : (
              feeding.feeding_items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <span>
                    {it.inventory_items?.name ?? it.notes ?? "Item"}
                    {it.quantity ? ` · ${it.quantity}` : ""}
                  </span>
                  {it.is_first_try && <Badge variant="warning">First try</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {feeding.photo_path && (
          <Card>
            <CardContent className="p-2">
              <Image
                src={`/api/photo?path=${encodeURIComponent(feeding.photo_path)}`}
                alt="Feeding photo"
                width={400}
                height={400}
                unoptimized
                className="w-full rounded-md object-cover"
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Edit</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateFeeding} className="space-y-4">
              <input type="hidden" name="id" value={feeding.id} />
              <div className="space-y-2">
                <Label htmlFor="fed_at">When</Label>
                <Input
                  id="fed_at"
                  name="fed_at"
                  type="datetime-local"
                  defaultValue={localDateTime}
                />
              </div>
              <div className="space-y-2">
                <Label>Reaction</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(["loved", "liked", "neutral", "disliked", "refused"] as const).map((m) => (
                    <label
                      key={m}
                      className="flex cursor-pointer flex-col items-center gap-1 rounded-md border bg-background p-2 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                    >
                      <input
                        type="radio"
                        name="mood"
                        value={m}
                        defaultChecked={feeding.mood === m}
                        className="sr-only"
                      />
                      <span className="text-lg">
                        {m === "loved" ? "😍" : m === "liked" ? "🙂" : m === "neutral" ? "😐" : m === "disliked" ? "😕" : "🙅"}
                      </span>
                      <span className="capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={feeding.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <form action={deleteFeeding}>
          <input type="hidden" name="id" value={feeding.id} />
          <Button type="submit" variant="outline" className="w-full text-destructive">
            <Trash2 className="h-4 w-4" /> Delete this feeding
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Logged {format(new Date(feeding.fed_at), "PPP 'at' p")}
        </p>
      </div>
    </>
  );
}

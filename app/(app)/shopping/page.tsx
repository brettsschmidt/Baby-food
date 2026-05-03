import { ShoppingCart, Trash } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import {
  addShoppingItem,
  clearCompletedShopping,
  toggleShoppingItem,
} from "@/lib/actions/shopping";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("id, text, quantity, completed_at, source_recipe_id")
    .eq("household_id", householdId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  const todo = items?.filter((i) => !i.completed_at) ?? [];
  const done = items?.filter((i) => i.completed_at) ?? [];

  return (
    <>
      <RealtimeRefresher tables={["shopping_list_items"]} householdId={householdId} />
      <AppHeader title="Shopping" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <form action={addShoppingItem} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="text" className="sr-only">
              Item
            </Label>
            <Input id="text" name="text" placeholder="Add item…" required autoComplete="off" />
          </div>
          <div className="w-24">
            <Label htmlFor="quantity" className="sr-only">
              Quantity
            </Label>
            <Input id="quantity" name="quantity" placeholder="qty" autoComplete="off" />
          </div>
          <Button type="submit">Add</Button>
        </form>

        {todo.length === 0 && done.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-10 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Empty list. Items added from a recipe also land here.
            </p>
          </div>
        )}

        {todo.length > 0 && (
          <ul className="space-y-1">
            {todo.map((i) => (
              <li key={i.id}>
                <form action={toggleShoppingItem}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="completed" value="true" />
                  <button className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/40">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border" />
                    <span className="flex-1 text-sm">
                      {i.text} {i.quantity && <span className="text-muted-foreground">· {i.quantity}</span>}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {done.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Got it
            </h2>
            <ul className="space-y-1">
              {done.map((i) => (
                <li key={i.id}>
                  <form action={toggleShoppingItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="completed" value="false" />
                    <button className="flex w-full items-center gap-3 rounded-md border bg-card/50 px-3 py-2 text-left text-muted-foreground line-through transition-colors hover:bg-accent/40">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border bg-primary text-[10px] text-primary-foreground">
                        ✓
                      </span>
                      <span className="flex-1 text-sm">
                        {i.text} {i.quantity && <span>· {i.quantity}</span>}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={clearCompletedShopping}>
              <Button type="submit" variant="ghost" size="sm" className="w-full text-destructive">
                <Trash className="h-4 w-4" /> Clear completed
              </Button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

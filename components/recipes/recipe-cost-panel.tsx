"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addRecipeCost, deleteRecipeCost } from "@/lib/actions/recipe-costs";

interface Cost {
  id: string;
  ingredient: string;
  cost_cents: number;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function RecipeCostPanel({
  recipeId,
  costs,
  yieldQuantity,
  yieldUnit,
}: {
  recipeId: string;
  costs: Cost[];
  yieldQuantity: number | null;
  yieldUnit: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const total = costs.reduce((s, c) => s + c.cost_cents, 0);
  const perUnit =
    yieldQuantity && yieldQuantity > 0 ? Math.round(total / yieldQuantity) : null;

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("recipe_id", recipeId);
    if (
      !String(fd.get("ingredient") ?? "").trim() ||
      Number(fd.get("cost_dollars") ?? 0) <= 0
    )
      return;
    startTransition(async () => {
      await addRecipeCost(fd);
      e.currentTarget.reset();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold">{fmt(total)}</p>
        {perUnit != null && (
          <p className="text-xs text-muted-foreground">
            ≈ {fmt(perUnit)} per {yieldUnit ?? "serving"}
          </p>
        )}
      </div>

      {costs.length > 0 && (
        <ul className="space-y-1 text-sm">
          {costs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border bg-card/50 px-2 py-1"
            >
              <span className="truncate">{c.ingredient}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{fmt(c.cost_cents)}</span>
                <form action={deleteRecipeCost}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="recipe_id" value={recipeId} />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete cost"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="grid grid-cols-[1fr_auto_auto] items-end gap-2" onSubmit={onAdd}>
        <div className="space-y-1">
          <Label htmlFor="cost-ingredient" className="text-xs">
            Ingredient
          </Label>
          <Input id="cost-ingredient" name="ingredient" placeholder="Sweet potato" />
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor="cost-dollars" className="text-xs">
            $
          </Label>
          <Input
            id="cost-dollars"
            name="cost_dollars"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          Add
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Repeat, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { quickLogFood, repeatLastFeeding } from "@/lib/actions/feedings";

interface FavFood {
  inventoryItemId?: string | null;
  name: string;
  count: number;
}

export function QuickLog({
  favourites,
  hasLastFeeding,
}: {
  favourites: FavFood[];
  hasLastFeeding: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!hasLastFeeding && favourites.length === 0) return null;

  const onRepeat = () => {
    startTransition(async () => {
      await repeatLastFeeding();
      toast.success("Logged a repeat of your last feeding");
    });
  };

  const onQuickLog = (fav: FavFood) => {
    startTransition(async () => {
      const fd = new FormData();
      if (fav.inventoryItemId) fd.set("inventory_item_id", fav.inventoryItemId);
      else fd.set("custom_food", fav.name);
      await quickLogFood(fd);
      toast.success(`Logged ${fav.name}`);
    });
  };

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Zap className="h-3 w-3" /> Quick log
      </h2>
      <div className="flex flex-wrap gap-2">
        {hasLastFeeding && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onRepeat}
          >
            <Repeat className="h-3 w-3" />
            Same as last
          </Button>
        )}
        {favourites.map((fav) => (
          <Button
            key={fav.name + fav.inventoryItemId}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onQuickLog(fav)}
            className="gap-1"
          >
            {fav.name}
            <span className="text-[10px] text-muted-foreground">×{fav.count}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";

import { rateFeeding } from "@/lib/actions/feeding-ratings";
import { rateRecipe } from "@/lib/actions/recipe-extras";
import { cn } from "@/lib/utils";

interface Props {
  entityId: string;
  kind: "feeding" | "recipe";
  current?: number | null;
  averageStars?: number | null;
  size?: "sm" | "md";
}

export function StarRating({ entityId, kind, current, averageStars, size = "md" }: Props) {
  const [pending, startTransition] = useTransition();

  const onClick = (stars: number) => {
    const fd = new FormData();
    fd.set(kind === "feeding" ? "feeding_id" : "recipe_id", entityId);
    fd.set("stars", String(stars));
    startTransition(async () => {
      if (kind === "feeding") await rateFeeding(fd);
      else await rateRecipe(fd);
    });
  };

  const px = size === "sm" ? "h-3 w-3" : "h-5 w-5";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => onClick(s)}
          aria-label={`Rate ${s} star${s === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              px,
              (current ?? 0) >= s
                ? "fill-amber-400 stroke-amber-500"
                : "fill-transparent stroke-muted-foreground",
            )}
          />
        </button>
      ))}
      {averageStars != null && averageStars > 0 && (
        <span className="ml-1 text-xs text-muted-foreground">avg {averageStars.toFixed(1)}</span>
      )}
    </div>
  );
}

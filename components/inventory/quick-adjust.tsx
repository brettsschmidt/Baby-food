"use client";

import { useTransition } from "react";
import { Minus, Plus } from "lucide-react";

import { adjustInventoryItem } from "@/lib/actions/inventory";

export function QuickAdjust({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  const onAdjust = (delta: number, reason: "feeding" | "restock") => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("delta", String(delta));
    fd.set("reason", reason);
    startTransition(async () => {
      await adjustInventoryItem(fd);
    });
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        onClick={() => onAdjust(-1, "feeding")}
        disabled={pending}
        className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-accent/40 disabled:opacity-50"
        aria-label="Decrement"
      >
        <Minus className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onAdjust(1, "restock")}
        disabled={pending}
        className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-accent/40 disabled:opacity-50"
        aria-label="Increment"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

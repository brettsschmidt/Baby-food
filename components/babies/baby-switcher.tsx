"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { setActiveBaby } from "@/lib/actions/babies";
import { cn } from "@/lib/utils";

interface Baby {
  id: string;
  name: string;
}

export function BabySwitcher({
  babies,
  activeId,
}: {
  babies: Baby[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();
  if (babies.length <= 1) return null;
  const active = babies.find((b) => b.id === activeId) ?? babies[0];

  return (
    <form
      className="relative"
      onChange={(e) => {
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void setActiveBaby(fd);
        });
      }}
    >
      <select
        name="baby_id"
        defaultValue={active.id}
        className={cn(
          "h-8 appearance-none rounded-md border bg-background pl-3 pr-7 text-sm font-medium",
          pending && "opacity-50",
        )}
        aria-label="Active baby"
      >
        {babies.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { setActiveHousehold } from "@/lib/actions/active-household";
import { cn } from "@/lib/utils";

interface Household {
  id: string;
  name: string;
  emoji: string | null;
}

export function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: Household[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();
  if (households.length <= 1) return null;

  return (
    <form
      className="relative"
      onChange={(e) => {
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void setActiveHousehold(fd);
        });
      }}
    >
      <select
        name="household_id"
        defaultValue={activeId}
        aria-label="Active household"
        className={cn(
          "h-8 appearance-none rounded-md border bg-background pl-3 pr-7 text-sm font-medium",
          pending && "opacity-50",
        )}
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.emoji ? `${h.emoji} ` : ""}
            {h.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </form>
  );
}

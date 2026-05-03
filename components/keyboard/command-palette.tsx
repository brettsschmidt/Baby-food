"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Action {
  label: string;
  href?: string;
  shortcut?: string;
}

const ACTIONS: Action[] = [
  { label: "Go to dashboard", href: "/dashboard", shortcut: "g d" },
  { label: "Inventory", href: "/inventory", shortcut: "g i" },
  { label: "Feedings", href: "/feedings", shortcut: "g f" },
  { label: "Log a feeding", href: "/feedings/new" },
  { label: "Feeding calendar", href: "/feedings/calendar" },
  { label: "Planner", href: "/planner", shortcut: "g p" },
  { label: "Today's meals", href: "/meals", shortcut: "g m" },
  { label: "Care (sleep & diapers)", href: "/care", shortcut: "g c" },
  { label: "Growth", href: "/growth", shortcut: "g g" },
  { label: "Recipes", href: "/recipes", shortcut: "g r" },
  { label: "Recipe collections", href: "/recipes/collections" },
  { label: "Shopping list", href: "/shopping", shortcut: "g s" },
  { label: "Insights", href: "/insights", shortcut: "g n" },
  { label: "Memories", href: "/memories", shortcut: "g o" },
  { label: "Kitchen timer", href: "/timer", shortcut: "g t" },
  { label: "Search", href: "/search", shortcut: "/" },
  { label: "Settings", href: "/settings" },
  { label: "Activity feed", href: "/activity" },
  { label: "Library", href: "/library" },
  { label: "Pediatrician report", href: "/print/report?days=30" },
];

export function CommandPalette() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 8);

  const onSelect = (a: Action) => {
    setOpen(false);
    setQuery("");
    if (a.href) startTransition(() => router.push(a.href!));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="border-b p-3">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) onSelect(filtered[0]);
            }}
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
          )}
          {filtered.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50"
              >
                <span>{a.label}</span>
                {a.shortcut && (
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">
                    {a.shortcut}
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: "g d", label: "Dashboard" },
  { keys: "g i", label: "Inventory" },
  { keys: "g f", label: "Feedings" },
  { keys: "g p", label: "Planner" },
  { keys: "g m", label: "Today's meals" },
  { keys: "g c", label: "Care (sleep + diapers)" },
  { keys: "g g", label: "Growth" },
  { keys: "g r", label: "Recipes" },
  { keys: "g s", label: "Shopping list" },
  { keys: "g n", label: "Insights" },
  { keys: "g o", label: "Memories" },
  { keys: "g t", label: "Kitchen timer" },
  { keys: "/", label: "Search" },
  { keys: "⌘ K", label: "Command palette" },
  { keys: "?", label: "Show this cheatsheet" },
];

export function ShortcutsCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between border-b pb-1 last:border-0">
              <span>{s.label}</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

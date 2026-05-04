"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addStickyNote,
  deleteStickyNote,
  togglePinStickyNote,
} from "@/lib/actions/sticky-notes";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  body: string;
  color: string | null;
  pinned: boolean;
}

const COLOR_CLASS: Record<string, string> = {
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  rose: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
  sky: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  emerald: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
};

export function StickyNotes({ notes }: { notes: Note[] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("body") ?? "").trim()) return;
    startTransition(async () => {
      await addStickyNote(fd);
      e.currentTarget.reset();
      setShowForm(false);
    });
  };

  const visible = notes.slice(0, 4);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add
        </Button>
      </div>
      {showForm && (
        <form className="space-y-2" onSubmit={onAdd}>
          <textarea
            name="body"
            rows={2}
            required
            placeholder="Reminder or note for your partner…"
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <select
              name="color"
              defaultValue="amber"
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Color"
            >
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
              <option value="sky">Sky</option>
              <option value="emerald">Emerald</option>
              <option value="violet">Violet</option>
            </select>
            <Button type="submit" size="sm" disabled={pending}>
              Save note
            </Button>
          </div>
        </form>
      )}
      {visible.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((n) => (
            <li
              key={n.id}
              className={cn(
                "relative rounded-md p-3 text-sm shadow-sm",
                COLOR_CLASS[n.color ?? "amber"] ?? COLOR_CLASS.amber,
              )}
            >
              <p className="whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <form action={togglePinStickyNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="pinned" value={String(n.pinned)} />
                  <button
                    type="submit"
                    className="text-xs opacity-70 hover:opacity-100"
                    aria-label={n.pinned ? "Unpin note" : "Pin note"}
                  >
                    {n.pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                  </button>
                </form>
                <form action={deleteStickyNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-xs opacity-70 hover:opacity-100"
                    aria-label="Delete note"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

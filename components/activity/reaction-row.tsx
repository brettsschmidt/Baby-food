"use client";

import { useTransition } from "react";

import { toggleReaction } from "@/lib/actions/reactions";

const EMOJIS = ["❤️", "👍", "🎉", "🥕"];

interface Props {
  activityId: string;
  reactions: { emoji: string; count: number; mine: boolean }[];
}

export function ReactionRow({ activityId, reactions }: Props) {
  const [pending, startTransition] = useTransition();

  const onClick = (emoji: string) => {
    const fd = new FormData();
    fd.set("activity_id", activityId);
    fd.set("emoji", emoji);
    startTransition(async () => {
      await toggleReaction(fd);
    });
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions
        .filter((r) => r.count > 0)
        .map((r) => (
          <button
            key={r.emoji}
            type="button"
            disabled={pending}
            onClick={() => onClick(r.emoji)}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              r.mine ? "bg-primary/15 border-primary text-primary" : ""
            }`}
            aria-label={`Toggle ${r.emoji}`}
          >
            {r.emoji} {r.count}
          </button>
        ))}
      {EMOJIS.filter((e) => !reactions.some((r) => r.emoji === e && r.count > 0)).map((e) => (
        <button
          key={e}
          type="button"
          disabled={pending}
          onClick={() => onClick(e)}
          className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/40"
          aria-label={`Add ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

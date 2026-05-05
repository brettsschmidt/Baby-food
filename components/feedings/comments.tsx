"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addFeedingComment,
  deleteFeedingComment,
} from "@/lib/actions/feeding-comments";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author?: { display_name: string | null } | null;
}

export function Comments({
  feedingId,
  comments,
}: {
  feedingId: string;
  comments: Comment[];
}) {
  const [pending, startTransition] = useTransition();

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("feeding_id", feedingId);
    if (!String(fd.get("body") ?? "").trim()) return;
    startTransition(async () => {
      await addFeedingComment(fd);
      e.currentTarget.reset();
    });
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {comments.length === 0 && (
          <li className="text-sm text-muted-foreground">No comments yet.</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="rounded-md border bg-card/50 p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium">
                  {c.author?.display_name ?? "Member"}{" "}
                  <span className="text-muted-foreground">
                    · {format(new Date(c.created_at), "MMM d, h:mm a")}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
              <form action={deleteFeedingComment}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="feeding_id" value={feedingId} />
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete comment"
                >
                  <X className="h-3 w-3" />
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <form className="space-y-2" onSubmit={onAdd}>
        <Textarea
          name="body"
          rows={2}
          placeholder="Add a note for the household…"
          maxLength={1000}
          required
        />
        <Button type="submit" size="sm" disabled={pending}>
          Post comment
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { addTag, removeTag } from "@/lib/actions/tags";

interface TagRow {
  id: string;
  label: string;
}

interface Props {
  entityType: "food" | "recipe" | "memory" | "feeding" | "inventory_item";
  entityId: string;
  tags: TagRow[];
}

export function TagList({ entityType, entityId, tags }: Props) {
  const [pending, startTransition] = useTransition();

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("label") ?? "").trim()) return;
    fd.set("entity_type", entityType);
    fd.set("entity_id", entityId);
    startTransition(async () => {
      try {
        await addTag(fd);
        e.currentTarget.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  const onRemove = (id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await removeTag(fd);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 && (
          <span className="text-xs text-muted-foreground">No tags yet.</span>
        )}
        {tags.map((t) => (
          <Badge key={t.id} variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" aria-hidden="true" /> {t.label}
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              className="ml-1 text-muted-foreground hover:text-destructive"
              aria-label={`Remove tag ${t.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={onAdd}>
        <input
          type="text"
          name="label"
          placeholder="Add tag…"
          maxLength={32}
          disabled={pending}
          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
        />
      </form>
    </div>
  );
}

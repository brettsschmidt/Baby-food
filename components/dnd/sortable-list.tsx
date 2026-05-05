"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

interface Item {
  id: string;
  label: React.ReactNode;
}

export function SortableList({
  items,
  onReorder,
}: {
  items: Item[];
  onReorder: (orderedIds: string[]) => void;
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);

  const onDrop = (overId: string) => {
    if (!dragId || dragId === overId) return;
    const next = order.filter((id) => id !== dragId);
    const idx = next.indexOf(overId);
    next.splice(idx, 0, dragId);
    setOrder(next);
    onReorder(next);
    setDragId(null);
  };

  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <ul className="space-y-1">
      {order.map((id) => {
        const it = byId.get(id);
        if (!it) return null;
        return (
          <li
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(id)}
            className="flex cursor-grab items-center gap-2 rounded-md border bg-card p-2 text-sm active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex-1">{it.label}</div>
          </li>
        );
      })}
    </ul>
  );
}

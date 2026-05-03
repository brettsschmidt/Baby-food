"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InventoryOption {
  id: string;
  name: string | null;
  unit: string;
  quantity: number;
}

interface ItemRow {
  id: string;
  inventoryItemId: string;
  customFood: string;
  quantity: string;
  isFirstTry: boolean;
}

const empty = (): ItemRow => ({
  id: crypto.randomUUID(),
  inventoryItemId: "",
  customFood: "",
  quantity: "1",
  isFirstTry: false,
});

export function FeedingItemsField({ inventory }: { inventory: InventoryOption[] }) {
  const [rows, setRows] = useState<ItemRow[]>([empty()]);

  const update = (id: string, patch: Partial<ItemRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) =>
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.id !== id)));
  const add = () => setRows((rs) => [...rs, empty()]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>What did baby eat?</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-4 w-4" />
          Add food
        </Button>
      </div>
      {rows.map((row, idx) => (
        <div key={row.id} className="space-y-2 rounded-md border bg-card/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <select
                name={`items[${idx}][inventory_item_id]`}
                value={row.inventoryItemId}
                onChange={(e) => update(row.id, { inventoryItemId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— from inventory —</option>
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name ?? "Item"} ({i.quantity} {i.unit} left)
                  </option>
                ))}
              </select>
              <Input
                name={`items[${idx}][custom_food]`}
                value={row.customFood}
                onChange={(e) => update(row.id, { customFood: e.target.value })}
                placeholder="…or write it in (e.g. bite of banana)"
                className="h-10 text-sm"
              />
              <div className="flex items-center gap-3">
                <Input
                  name={`items[${idx}][quantity]`}
                  value={row.quantity}
                  onChange={(e) => update(row.id, { quantity: e.target.value })}
                  type="number"
                  min="0"
                  step="0.5"
                  className="h-10 w-24 text-sm"
                  disabled={!row.inventoryItemId}
                />
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    name={`items[${idx}][is_first_try]`}
                    checked={row.isFirstTry}
                    onChange={(e) => update(row.id, { isFirstTry: e.target.checked })}
                  />
                  First time trying
                </label>
              </div>
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

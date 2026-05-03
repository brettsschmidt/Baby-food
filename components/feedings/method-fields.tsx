"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MethodFields({ defaultMethod = "spoon" as string }) {
  const [method, setMethod] = useState(defaultMethod);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="method">Method</Label>
        <select
          id="method"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="spoon">Spoon-fed</option>
          <option value="self_feed">Self-fed</option>
          <option value="bottle">Bottle</option>
          <option value="breast">Breast</option>
        </select>
      </div>

      {method === "bottle" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="bottle_ml" className="text-xs">
              Volume (ml)
            </Label>
            <Input
              id="bottle_ml"
              name="bottle_ml"
              type="number"
              min="0"
              step="5"
              placeholder="120"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="duration_minutes" className="text-xs">
              Duration (min)
            </Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min="0"
              placeholder="20"
            />
          </div>
        </div>
      )}

      {method === "breast" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Side</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["left", "right", "both"] as const).map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center justify-center rounded-md border bg-background py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input type="radio" name="breast_side" value={s} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="duration_minutes_breast" className="text-xs">
              Duration (min)
            </Label>
            <Input
              id="duration_minutes_breast"
              name="duration_minutes"
              type="number"
              min="0"
              placeholder="15"
            />
          </div>
        </div>
      )}
    </div>
  );
}

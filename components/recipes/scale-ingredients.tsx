"use client";

import { useState } from "react";

import { convertToImperial, convertToMetric } from "@/lib/units";

interface Ingredient {
  id: string;
  ingredient: string;
  quantity: string | null;
}

/** Scale leading numeric or "X/Y" prefixes in an ingredient quantity by a factor. */
function scaleQuantity(input: string | null, factor: number): string | null {
  if (!input || factor === 1) return input;
  // Match a leading number / fraction / mixed number.
  const m = input.match(/^\s*([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*(.*)$/);
  if (!m) return input;
  const [, raw, rest] = m;
  let value: number;
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map((s) => Number(s.trim().replace(",", ".")));
    value = a / b;
  } else {
    value = Number(raw.replace(",", "."));
  }
  if (!Number.isFinite(value)) return input;
  const scaled = value * factor;
  const pretty =
    scaled >= 10 ? scaled.toFixed(0) : scaled >= 1 ? scaled.toFixed(2).replace(/\.?0+$/, "") : scaled.toFixed(2).replace(/\.?0+$/, "");
  return `${pretty}${rest ? " " + rest : ""}`;
}

export function ScaleIngredients({
  ingredients,
  yieldQuantity,
  yieldUnit,
  units = "metric",
}: {
  ingredients: Ingredient[];
  yieldQuantity: number | null;
  yieldUnit: string | null;
  units?: "metric" | "imperial";
}) {
  const [factor, setFactor] = useState(1);
  const scaledYield = yieldQuantity != null ? Math.round(yieldQuantity * factor) : null;

  return (
    <div className="space-y-3">
      <input type="hidden" name="scale_factor" value={factor.toString()} form="plan-recipe" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Scale
        </span>
        <span className="text-sm">
          {factor.toFixed(2)}× {scaledYield && yieldUnit && <>· {scaledYield} {yieldUnit}</>}
        </span>
      </div>
      <input
        type="range"
        min="0.25"
        max="3"
        step="0.25"
        value={factor}
        onChange={(e) => setFactor(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
      <ul className="list-inside list-disc space-y-1 text-sm">
        {ingredients.length === 0 ? (
          <li className="list-none text-muted-foreground">No ingredients listed.</li>
        ) : (
          ingredients.map((i) => {
            const scaled = i.quantity ? scaleQuantity(i.quantity, factor) : null;
            const conv = scaled
              ? units === "metric"
                ? convertToMetric(`${scaled} ${i.ingredient}`)
                : convertToImperial(`${scaled} ${i.ingredient}`)
              : null;
            return (
              <li key={i.id}>
                {scaled ? <strong>{scaled}</strong> : null} {i.ingredient}
                {conv && <span className="ml-1 text-xs text-muted-foreground">≈ {conv}</span>}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

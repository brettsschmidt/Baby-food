/**
 * Pure cooking unit conversions. Approximate; ideal for baby-food prep
 * (not lab-grade). Volume → ml, weight → g.
 */

const TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  tsp: 4.929,
  teaspoon: 4.929,
  tbsp: 14.787,
  tablespoon: 14.787,
  cup: 236.588,
  cups: 236.588,
  oz: 29.574,
  "fl oz": 29.574,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
};

const TO_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,
};

function pretty(n: number): string {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Returns a "metric conversion" hint for an ingredient line, or null if no
 * convertible quantity is found. Best-effort; only handles the common cases.
 */
export function convertToMetric(line: string): string | null {
  const m = line.match(
    /(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|fl\s*oz|oz|pints?|quarts?|lb|pounds?|ounces?)/i,
  );
  if (!m) return null;
  const [, raw, unitRaw] = m;
  let value = NaN;
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map((s) => Number(s.trim().replace(",", ".")));
    value = a / b;
  } else {
    value = Number(raw.replace(",", "."));
  }
  if (!Number.isFinite(value)) return null;
  const unit = unitRaw.toLowerCase().replace(/\s+/g, " ");

  const ml = TO_ML[unit];
  if (ml) return `${pretty(value * ml)} ml`;

  const g = TO_G[unit];
  if (g) return `${pretty(value * g)} g`;

  return null;
}

export function convertToImperial(line: string): string | null {
  const m = line.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)/i);
  if (!m) return null;
  const [, raw, unitRaw] = m;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value)) return null;
  const unit = unitRaw.toLowerCase();

  if (unit === "ml") {
    if (value >= 240) return `${pretty(value / 236.588)} cups`;
    if (value >= 15) return `${pretty(value / 14.787)} tbsp`;
    return `${pretty(value / 4.929)} tsp`;
  }
  if (unit === "l") return `${pretty((value * 1000) / 236.588)} cups`;
  if (unit === "g") return `${pretty(value / 28.35)} oz`;
  if (unit === "kg") return `${pretty((value * 1000) / 453.6)} lb`;
  return null;
}

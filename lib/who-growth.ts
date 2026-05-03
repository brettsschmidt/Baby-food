/**
 * WHO Child Growth Standards — compact reference for plotting bands.
 *
 * Values combine boy/girl medians (close enough for a rough overlay; precise
 * percentile fits would need the full LMS table). Months 0-24, kg/cm.
 *
 * Sources: WHO Multicentre Growth Reference Study, 2006. Tables published at
 * https://www.who.int/tools/child-growth-standards.
 */

export interface PercentileBand {
  ageMonths: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export const WHO_WEIGHT_KG: PercentileBand[] = [
  { ageMonths: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { ageMonths: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.7 },
  { ageMonths: 2, p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.0 },
  { ageMonths: 3, p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { ageMonths: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.9, p97: 8.7 },
  { ageMonths: 5, p3: 6.1, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { ageMonths: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.9, p97: 9.8 },
  { ageMonths: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.3, p97: 10.3 },
  { ageMonths: 8, p3: 7.0, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 },
  { ageMonths: 9, p3: 7.2, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { ageMonths: 10, p3: 7.4, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.4 },
  { ageMonths: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 },
  { ageMonths: 12, p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { ageMonths: 15, p3: 8.4, p15: 9.2, p50: 10.3, p85: 11.6, p97: 12.9 },
  { ageMonths: 18, p3: 8.9, p15: 9.8, p50: 10.9, p85: 12.3, p97: 13.7 },
  { ageMonths: 21, p3: 9.4, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { ageMonths: 24, p3: 9.8, p15: 10.8, p50: 12.0, p85: 13.5, p97: 15.2 },
];

export const WHO_LENGTH_CM: PercentileBand[] = [
  { ageMonths: 0, p3: 46.3, p15: 47.9, p50: 49.5, p85: 51.1, p97: 52.7 },
  { ageMonths: 1, p3: 51.1, p15: 52.7, p50: 54.3, p85: 56.0, p97: 57.6 },
  { ageMonths: 2, p3: 54.7, p15: 56.4, p50: 58.1, p85: 59.8, p97: 61.5 },
  { ageMonths: 3, p3: 57.6, p15: 59.4, p50: 61.1, p85: 62.9, p97: 64.6 },
  { ageMonths: 4, p3: 60.0, p15: 61.8, p50: 63.6, p85: 65.4, p97: 67.2 },
  { ageMonths: 5, p3: 61.9, p15: 63.8, p50: 65.7, p85: 67.5, p97: 69.4 },
  { ageMonths: 6, p3: 63.6, p15: 65.5, p50: 67.4, p85: 69.3, p97: 71.2 },
  { ageMonths: 7, p3: 65.1, p15: 67.0, p50: 69.0, p85: 70.9, p97: 72.9 },
  { ageMonths: 8, p3: 66.5, p15: 68.5, p50: 70.4, p85: 72.4, p97: 74.4 },
  { ageMonths: 9, p3: 67.7, p15: 69.7, p50: 71.8, p85: 73.8, p97: 75.9 },
  { ageMonths: 10, p3: 69.0, p15: 71.0, p50: 73.1, p85: 75.2, p97: 77.3 },
  { ageMonths: 11, p3: 70.1, p15: 72.2, p50: 74.3, p85: 76.5, p97: 78.6 },
  { ageMonths: 12, p3: 71.3, p15: 73.4, p50: 75.6, p85: 77.7, p97: 79.9 },
  { ageMonths: 15, p3: 74.4, p15: 76.7, p50: 79.0, p85: 81.3, p97: 83.6 },
  { ageMonths: 18, p3: 77.2, p15: 79.6, p50: 82.1, p85: 84.5, p97: 87.0 },
  { ageMonths: 21, p3: 79.9, p15: 82.4, p50: 84.9, p85: 87.4, p97: 89.9 },
  { ageMonths: 24, p3: 82.2, p15: 84.8, p50: 87.4, p85: 90.0, p97: 92.6 },
];

export const WHO_HEAD_CM: PercentileBand[] = [
  { ageMonths: 0, p3: 32.6, p15: 33.5, p50: 34.5, p85: 35.4, p97: 36.4 },
  { ageMonths: 1, p3: 35.8, p15: 36.7, p50: 37.6, p85: 38.6, p97: 39.5 },
  { ageMonths: 2, p3: 37.6, p15: 38.5, p50: 39.5, p85: 40.4, p97: 41.4 },
  { ageMonths: 3, p3: 38.9, p15: 39.8, p50: 40.7, p85: 41.7, p97: 42.7 },
  { ageMonths: 4, p3: 39.9, p15: 40.8, p50: 41.8, p85: 42.7, p97: 43.7 },
  { ageMonths: 6, p3: 41.4, p15: 42.3, p50: 43.3, p85: 44.3, p97: 45.3 },
  { ageMonths: 9, p3: 42.9, p15: 43.8, p50: 44.8, p85: 45.8, p97: 46.8 },
  { ageMonths: 12, p3: 43.9, p15: 44.8, p50: 45.8, p85: 46.8, p97: 47.8 },
  { ageMonths: 18, p3: 45.1, p15: 46.0, p50: 47.0, p85: 48.0, p97: 49.0 },
  { ageMonths: 24, p3: 45.9, p15: 46.8, p50: 47.8, p85: 48.8, p97: 49.8 },
];

export type PercentileMetric = "weight_kg" | "length_cm" | "head_cm";

export function bandsFor(metric: PercentileMetric): PercentileBand[] {
  switch (metric) {
    case "weight_kg":
      return WHO_WEIGHT_KG;
    case "length_cm":
      return WHO_LENGTH_CM;
    case "head_cm":
      return WHO_HEAD_CM;
  }
}

/** Linearly interpolate a band value at a given age in months. */
export function interpolateBand(
  bands: PercentileBand[],
  ageMonths: number,
  band: keyof Omit<PercentileBand, "ageMonths">,
): number {
  if (bands.length === 0) return 0;
  if (ageMonths <= bands[0].ageMonths) return bands[0][band];
  if (ageMonths >= bands[bands.length - 1].ageMonths) {
    return bands[bands.length - 1][band];
  }
  for (let i = 0; i < bands.length - 1; i++) {
    const a = bands[i];
    const b = bands[i + 1];
    if (ageMonths >= a.ageMonths && ageMonths <= b.ageMonths) {
      const t = (ageMonths - a.ageMonths) / (b.ageMonths - a.ageMonths);
      return a[band] + (b[band] - a[band]) * t;
    }
  }
  return bands[0][band];
}

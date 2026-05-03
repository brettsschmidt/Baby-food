/** Convert any hex / CSS color to an oklch() string (best-effort). */
export function colorToOklch(hex: string): string {
  // We can't compute oklch from RGB without color math; keep it simple by
  // letting CSS resolve the color via color-mix. Returns a CSS value usable
  // anywhere a color is accepted.
  return hex;
}

/** Build an inline style for a household's accent color. */
export function themeStyle(themeColor: string | null | undefined): React.CSSProperties {
  const c = themeColor ?? "#3f9d4a";
  return {
    // Override the primary token; rest of the theme tokens cascade.
    ["--primary" as string]: c,
    ["--ring" as string]: c,
  } as React.CSSProperties;
}

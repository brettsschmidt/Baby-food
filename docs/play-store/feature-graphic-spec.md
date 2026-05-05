# Feature graphic spec

Play Store requires a **1024×500 PNG or JPG** feature graphic. Shown above your screenshots when someone visits the listing.

I can't render this for you (it's a designed asset, not a screenshot), but here's a brief tight enough that you (or a designer / Midjourney / Figma template) can produce it in one pass.

## Recommended composition

- **Background:** solid `#3f9d4a` (your theme green) with a subtle 20% lighter radial gradient from upper-right.
- **Left two-thirds:** a tilted Pixel 8 phone mockup showing the dashboard screenshot (`screenshots/1-dashboard.png`).
- **Right third:** large white serif headline:
  > **Homemade.**
  > **Together.**
  > **Tracked.**
- **Below the headline:** small sans-serif tagline in `#ffffff80`:
  > Plan, make, and log every meal.
- **Bottom-right corner:** the carrot emoji (🥕) at ~120px, lightly transparent (60% opacity).

## Avoid

- **No text on the screenshot itself** — Play Store rejects feature graphics where the screenshot has overlaid marketing copy.
- **No "Download on Google Play" badge** — Play forbids embedding their own badge in feature graphics.
- **No prices, ratings, or 5-star bursts** — also forbidden.
- **Don't include the app icon in the feature graphic** — Play already shows it adjacent.

## Quick path: figma template

1. Duplicate any free "mobile app feature graphic" Figma template (~1024×500).
2. Replace the phone mockup with `docs/play-store/screenshots/1-dashboard.png`.
3. Drop in the headline above.
4. Export as PNG, 1024×500.

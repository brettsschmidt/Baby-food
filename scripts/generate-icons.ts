// Generates PWA icons from a single SVG source.
// Run with: npx tsx scripts/generate-icons.ts (or `npm run icons:gen`)

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const PRIMARY = "#3f9d4a";
const BG = "#ffffff";

const carrotSvg = (size: number, padding = 0) => {
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${PRIMARY}"/>
    <g transform="translate(${padding}, ${padding})">
      <text x="50%" y="58%" font-size="${inner * 0.65}" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🥕</text>
    </g>
  </svg>`;
};

// For the maskable icon, we render the same emoji but with extra safe-zone padding
// so Android's launcher can crop into a circle/squircle without clipping.
const maskableSvg = (size: number) => {
  const safeRatio = 0.7; // emoji occupies the inner 70%
  const inset = (size * (1 - safeRatio)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${PRIMARY}"/>
    <text x="50%" y="56%" font-size="${(size - inset * 2) * 0.65}" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🥕</text>
  </svg>`;
};

// Sharp's text rendering doesn't support color emoji on most systems, so we
// fall back to a clean carrot illustration in pure SVG paths.
const carrotPath = (size: number, opts: { mask?: boolean } = {}) => {
  const safe = opts.mask ? size * 0.85 : size;
  const cx = size / 2;
  const cy = size / 2;
  const w = safe / 1;

  // Body: orange triangle (rotated). Top: green leaves.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${opts.mask ? 0 : size * 0.18}" fill="${opts.mask ? PRIMARY : BG}"/>
    <g transform="translate(${cx}, ${cy + w * 0.05})">
      <!-- Carrot body -->
      <path d="M 0 ${w * 0.32} L ${w * 0.18} ${-w * 0.12} L ${-w * 0.18} ${-w * 0.12} Z"
            fill="#f59e0b" stroke="#b45309" stroke-width="${w * 0.012}" stroke-linejoin="round"/>
      <!-- Body grooves -->
      <line x1="${-w * 0.10}" y1="${-w * 0.04}" x2="${-w * 0.06}" y2="${w * 0.04}" stroke="#b45309" stroke-width="${w * 0.008}" stroke-linecap="round"/>
      <line x1="${w * 0.04}" y1="${-w * 0.06}" x2="${w * 0.07}" y2="${w * 0.04}" stroke="#b45309" stroke-width="${w * 0.008}" stroke-linecap="round"/>
      <line x1="${-w * 0.02}" y1="${-w * 0.08}" x2="${w * 0.00}" y2="${w * 0.10}" stroke="#b45309" stroke-width="${w * 0.008}" stroke-linecap="round"/>
      <!-- Leaves -->
      <ellipse cx="${-w * 0.05}" cy="${-w * 0.18}" rx="${w * 0.05}" ry="${w * 0.10}" fill="${opts.mask ? "#bbf7d0" : "#16a34a"}" transform="rotate(-25 ${-w * 0.05} ${-w * 0.18})"/>
      <ellipse cx="${w * 0.00}" cy="${-w * 0.22}" rx="${w * 0.05}" ry="${w * 0.11}" fill="${opts.mask ? "#bbf7d0" : "#15803d"}"/>
      <ellipse cx="${w * 0.06}" cy="${-w * 0.18}" rx="${w * 0.05}" ry="${w * 0.10}" fill="${opts.mask ? "#bbf7d0" : "#16a34a"}" transform="rotate(25 ${w * 0.06} ${-w * 0.18})"/>
    </g>
  </svg>`;
};

async function renderPng(svg: string, outputPath: string, size: number) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function main() {
  const outDir = path.resolve(process.cwd(), "public/icons");
  await mkdir(outDir, { recursive: true });

  await renderPng(carrotPath(192), path.join(outDir, "icon-192.png"), 192);
  await renderPng(carrotPath(512), path.join(outDir, "icon-512.png"), 512);
  await renderPng(
    carrotPath(512, { mask: true }),
    path.join(outDir, "icon-maskable-512.png"),
    512,
  );

  // Also write a 1024x1024 source PNG for Bubblewrap to consume.
  await renderPng(carrotPath(1024), path.join(outDir, "icon-1024.png"), 1024);

  // Save the SVG source for reference.
  await writeFile(path.join(outDir, "icon.svg"), carrotPath(512));

  // Avoid unused-variable lint when emoji helpers stay around for reference.
  void carrotSvg;
  void maskableSvg;

  console.log("Generated icons in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

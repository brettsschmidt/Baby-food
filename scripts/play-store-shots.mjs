// Captures phone screenshots at Play Store spec (1080×1920 FHD portrait).
// Pre-req: dev server running, /tmp/session.json has an active session for the
// seeded test user (e2e-tester@example.com).

import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "docs/play-store/screenshots");
const SESSION = JSON.parse(readFileSync("/tmp/session.json", "utf8"));
const PROJECT_REF = "yjwoqpukvjeacavsyves";

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const base64url = (s) =>
  Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const cookieValue =
  "base64-" +
  base64url(
    JSON.stringify({
      access_token: SESSION.access_token,
      token_type: SESSION.token_type ?? "bearer",
      expires_in: SESSION.expires_in,
      expires_at: SESSION.expires_at,
      refresh_token: SESSION.refresh_token,
      user: SESSION.user,
    }),
  );

// 8 screens curated for the listing — the ones that best show value.
const shots = [
  { name: "1-dashboard", path: "/dashboard" },
  { name: "2-feedings-timeline", path: "/feedings" },
  { name: "3-feedings-new", path: "/feedings/new" },
  { name: "4-inventory", path: "/inventory" },
  { name: "5-library", path: "/library" },
  { name: "6-recipes", path: "/recipes" },
  { name: "7-care", path: "/care" },
  { name: "8-growth", path: "/growth" },
];

const browser = await chromium.launch({ headless: true });
for (const s of shots) {
  // 540 logical × 960 logical at DPR=2 → 1080×1920 raster
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  });
  await ctx.addCookies([
    { name: `sb-${PROJECT_REF}-auth-token`, value: cookieValue, domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:3000${s.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(800);
    // Hide Next.js dev indicators if present
    await page
      .addStyleTag({
        content: `
        nextjs-portal, [data-nextjs-toast], [data-next-mark-loading], #__next-build-watcher { display:none !important; }
      `,
      })
      .catch(() => {});
    await page.screenshot({
      path: join(OUT, `${s.name}.png`),
      fullPage: false,
      clip: { x: 0, y: 0, width: 540, height: 960 },
    });
    console.log(`${s.name}: ${page.url()}`);
  } catch (e) {
    console.log(`${s.name}: ERROR ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\nDone. Output → ${OUT}`);

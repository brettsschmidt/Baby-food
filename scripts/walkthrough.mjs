// Drives the running dev server end-to-end, capturing screenshots.
// Usage: node scripts/walkthrough.mjs
//
// Prerequisites (already done before running):
//   1. Dev server running on localhost:3000
//   2. /tmp/session.json contains an active Supabase access/refresh pair
//      (obtained via POST /auth/v1/token?grant_type=password)

import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SHOTS = join(ROOT, "docs/screenshots");
const SESSION = JSON.parse(readFileSync("/tmp/session.json", "utf8"));
const PROJECT_REF = "yjwoqpukvjeacavsyves";
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const BASE = "http://localhost:3000";

if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

function base64url(s) {
  return Buffer.from(s, "utf8").toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const sessionCookieValue = "base64-" + base64url(JSON.stringify({
  access_token: SESSION.access_token,
  token_type: SESSION.token_type ?? "bearer",
  expires_in: SESSION.expires_in,
  expires_at: SESSION.expires_at,
  refresh_token: SESSION.refresh_token,
  user: SESSION.user,
}));

// Chunk if needed (3180-byte chunks per supabase-ssr).
function buildCookies() {
  const MAX = 3180;
  const encoded = encodeURIComponent(sessionCookieValue);
  if (encoded.length <= MAX) {
    return [{ name: COOKIE_NAME, value: sessionCookieValue, domain: "localhost", path: "/" }];
  }
  // simple split — values must remain valid UTF-8 after URL-decode, but the prefix is plain ASCII so any byte split is fine
  const chunks = [];
  let raw = sessionCookieValue;
  let i = 0;
  while (raw.length > 0) {
    const chunk = raw.slice(0, MAX);
    raw = raw.slice(MAX);
    chunks.push({ name: `${COOKIE_NAME}.${i++}`, value: chunk, domain: "localhost", path: "/" });
  }
  return chunks;
}

const steps = [];
function step(name, fn) { steps.push({ name, fn }); }

step("01-login", async (page) => {
  // logged-out screenshot — clear cookies first
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
});
step("02-onboarding-resume", async (page) => {
  // restore session for the rest of the walkthrough
  await page.context().addCookies(buildCookies());
  await page.goto(`${BASE}/dashboard`);
});
step("08-dashboard", async (page) => {
  await page.goto(`${BASE}/dashboard`);
});
step("09-feedings", async (page) => { await page.goto(`${BASE}/feedings`); });
step("10-feedings-new", async (page) => { await page.goto(`${BASE}/feedings/new`); });
step("11-inventory", async (page) => { await page.goto(`${BASE}/inventory`); });
step("12-inventory-new", async (page) => { await page.goto(`${BASE}/inventory/new`); });
step("13-library", async (page) => { await page.goto(`${BASE}/library`); });
step("14-recipes", async (page) => { await page.goto(`${BASE}/recipes`); });
step("15-recipes-new", async (page) => { await page.goto(`${BASE}/recipes/new`); });
step("16-planner", async (page) => { await page.goto(`${BASE}/planner`); });
step("17-shopping", async (page) => { await page.goto(`${BASE}/shopping`); });
step("18-care", async (page) => { await page.goto(`${BASE}/care`); });
step("19-care-supplements", async (page) => { await page.goto(`${BASE}/care/supplements`); });
step("20-care-readiness", async (page) => { await page.goto(`${BASE}/care/readiness`); });
step("21-growth", async (page) => { await page.goto(`${BASE}/growth`); });
step("22-memories", async (page) => { await page.goto(`${BASE}/memories`); });
step("23-insights", async (page) => { await page.goto(`${BASE}/insights`); });
step("24-activity", async (page) => { await page.goto(`${BASE}/activity`); });
step("25-settings", async (page) => { await page.goto(`${BASE}/settings`); });
step("26-settings-security", async (page) => { await page.goto(`${BASE}/settings/security`); });

const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 412, height: 900 },
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
});
await context.addCookies(buildCookies());

const page = await context.newPage();

// Capture console + page errors
const consoleErrors = [];
page.on("pageerror", (err) => consoleErrors.push({ type: "pageerror", msg: err.message }));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push({ type: "console", msg: msg.text() });
});

for (const { name, fn } of steps) {
  consoleErrors.length = 0;
  let error = null;
  try {
    await fn(page);
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  } catch (e) {
    error = String(e?.message ?? e);
  }
  const url = page.url();
  const path = join(SHOTS, `${name}.png`);
  try {
    await page.screenshot({ path, fullPage: true });
  } catch (e) {
    // ignore
  }
  results.push({ name, url, error, consoleErrors: [...consoleErrors] });
  console.log(`[${name}] ${url}${error ? " ERR=" + error : ""}${consoleErrors.length ? " console=" + consoleErrors.length : ""}`);
}

await browser.close();

import { writeFileSync } from "node:fs";
writeFileSync(join(SHOTS, "_results.json"), JSON.stringify(results, null, 2));
console.log(`\nDone. ${results.length} steps. Results in ${join(SHOTS, "_results.json")}`);

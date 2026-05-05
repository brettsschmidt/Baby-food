import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHOTS = join(new URL("..", import.meta.url).pathname, "docs/screenshots");
const SESSION = JSON.parse(readFileSync("/tmp/session.json", "utf8"));
const PROJECT_REF = "yjwoqpukvjeacavsyves";

function base64url(s) {
  return Buffer.from(s, "utf8").toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
const cookieValue = "base64-" + base64url(JSON.stringify({
  access_token: SESSION.access_token,
  token_type: SESSION.token_type ?? "bearer",
  expires_in: SESSION.expires_in,
  expires_at: SESSION.expires_at,
  refresh_token: SESSION.refresh_token,
  user: SESSION.user,
}));

const targets = [
  { name: "08-dashboard", path: "/dashboard" },
  { name: "10-feedings-new", path: "/feedings/new" },
  { name: "18-care", path: "/care" },
  { name: "20-care-readiness", path: "/care/readiness" },
  { name: "23-insights", path: "/insights" },
  { name: "25-settings", path: "/settings" },
  { name: "26-settings-security", path: "/settings/security" },
];

const browser = await chromium.launch({ headless: true });
for (const t of targets) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    deviceScaleFactor: 2,
  });
  await ctx.addCookies([{ name: `sb-${PROJECT_REF}-auth-token`, value: cookieValue, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:3000${t.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `${t.name}.png`), fullPage: true });
    console.log(`${t.name}: ${page.url()}`);
  } catch (e) {
    console.log(`${t.name}: ERROR ${e.message}`);
  }
  await ctx.close();
}
await browser.close();

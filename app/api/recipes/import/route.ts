import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface ParsedRecipe {
  name?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string;
  prepMinutes?: number;
  yield?: string;
  imageUrl?: string;
  sourceUrl: string;
}

function pickRecipeNode(jsonLd: unknown): Record<string, unknown> | null {
  // Recursively find a node with @type containing "Recipe".
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const matches = (t: unknown) =>
    typeof t === "string"
      ? t.toLowerCase() === "recipe"
      : Array.isArray(t)
        ? t.some((x) => typeof x === "string" && x.toLowerCase() === "recipe")
        : false;

  const queue: unknown[] = [jsonLd];
  while (queue.length) {
    const cur = queue.shift();
    if (Array.isArray(cur)) {
      queue.push(...cur);
    } else if (isObj(cur)) {
      if (matches(cur["@type"])) return cur;
      // dig into @graph + nested properties
      if (Array.isArray(cur["@graph"])) queue.push(...(cur["@graph"] as unknown[]));
      for (const v of Object.values(cur)) queue.push(v);
    }
  }
  return null;
}

function parseISODuration(d: string | undefined): number | undefined {
  if (!d) return undefined;
  const m = d.match(/^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!m) return undefined;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  return h * 60 + min;
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
  if (typeof v === "object" && v && "@value" in (v as Record<string, unknown>))
    return String((v as Record<string, unknown>)["@value"] ?? "");
  return undefined;
}

function extractIngredients(node: Record<string, unknown>): string[] {
  const raw = node.recipeIngredient ?? node.ingredients;
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === "string").map((s) => s.trim());
  if (typeof raw === "string") return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function extractInstructions(node: Record<string, unknown>): string {
  const raw = node.recipeInstructions;
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((step) => {
        if (typeof step === "string") return step;
        if (typeof step === "object" && step && "text" in (step as Record<string, unknown>))
          return String((step as Record<string, unknown>).text ?? "");
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorised", { status: 401 });

  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(body.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("scheme");
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const html = await fetch(url.toString(), {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (BabyFoodImporter)" },
  })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch(() => null);

  if (!html) return NextResponse.json({ error: "Could not fetch URL" }, { status: 400 });

  const ldRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let recipeNode: Record<string, unknown> | null = null;
  while ((match = ldRegex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const node = pickRecipeNode(parsed);
      if (node) {
        recipeNode = node;
        break;
      }
    } catch {
      /* ignore malformed blocks */
    }
  }

  const result: ParsedRecipe = { sourceUrl: url.toString() };
  if (recipeNode) {
    result.name = asString(recipeNode.name);
    result.description = asString(recipeNode.description);
    result.ingredients = extractIngredients(recipeNode);
    result.instructions = extractInstructions(recipeNode);
    result.prepMinutes =
      parseISODuration(asString(recipeNode.totalTime)) ??
      parseISODuration(asString(recipeNode.cookTime)) ??
      parseISODuration(asString(recipeNode.prepTime));
    result.yield = asString(recipeNode.recipeYield);
    const img = recipeNode.image;
    result.imageUrl = Array.isArray(img) ? asString(img[0]) : asString(img);
  } else {
    // Fallback: best-effort title scrape
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (t) result.name = t[1].trim();
  }

  return NextResponse.json(result);
}

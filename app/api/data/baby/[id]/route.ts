import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { buildZip } from "@/lib/zip";

const TABLES = [
  "feedings",
  "growth_measurements",
  "sleep_logs",
  "diaper_logs",
  "supplement_logs",
  "memories",
  "readiness_evaluations",
  "meal_plans",
] as const;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  // Confirm baby belongs to household.
  const { data: baby } = await supabase
    .from("babies")
    .select("id, name")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!baby) return new NextResponse("not found", { status: 404 });

  const files: { name: string; content: string }[] = [];
  for (const table of TABLES) {
    const { data } = await supabase.from(table).select("*").eq("baby_id", id);
    files.push({ name: `${table}.json`, content: JSON.stringify(data ?? [], null, 2) });
  }
  files.push({
    name: "README.txt",
    content: `Baby Food per-baby export for ${baby.name}\nGenerated: ${new Date().toISOString()}\n`,
  });

  const zip = buildZip(files);
  const body = new ArrayBuffer(zip.byteLength);
  new Uint8Array(body).set(zip);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baby.name.replace(/[^a-z0-9]/gi, "_")}-${new Date()
        .toISOString()
        .slice(0, 10)}.zip"`,
    },
  });
}

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { exportHouseholdData } from "@/lib/data-export";
import { buildZip } from "@/lib/zip";

export async function GET() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const files = await exportHouseholdData(supabase, householdId);
  const zip = buildZip(files);
  // Copy into a fresh ArrayBuffer so NextResponse accepts it as BodyInit.
  const body = new ArrayBuffer(zip.byteLength);
  new Uint8Array(body).set(zip);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="baby-food-${new Date()
        .toISOString()
        .slice(0, 10)}.zip"`,
    },
  });
}

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const start = new Date().getTime();
  let dbOk = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("households").select("id").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const duration = new Date().getTime() - start;
  return NextResponse.json({
    ok: dbOk,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  });
}

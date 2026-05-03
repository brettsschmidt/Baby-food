import { NextResponse, type NextRequest } from "next/server";

import { captureException } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { message?: string; digest?: string; stack?: string }
    | null;
  if (!body?.message) return NextResponse.json({ ok: true });

  await captureException(new Error(body.message), {
    digest: body.digest,
    stack: body.stack,
    surface: "client",
  });
  return NextResponse.json({ ok: true });
}

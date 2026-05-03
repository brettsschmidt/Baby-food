import { NextResponse, type NextRequest } from "next/server";

import { logFeeding } from "@/lib/actions/feedings";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new NextResponse("invalid", { status: 400 });

  const fd = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, String(v));
    } else if (value !== null && value !== undefined) {
      fd.set(key, String(value));
    }
  }
  // Bypass the redirect inside logFeeding by catching its NEXT_REDIRECT throw.
  try {
    await logFeeding(fd);
  } catch (err) {
    // Next's redirect() throws; that means the action succeeded.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

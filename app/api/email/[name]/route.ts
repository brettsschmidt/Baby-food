import { NextResponse } from "next/server";

import { INVITE_HTML, MAGIC_LINK_HTML, RECOVERY_HTML } from "@/lib/email-templates";

const TEMPLATES: Record<string, string> = {
  magic_link: MAGIC_LINK_HTML,
  invite: INVITE_HTML,
  recovery: RECOVERY_HTML,
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  const template = TEMPLATES[name];
  if (!template) return new NextResponse("not found", { status: 404 });
  return new NextResponse(template.trim(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

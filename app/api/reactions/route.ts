import { NextResponse } from "next/server";

const allowed = new Set(["want", "build", "watch", "save"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONが不正です。" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.opportunitySlug !== "string" || !input.opportunitySlug || typeof input.kind !== "string" || !allowed.has(input.kind) || typeof input.active !== "boolean") {
    return NextResponse.json({ error: "opportunitySlug、kind、activeを確認してください。" }, { status: 422 });
  }
  return NextResponse.json({ accepted: true, persisted: false, dataMode: "demo", message: "DEMOではブラウザ保存のみです。" });
}

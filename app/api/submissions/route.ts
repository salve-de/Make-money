import { NextResponse } from "next/server";

function text(input: Record<string, unknown>, key: string, max: number) {
  return typeof input[key] === "string" ? input[key].trim().slice(0, max) : "";
}

function blocked(hostname: string) {
  const value = hostname.toLowerCase();
  return value === "localhost" || value === "0.0.0.0" || value === "::1" || value.endsWith(".local") || /^127\./.test(value) || /^10\./.test(value) || /^192\.168\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value);
}

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
  const urlValue = text(input, "url", 2048);
  const name = text(input, "name", 120);
  const audience = text(input, "audience", 160);
  const pricing = text(input, "pricing", 120);
  const oneLiner = text(input, "oneLiner", 180);
  const email = text(input, "email", 320);
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return NextResponse.json({ error: "有効な公開URLを入力してください。" }, { status: 422 });
  }
  if (!["http:", "https:"].includes(url.protocol) || blocked(url.hostname)) {
    return NextResponse.json({ error: "公開されたhttp/https URLのみ登録できます。" }, { status: 422 });
  }
  if (!name || !audience || !pricing || !oneLiner) {
    return NextResponse.json({ error: "サービス名、対象顧客、料金、説明は必須です。" }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "連絡先メールを確認してください。" }, { status: 422 });
  }
  return NextResponse.json({ id: `sub_${crypto.randomUUID().slice(0, 12)}`, status: "pending", trustLevel: "unverified", persisted: false, message: "DEMO審査キューへ受け付けました。" }, { status: 201 });
}

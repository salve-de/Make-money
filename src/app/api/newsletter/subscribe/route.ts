import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribers } from "@/db";
import { eq } from "drizzle-orm";

import { parseNewsletter, readInput } from "@/lib/api/input";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const input = await readInput(req, parseNewsletter);
  if (!input) return NextResponse.json({ error: "有効なメールアドレスと送信元を入力してください" }, { status: 400 });
  const { email: cleanEmail, source } = input;
  if (!db) return NextResponse.json({ error: "現在、購読登録を保存できません" }, { status: 503 });
  try {
    // 重複チェック
    const existing = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: "既に登録済みのメールアドレスです。毎週月曜朝の配信をお待ちください。",
        subscriberId: existing[0].id,
        email: cleanEmail,
      });
    }

    const inserted = await db
      .insert(newsletterSubscribers)
      .values({
        email: cleanEmail,
        source,
        status: "active",
      })
      .returning({ id: newsletterSubscribers.id });

    if (!inserted[0]) throw new Error("No subscriber persisted");

    return NextResponse.json({
      success: true,
      message: "週刊マネー速報の購読登録が完了しました",
      subscriberId: inserted[0]?.id,
      email: cleanEmail,
    });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return NextResponse.json(
      { error: "購読処理中にエラーが発生しました。時間を置いて再度お試しください。" },
      { status: 500 }
    );
  }
}

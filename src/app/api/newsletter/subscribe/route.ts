import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribers } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, source = "web_portal" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!db) {
      // データベース未接続時の安全なフォールバック
      return NextResponse.json({
        success: true,
        message: "週刊マネー速報の購読を完了しました（検証環境）",
        subscriberId: 9999,
        email: cleanEmail,
      });
    }

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

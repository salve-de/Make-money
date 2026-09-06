import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { db, savedItems } from "@/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ユーザーの保存済み一覧取得
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ saved: [] });
  }

  try {
    const items = await db
      .select()
      .from(savedItems)
      .where(eq(savedItems.userId, user.uid));
    return NextResponse.json({ saved: items });
  } catch (err) {
    console.error("Failed to get saved items:", err);
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}

// アイテムの保存 / 保存解除（トグル）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { itemType, itemId } = body;

  if (!itemType || !itemId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ success: true, saved: true, note: "Mock mode (No DB)" });
  }

  try {
    const existing = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.userId, user.uid),
          eq(savedItems.itemType, itemType),
          eq(savedItems.itemId, itemId)
        )
      );

    if (existing.length > 0) {
      // 既に保存されている場合は削除（トグル解除）
      await db
        .delete(savedItems)
        .where(eq(savedItems.id, existing[0].id));
      return NextResponse.json({ success: true, saved: false });
    } else {
      // 新規保存
      await db.insert(savedItems).values({
        userId: user.uid,
        itemType,
        itemId,
      });
      return NextResponse.json({ success: true, saved: true });
    }
  } catch (err) {
    console.error("Failed to toggle bookmark:", err);
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}

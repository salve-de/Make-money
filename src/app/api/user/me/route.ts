import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.split("Bearer ")[1];
  const verifiedUser = await verifyFirebaseIdToken(idToken);

  if (!verifiedUser) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Neon DBが接続されている場合はユーザー情報を照合・更新
  if (db) {
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, verifiedUser.uid))
        .limit(1);

      if (existing.length > 0) {
        const user = existing[0];
        return NextResponse.json({
          uid: user.id,
          email: user.email,
          displayName: user.displayName,
          isPro: user.isPro,
          role: user.role,
        });
      }

      // 新規ユーザー登録
      await db.insert(users).values({
        id: verifiedUser.uid,
        email: verifiedUser.email || `${verifiedUser.uid}@anon.example.com`,
        displayName: verifiedUser.name || null,
        isPro: false,
      });

      return NextResponse.json({
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        displayName: verifiedUser.name,
        isPro: false,
        role: "member",
      });
    } catch (dbError) {
      console.error("Neon DB query error in /api/user/me:", dbError);
      return NextResponse.json({ error: "会員情報を取得できません" }, { status: 503 });
    }
  }

  // Missing persistence cannot establish whether a user has a paid membership.
  return NextResponse.json({ error: "会員情報を取得できません" }, { status: 503 });
}

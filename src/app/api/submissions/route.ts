import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { db, submissions } from "@/db";

import { parseSubmission, readInput } from "@/lib/api/input";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    const user = await verifyFirebaseIdToken(token);
    if (user) {
      userId = user.uid;
    }
  }

  const input = await readInput(req, parseSubmission);
  if (!input) return NextResponse.json({ error: "事業名、URL、月商、月利などの入力内容を確認してください" }, { status: 400 });
  if (!db) return NextResponse.json({ error: "現在、申請を保存できません" }, { status: 503 });

  try {
    const inserted = await db
      .insert(submissions)
      .values({
        userId,
        ...input,
        status: "pending",
      })
      .returning({ id: submissions.id });

    if (!inserted[0]) throw new Error("No submission persisted");

    return NextResponse.json({
      success: true,
      message: "掲載申請を受理しました。照合審査後に掲載されます。",
      submissionId: inserted[0]?.id,
    });
  } catch (err) {
    console.error("Submission DB error:", err);
    return NextResponse.json({ error: "申請の保存に失敗しました" }, { status: 500 });
  }
}

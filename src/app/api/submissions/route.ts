import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { db, submissions } from "@/db";

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

  const body = await req.json();
  const {
    businessName,
    url,
    monthlyRevenue,
    monthlyProfit,
    toolsUsed,
    acquisitionChannel,
    proofScreenshotUrl,
  } = body;

  if (!businessName || !url || !monthlyRevenue || !monthlyProfit) {
    return NextResponse.json(
      { error: "必須項目（事業名、URL、月商、月利）が不足しています" },
      { status: 400 }
    );
  }

  if (!db) {
    return NextResponse.json({
      success: true,
      message: "掲載申請を受理しました（検証環境）",
      submissionId: 9999,
    });
  }

  try {
    const inserted = await db
      .insert(submissions)
      .values({
        userId,
        businessName,
        url,
        monthlyRevenue: Number(monthlyRevenue),
        monthlyProfit: Number(monthlyProfit),
        toolsUsed: toolsUsed || "",
        acquisitionChannel: acquisitionChannel || "",
        proofScreenshotUrl: proofScreenshotUrl || "",
        status: "pending",
      })
      .returning({ id: submissions.id });

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

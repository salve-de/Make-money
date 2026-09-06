import { NextResponse } from "next/server";
import { db, businesses } from "@/db";
import { BUSINESS_DATA } from "@/data/businesses";

export const dynamic = "force-dynamic";

export async function GET() {
  if (db) {
    try {
      const rows = await db.select().from(businesses);
      if (rows.length > 0) {
        return NextResponse.json({ source: "database", data: rows });
      }
    } catch (err) {
      console.warn("Neon DB fetch failed, falling back to static data:", err);
    }
  }

  // DB未接続・空の場合は静的実在データから応答
  return NextResponse.json({ source: "static", data: BUSINESS_DATA });
}

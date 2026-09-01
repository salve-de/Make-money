import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "goldmine-radar",
    dataMode: process.env.NEXT_PUBLIC_DATA_MODE || "demo",
    timestamp: new Date().toISOString()
  });
}

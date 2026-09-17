import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

interface RegistryEntry {
  id: string;
  name: string;
  normName: string;
  ticker?: string;
  domain?: string;
  sector?: string;
  status?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkQuery = searchParams.get("check") || searchParams.get("q");

    const registryPath = path.join(process.cwd(), "data", "collected-registry.json");
    const content = await fs.readFile(registryPath, "utf-8");
    const registry: RegistryEntry[] = JSON.parse(content);

    // 単体重複判定クエリ
    if (checkQuery && typeof checkQuery === "string") {
      const normQuery = checkQuery.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, "");
      const matched = registry.find((item: RegistryEntry) => {
        if (item.normName === normQuery) return true;
        if (item.ticker && item.ticker.toLowerCase() === checkQuery.toLowerCase().trim()) return true;
        if (item.domain && item.domain.toLowerCase() === checkQuery.toLowerCase().trim()) return true;
        if (item.name && item.name.toLowerCase() === checkQuery.toLowerCase().trim()) return true;
        return false;
      });

      if (matched) {
        return NextResponse.json({
          status: "EXISTS",
          exists: true,
          message: `既に収集済みです: [${matched.name}] (ID: ${matched.id}, Ticker: ${matched.ticker || "N/A"})`,
          entity: matched,
        });
      } else {
        return NextResponse.json({
          status: "AVAILABLE",
          exists: false,
          message: `未収集です（重複なし）。新規収集可能です: "${checkQuery}"`,
          query: checkQuery,
        });
      }
    }

    // 全件一覧（超軽量サマリー）
    return NextResponse.json({
      success: true,
      totalCount: registry.length,
      entities: registry,
    });
  } catch (error) {
    console.error("[API /api/registry] Error:", error);
    return NextResponse.json(
      { error: "Failed to read collected registry", details: String(error) },
      { status: 500 }
    );
  }
}

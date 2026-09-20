import { NextRequest, NextResponse } from "next/server";
import collectedRegistry from "../../../../data/collected-registry.json";

export const dynamic = 'force-dynamic';

// Keep the registry in the Worker bundle. Cloudflare Workers do not expose the
// repository filesystem at request time, while local Next development does.
// The JSON file is the existing parity-checked read-only registry source.
const REGISTRY = collectedRegistry as RegistryEntry[];

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

    // 単体重複判定クエリ
    if (checkQuery && typeof checkQuery === "string") {
      const normQuery = checkQuery.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, "");
      const matched = REGISTRY.find((item: RegistryEntry) => {
        if (item.normName === normQuery || item.normName.includes(normQuery)) return true;
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
      totalCount: REGISTRY.length,
      entities: REGISTRY,
    });
  } catch (error) {
    console.error("[API /api/registry] Error:", error);
    return NextResponse.json(
      { error: "収集レジストリを取得できません" },
      { status: 500 }
    );
  }
}

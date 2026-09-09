import { NextResponse } from "next/server";
import { INSTITUTIONAL_ENTITIES } from "@/platform/data/mockLedgerData";
import { getFromR2 } from "@/lib/storage/r2";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FinancialEntity } from "@/platform/types/terminal";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. R2上の集約インデックス (datasets/ds.business.entities.core/index.json) からの取得を試行
  try {
    const r2IndexRaw = await getFromR2("datasets/ds.business.entities.core/index.json");
    if (r2IndexRaw) {
      const parsed = JSON.parse(r2IndexRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json(
          { source: "r2_lake", count: parsed.length, data: parsed },
          {
            headers: {
              "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
          }
        );
      }
    }
  } catch {
    // R2未接続または取得エラー時はローカルキャッシュへフォールバック
  }

  // 2. ローカルの集約インデックス (data/entities-index.json) からの取得を試行
  try {
    const localIndexPath = resolve(process.cwd(), "data/entities-index.json");
    const localContent = await readFile(localIndexPath, "utf8");
    const parsed = JSON.parse(localContent) as FinancialEntity[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return NextResponse.json(
        { source: "local_cache", count: parsed.length, data: parsed },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }
  } catch {
    // ローカルインデックス未生成時はマスター静的データへ
  }

  // 3. 静的確定マスターデータからの即時応答 (フォールバック)
  return NextResponse.json(
    { source: "static_master", count: INSTITUTIONAL_ENTITIES.length, data: INSTITUTIONAL_ENTITIES },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}


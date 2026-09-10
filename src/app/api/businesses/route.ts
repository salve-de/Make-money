import { NextResponse } from "next/server";
import { getFromR2 } from "@/lib/storage/r2";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FinancialEntity } from "@/platform/types/terminal";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. ローカルの集約インデックス (data/entities-index.json) からの取得を最優先
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
    // ローカルインデックス未生成時はR2へフォールバック
  }

  // 2. R2上の集約インデックス (datasets/ds.business.entities.core/index.json) からの取得を試行
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
    // R2未接続または取得エラー時
  }

  // 3. データ未到達時の空応答
  return NextResponse.json(
    { source: "empty", count: 0, data: [] },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}


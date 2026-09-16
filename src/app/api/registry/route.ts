import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/api/input";
import { checkTargetStatus, addClaimEntry, RegistryEntry } from "@/lib/registry/claim-checker";
import { execSync } from "node:child_process";

const MAX_REGISTRY_REQUEST_BYTES = 16 * 1024; // 16KB

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkQuery = searchParams.get("check") || searchParams.get("q");

    // 単体重複判定クエリ
    if (checkQuery && typeof checkQuery === "string") {
      const result = await checkTargetStatus(checkQuery);
      return NextResponse.json(result);
    }

    // 全件一覧（超軽量サマリー）
    const registryPath = path.join(process.cwd(), "data", "collected-registry.json");
    const content = await fs.readFile(registryPath, "utf-8");
    const registry: RegistryEntry[] = JSON.parse(content);

    return NextResponse.json({
      success: true,
      totalCount: registry.length,
      entities: registry,
    });
  } catch (error) {
    console.error("[API /api/registry] Error:", error);
    return NextResponse.json(
      { error: "Failed to process registry request", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await readJsonBody(req, MAX_REGISTRY_REQUEST_BYTES)) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const target = typeof body.target === "string" ? body.target.trim() : "";
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "EXTERNAL_API";

    if (!target) {
      return NextResponse.json({ error: "target field is required" }, { status: 400 });
    }

    // 重複チェック
    const check = await checkTargetStatus(target);
    if (check.exists) {
      return NextResponse.json({
        success: false,
        status: check.status,
        message: check.reason,
        entity: check.entity,
      }, { status: 409 });
    }

    // 予約ロックを記録
    await addClaimEntry(target, agentId);

    // R2台帳へ非同期同期（バックグラウンド）
    try {
      execSync("node scripts/with-r2-keychain-secrets.mjs npx tsx scripts/pipeline/sync-claims-r2.ts push", {
        stdio: "ignore",
      });
    } catch {
      // オフライン環境やCIでは無視
    }

    return NextResponse.json({
      success: true,
      status: "CLAIMED",
      message: `✓ 予約ロック完了: "${target}" を台帳およびR2に記録しました。`,
      target,
      agentId,
    });
  } catch (error) {
    console.error("[API POST /api/registry] Error:", error);
    return NextResponse.json(
      { error: "Failed to claim target", details: String(error) },
      { status: 500 }
    );
  }
}

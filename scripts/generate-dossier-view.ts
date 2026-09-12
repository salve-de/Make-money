/**
 * Dossier Projector (Day 1 Serving View Generator)
 *
 * 原本Lakeの事例から Curation Gate (evaluateEntityCuration) を通過した適格事例だけを抽出し、
 * UIが0.01秒で単一GETできる事前生成済み完全体Dossier（1社1JSON）を生成する。
 *
 * 不変条件:
 * - Curation ACCEPTED 以外は1件もDossier化されない
 * - 生成されたDossierはUIがLakeを掘らずに即座に描画可能な完全体パッケージである
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateEntityCuration } from "../src/lib/foundation/curation";
import type { FinancialEntity } from "../src/shared/terminal";

function loadEntities(): FinancialEntity[] {
  const indexPath = resolve(process.cwd(), "data/entities-index.json");
  if (!existsSync(indexPath)) {
    return [];
  }
  const content = readFileSync(indexPath, "utf-8");
  return JSON.parse(content) as FinancialEntity[];
}

export interface MaterializedDossier {
  schema: "mm.dossier.v1";
  entityId: string;
  ticker: string;
  name: string;
  tagline: string;
  sector: string;
  projectorVersion: string;
  projectedAt: string;
  curationState: "ACCEPTED";

  /** コア財務・事業体完全体 */
  entity: FinancialEntity;

  /** レコード完全性・品質シグナル */
  qualityAudit: {
    hasEvidenceCards: boolean;
    evidenceCardCount: number;
    financialStatus: string;
    hasLootBlueprint: boolean;
  };
}

export function projectToDossier(entity: FinancialEntity): MaterializedDossier {
  const cards = entity.evidenceCards || [];
  const hasLootBlueprint = cards.some((c) => c.type === "LOOT_BLUEPRINT");

  return {
    schema: "mm.dossier.v1",
    entityId: entity.id,
    ticker: entity.ticker || entity.id.toUpperCase(),
    name: entity.name,
    tagline: entity.tagline,
    sector: entity.sector,
    projectorVersion: "1.0.0",
    projectedAt: new Date().toISOString(),
    curationState: "ACCEPTED",
    entity,
    qualityAudit: {
      hasEvidenceCards: cards.length > 0,
      evidenceCardCount: cards.length,
      financialStatus: entity.pnl?.financialStatus || "UNAVAILABLE",
      hasLootBlueprint,
    },
  };
}

export function runDossierProjection(): {
  acceptedCount: number;
  reviewCount: number;
  rejectedCount: number;
} {
  const allEntities = loadEntities();
  const outDir = resolve(process.cwd(), "public/data/dossiers");
  mkdirSync(outDir, { recursive: true });

  let acceptedCount = 0;
  let reviewCount = 0;
  let rejectedCount = 0;

  const rejectedReport: Array<{ id: string; name: string; reasons: string[] }> = [];

  for (const entity of allEntities) {
    const decision = evaluateEntityCuration(entity);

    if (decision.status === "ACCEPTED") {
      const dossier = projectToDossier(entity);
      const filePath = resolve(outDir, `${entity.id}.json`);
      writeFileSync(filePath, JSON.stringify(dossier, null, 2), "utf-8");
      acceptedCount++;
    } else if (decision.status === "REVIEW") {
      reviewCount++;
    } else {
      rejectedCount++;
      rejectedReport.push({
        id: entity.id,
        name: entity.name,
        reasons: decision.reasons,
      });
    }
  }

  // 隔離レポートの出力
  const reportDir = resolve(process.cwd(), "data/curation");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    resolve(reportDir, "curation-report.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalEvaluated: allEntities.length,
        acceptedCount,
        reviewCount,
        rejectedCount,
        rejected: rejectedReport,
      },
      null,
      2,
    ),
    "utf-8",
  );

  return { acceptedCount, reviewCount, rejectedCount };
}

// CLI実行時
if (process.argv[1]?.includes("generate-dossier-view")) {
  const result = runDossierProjection();
  console.log(`[DossierProjector] Completed: ${result.acceptedCount} ACCEPTED, ${result.reviewCount} REVIEW, ${result.rejectedCount} REJECTED`);
}

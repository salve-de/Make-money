/**
 * Curation Gate (Make-Money Promotion Filter)
 *
 * 原本Lake（原料倉庫）の生Entity/Observation群から、
 * Make-Moneyの陳列棚（Dossier）へ昇格可能な事例だけを機械的に判定・選別する門番。
 *
 * 不変条件: Curation State が ACCEPTED 以外の事例は絶対に画面・Dossierに公開されない。
 */

import { checkBlacklist } from "./blacklist";
import type { FinancialEntity } from "@/shared/terminal";

export type CurationStatus = "ACCEPTED" | "REVIEW" | "REJECTED";

export interface CurationDecision {
  entityId: string;
  status: CurationStatus;
  reasons: string[];
  evaluatedAt: string;
}

/**
 * 事例がMake-MoneyのDossierとして適格か機械判定する
 */
export function evaluateEntityCuration(entity: Partial<FinancialEntity>): CurationDecision {
  const reasons: string[] = [];
  const entityId = entity.id || "unknown";

  // Gate 1: ブラックリスト・検疫チェック（まとめ記事、ダミー、Star0等）
  const blacklistHit = checkBlacklist({
    id: entity.id,
    name: entity.name,
    url: entity.url,
  });

  if (blacklistHit.isBlacklisted) {
    return {
      entityId,
      status: "REJECTED",
      reasons: [`Blacklisted: ${blacklistHit.reason} (matched ${blacklistHit.matchedRule})`],
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Gate 2: 基礎アイデンティティ完全性チェック
  if (!entity.name || entity.name.trim().length === 0) {
    reasons.push("Missing name");
  }

  if (!entity.url || !entity.url.startsWith("http")) {
    reasons.push("Missing or invalid URL");
  }

  // Gate 3: 記事・リポジトリの誤認チェック
  if (entity.id && entity.id.startsWith("ent_repository_")) {
    return {
      entityId,
      status: "REJECTED",
      reasons: ["Repository candidate is not a verified business entity"],
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Gate 4: サバンナOS・ビジネス骨格チェック
  if (!entity.tagline || entity.tagline.trim().length < 5) {
    reasons.push("Tagline is empty or too short");
  }

  if (!entity.sector) {
    reasons.push("Missing sector classification");
  }

  // Gate 5: 財務ステータス検査（未確認・架空0円放置の検知）
  const pnl = entity.pnl;
  if (!pnl) {
    reasons.push("Missing P&L statement");
  } else {
    // 売上も手残りも一切なく、根拠もないものは要レビュー
    const hasObservedRevenue = pnl.monthlyRevenue && pnl.monthlyRevenue > 0;
    const hasNetProfit = pnl.estimatedAnnualNetProfit && pnl.estimatedAnnualNetProfit > 0;
    const isEstimatedWithFormula = pnl.financialStatus === "ESTIMATED" && pnl.estimationLogic;
    const isVerified = pnl.financialStatus === "VERIFIED" || pnl.financialStatus === "REPORTED";

    if (!hasObservedRevenue && !hasNetProfit && !isEstimatedWithFormula && !isVerified) {
      // 財務情報が全くない場合はREVIEW扱い（公開は保留）
      reasons.push("Financial data lacks provenance or estimation formula");
    }
  }

  // 判定
  if (reasons.some((r) => r.includes("Missing name") || r.includes("invalid URL"))) {
    return {
      entityId,
      status: "REJECTED",
      reasons,
      evaluatedAt: new Date().toISOString(),
    };
  }

  if (reasons.length > 0) {
    return {
      entityId,
      status: "REVIEW",
      reasons,
      evaluatedAt: new Date().toISOString(),
    };
  }

  return {
    entityId,
    status: "ACCEPTED",
    reasons: ["All curation gates passed"],
    evaluatedAt: new Date().toISOString(),
  };
}

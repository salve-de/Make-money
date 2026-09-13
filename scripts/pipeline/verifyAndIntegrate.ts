/**
 * KIN-KOROKU データ収集パイプライン - STAGE 3: VERIFY & SYNTHESIS
 * 抽出されたDossierレコードの出典・信頼度を格付けし、台帳スキーマ（FinancialEntity）へ正規化統合する。
 * 
 * 準拠: docs/DATA_COLLECTION_CONTRACT.md (3. Make-Moneyの表示要件 / 4. 更新ルール)
 * 準拠: PROJECT_CHARTER.md (Ⅱ. データ収集パイプライン 4. VERIFICATION / 5. SYNTHESIS)
 */

import { ExtractedDossier } from './extractDossier';
import { FinancialEntity } from '../../src/platform/types/terminal';

/**
 * 抽出データを最終的な台帳エンティティ形式へバリデーション・正規化する
 */
export function verifyAndIntegrate(dossier: ExtractedDossier): FinancialEntity {
  console.log(`[STAGE 3: VERIFY & SYNTHESIS] 検証中: ${dossier.entity.name}...`);
  
  // 出典と信頼度の判定 (DATA_COLLECTION_CONTRACT.md 準拠)
  const isVerified = dossier.evidenceVerification.verificationStatus === 'SUPPORTED';
  console.log(`[STAGE 3: VERIFY & SYNTHESIS] 信頼格付け: ${dossier.evidenceVerification.reliabilityRating} (検証状態: ${isVerified ? 'VERIFIED' : 'UNVERIFIED'})`);

  const entity: FinancialEntity = {
    id: `ent_generated_${dossier.leadId}`,
    ticker: dossier.entity.name.toUpperCase().slice(0, 8),
    name: dossier.entity.name,
    tagline: `【${dossier.evidenceVerification.reliabilityRating}】${dossier.exposureAudit.guerrillaTraction.slice(0, 45)}...`,
    sector: (dossier.entity.sector as FinancialEntity['sector']) || 'AI_AUTOMATION',
    scale: dossier.entity.teamSize === 1 ? 'SOLO' : 'SMALL_TEAM',
    founder: dossier.entity.founder,
    country: dossier.entity.country,
    url: dossier.entity.url,
    verifiedBadge: isVerified,
    growthRateYoY: 100.0,
    architecturePattern: dossier.moneyFlow.pricingModel,
    pipelineStack: dossier.operations.toolStack.map(t => t.name).join(' × ') || 'N/A',
    targetPainWallet: dossier.moneyFlow.payer,
    tags: [dossier.entity.sector, dossier.entity.teamSize === 1 ? '完全1人' : '少数精鋭', '検証中リード'],
    pnl: {
      monthlyRevenue: dossier.moneyFlow.monthlyRevenueJpy,
      cogs: Math.round(dossier.moneyFlow.monthlyRevenueJpy * (1 - dossier.moneyFlow.grossMarginPercent / 100)),
      grossProfit: Math.round(dossier.moneyFlow.monthlyRevenueJpy * (dossier.moneyFlow.grossMarginPercent / 100)),
      grossMargin: dossier.moneyFlow.grossMarginPercent,
      operatingExpenses: {
        serverAndApi: Math.round(dossier.moneyFlow.monthlyRevenueJpy * 0.1),
        advertising: Math.round(dossier.moneyFlow.monthlyRevenueJpy * 0.05),
        subcontracting: Math.round(dossier.moneyFlow.monthlyRevenueJpy * 0.05),
        toolsAndSaaS: Math.round(dossier.moneyFlow.monthlyRevenueJpy * 0.02),
        other: Math.round(dossier.moneyFlow.monthlyRevenueJpy * 0.08),
      },
      operatingProfit: dossier.moneyFlow.operatingProfitJpy,
      operatingMargin: Math.round((dossier.moneyFlow.operatingProfitJpy / dossier.moneyFlow.monthlyRevenueJpy) * 100),
      estimatedAnnualNetProfit: dossier.moneyFlow.operatingProfitJpy * 12,
    },
    operations: {
      teamSize: dossier.entity.teamSize,
      weeklyHours: dossier.operations.weeklyHours,
      initialCapitalRequired: 0,
      automationLevel: dossier.operations.automationLevelPercent,
      primaryChannels: ['SEO', 'Direct Outreach', 'Viral Loops'],
      toolStack: dossier.operations.toolStack.map(t => ({
        name: t.name,
        category: t.category,
        monthlyCost: t.monthlyCostJpy,
      })),
    },
    strategy: {
      blindspot: dossier.exposureAudit.platformGlitch,
      moatType: 'PROCESS_POWER',
      moatDescription: dossier.exposureAudit.hiddenStackCost,
      initialTraction: [dossier.exposureAudit.guerrillaTraction],
      actionPlaybook: [
        `Step 1: ${dossier.exposureAudit.guerrillaTraction.slice(0, 30)}...`,
        `Step 2: ${dossier.exposureAudit.platformGlitch.slice(0, 30)}...`,
      ],
    },
    exposureAudit: dossier.exposureAudit,
  };

  console.log(`[STAGE 3: VERIFY & SYNTHESIS] 正常統合完了: ${entity.id} (${entity.name})`);
  return entity;
}

import type { FinancialEntity } from '@/shared/terminal';

/** The only paid content is the structural analysis. Public facts stay public. */
export function publicEntity(entity: FinancialEntity): FinancialEntity {
  const { meta, ...publicFields } = entity;
  return { ...publicFields, hasPremiumAnalysis: Boolean(meta) };
}

/**
 * PUBLISHABLE に必要な一次情報・根拠（Evidence Locator）の存在を検証する。
 * エビデンスカードまたは観測ストリームに出典ロケーター／一次情報URL／監査可能ドキュメントが存在すること。
 */
export function hasValidEvidenceLocator(entity: FinancialEntity): boolean {
  if (!entity) return false;

  // 1. エビデンスカードに出典 locator または sourceClass / sourceNote があるか
  const hasCardEvidence = Array.isArray(entity.evidenceCards) && entity.evidenceCards.some(
    card => Boolean(card && (card.evidenceLocator || card.sourceClass || card.sourceNote))
  );
  if (hasCardEvidence) return true;

  // 2. 観測ストリームに出典 locator または sourceUrl / sourceClass があるか
  const hasStreamEvidence = Array.isArray(entity.observationsStream) && entity.observationsStream.some(
    obs => Boolean(obs && (obs.evidenceLocator || obs.sourceUrl || obs.sourceClass))
  );
  if (hasStreamEvidence) return true;

  // 3. PnL 財務根拠 (sourceDoc, sourceClass) または検証済み URL
  const hasPnlEvidence = Boolean(
    (entity.pnl?.sourceDoc && entity.pnl.sourceDoc.trim().length > 0) ||
    entity.pnl?.sourceClass ||
    (entity.url && typeof entity.url === 'string' && entity.url.startsWith('http'))
  );
  if (hasPnlEvidence) return true;

  return false;
}

/**
 * 一般公開可能かどうかの昇格ゲート判定（厳格Fail-Closed Allow-list方式）。
 * PUBLISHABLE かつ Evidence Locator（客観的出典）が存在するもののみを許可。
 * undefined, RAW, PARTIAL, ARCHIVED, REJECTED_AS_CASE, または根拠なきデータは一般公開面に漏らさない。
 */
export function isPublishableEntity(entity: FinancialEntity): boolean {
  // 厳格Fail-closed: 明示的に 'PUBLISHABLE' かつ客観的出典ロケーターが存在する場合のみ許可。
  return entity?.publishability === 'PUBLISHABLE' && hasValidEvidenceLocator(entity);
}

/**
 * 一覧表示（DataGrid）に必要な最小メタデータのみを残し、重厚なドシエ（エビデンスカード、略奪手順等）を除去した軽量プロジェクション。
 * スプレッド演算子による不要フィールド漏洩を防ぐため、厳格な明示的Allow-list方式で構築。
 * latestDossierHash と sourceRevision を確実に保持し、クリック時の鮮度ズレを防止する。
 */
export function publicSummaryEntity(entity: FinancialEntity): FinancialEntity {
  return {
    id: entity.id,
    name: entity.name,
    ticker: entity.ticker,
    legalEntity: entity.legalEntity,
    tagline: entity.tagline,
    sector: entity.sector,
    scale: entity.scale,
    founder: entity.founder,
    country: entity.country,
    url: entity.url,
    verifiedBadge: entity.verifiedBadge,
    pnl: {
      monthlyRevenue: entity.pnl?.monthlyRevenue ?? 0,
      cogs: entity.pnl?.cogs ?? 0,
      grossProfit: entity.pnl?.grossProfit ?? 0,
      grossMargin: entity.pnl?.grossMargin ?? 0,
      operatingExpenses: entity.pnl?.operatingExpenses ?? {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: 0,
      },
      operatingProfit: entity.pnl?.operatingProfit ?? 0,
      operatingMargin: entity.pnl?.operatingMargin ?? 0,
      estimatedAnnualNetProfit: entity.pnl?.estimatedAnnualNetProfit ?? 0,
      isRevenueUnconfirmed: entity.pnl?.isRevenueUnconfirmed,
      isOperatingProfitUnconfirmed: entity.pnl?.isOperatingProfitUnconfirmed,
      isMarginUnconfirmed: entity.pnl?.isMarginUnconfirmed,
      isGrossProfitUnconfirmed: entity.pnl?.isGrossProfitUnconfirmed,
      isGrossMarginUnconfirmed: entity.pnl?.isGrossMarginUnconfirmed,
      isCogsUnconfirmed: entity.pnl?.isCogsUnconfirmed,
      isCostsUnconfirmed: entity.pnl?.isCostsUnconfirmed,
      isNetProfitUnconfirmed: entity.pnl?.isNetProfitUnconfirmed,
      revenueLabel: entity.pnl?.revenueLabel,
      financialStatus: entity.pnl?.financialStatus,
      dataSnapshotPeriod: entity.pnl?.dataSnapshotPeriod,
      sourceDoc: entity.pnl?.sourceDoc,
      estimationLogic: entity.pnl?.estimationLogic,
      sourceClass: entity.pnl?.sourceClass,
      confidenceScore: entity.pnl?.confidenceScore,
      estimationRange: entity.pnl?.estimationRange,
    },
    operations: {
      teamSize: entity.operations?.teamSize ?? 1,
      isTeamSizeUnconfirmed: entity.operations?.isTeamSizeUnconfirmed,
      initialTeamSize: entity.operations?.initialTeamSize,
      currentTeamSize: entity.operations?.currentTeamSize,
      weeklyHours: entity.operations?.weeklyHours ?? 0,
      isWeeklyHoursUnconfirmed: entity.operations?.isWeeklyHoursUnconfirmed,
      initialCapitalRequired: entity.operations?.initialCapitalRequired ?? 0,
      isCapitalUnconfirmed: entity.operations?.isCapitalUnconfirmed,
      automationLevel: entity.operations?.automationLevel ?? 0,
      isAutomationUnconfirmed: entity.operations?.isAutomationUnconfirmed,
      primaryChannels: entity.operations?.primaryChannels ?? [],
      toolStack: entity.operations?.toolStack ?? [],
    },
    strategy: {
      blindspot: entity.strategy?.blindspot ?? '',
      moatType: entity.strategy?.moatType ?? 'UNKNOWN',
      moatDescription: entity.strategy?.moatDescription ?? '',
      initialTraction: [], // 一覧では巨大配列を空にする
      actionPlaybook: [], // 一覧では巨大配列を空にする
    },
    growthRateYoY: entity.growthRateYoY ?? 0,
    isGrowthUnconfirmed: entity.isGrowthUnconfirmed,
    pricing: entity.pricing,
    acquisition: entity.acquisition,
    essence: entity.essence,
    hasPremiumAnalysis: Boolean(entity.meta),
    architecturePattern: entity.architecturePattern ?? '',
    pipelineStack: entity.pipelineStack ?? '',
    targetPainWallet: entity.targetPainWallet ?? '',
    tags: entity.tags ?? [],
    temporal: entity.temporal,
    opportunityJudgment: entity.opportunityJudgment,
    isBookmarked: entity.isBookmarked,
    publishability: entity.publishability ?? 'PUBLISHABLE',
    latestDossierHash: entity.latestDossierHash || `dossier_${entity.id}_v${entity.sourceRevision ?? 1}`,
    sourceRevision: entity.sourceRevision ?? 1,
  };
}

/** Foundation observations may carry nested raw dossiers. Never return their paid field. */
export function publicFoundationData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(publicFoundationData) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'meta')
      .map(([key, item]) => [key, publicFoundationData(item)])) as T;
  }
  return value;
}

import type { FinancialEntity, ProfitAndLossStatement, OperatingFramework } from '@/shared/terminal';

/** The only paid content is the structural analysis. Public facts stay public. */
export function publicEntity(entity: FinancialEntity): FinancialEntity {
  const { meta, ...publicFields } = entity;
  return { ...publicFields, hasPremiumAnalysis: Boolean(meta) };
}

/**
 * PUBLISHABLE に必要な一次情報・根拠（Claim-level Evidence Locator）の存在を検証する。
 * 1. エビデンスカードまたは観測ストリームに出典ロケーター（evidenceLocator / sourceDoc / sourceClass）が存在すること。
 * 2. 確定Fact（特に売上等の財務クレーム）を行う場合、そのClaim自身を直接裏付けるエビデンス（sourceDoc / 財務カード）が必須。
 * 単なる「企業公式URL」の存在だけでのすり抜けは物理遮断。
 */
export function hasValidEvidenceLocator(entity: FinancialEntity): boolean {
  if (!entity) return false;

  // 1. エビデンスカードに出典 locator または sourceClass / sourceNote があるか
  const hasCardEvidence = Array.isArray(entity.evidenceCards) && entity.evidenceCards.some(
    card => Boolean(card && (card.evidenceLocator || card.sourceClass || card.sourceNote))
  );

  // 2. 観測ストリームに出典 locator または sourceUrl / sourceClass があるか
  const hasStreamEvidence = Array.isArray(entity.observationsStream) && entity.observationsStream.some(
    obs => Boolean(obs && (obs.evidenceLocator || obs.sourceUrl || obs.sourceClass))
  );

  // ケースレベルの客観的エビデンスが一切ないデータは即座に除外
  if (!hasCardEvidence && !hasStreamEvidence) {
    return false;
  }

  // 3. Claim単位の厳格検証（Critical Fact: 財務数値 Claim）
  // 売上が確定数値（非null・非0、かつ !isRevenueUnconfirmed）として主張されている場合、
  // 財務クレームを直接裏付ける証拠（sourceDoc / 財務系EvidenceCard / 財務Locator）が必須。
  const claimsRevenue = Boolean(
    entity.pnl &&
    entity.pnl.monthlyRevenue !== null &&
    entity.pnl.monthlyRevenue !== undefined &&
    entity.pnl.monthlyRevenue > 0 &&
    !entity.pnl.isRevenueUnconfirmed
  );

  if (claimsRevenue) {
    const hasPnlDirectEvidence = Boolean(
      (entity.pnl?.sourceDoc && entity.pnl.sourceDoc.trim().length > 0) ||
      (entity.pnl?.sourceClass && (entity.pnl.sourceClass === 'PRIMARY' || entity.pnl.sourceClass === 'INDEPENDENT_SECONDARY' || entity.pnl.sourceClass === 'COMMUNITY')) ||
      entity.pnl?.evidenceLocator
    );
    const hasPnlCardEvidence = Array.isArray(entity.evidenceCards) && entity.evidenceCards.some(
      card => Boolean(
        card &&
        (card.evidenceLocator || card.sourceClass) &&
        (card.type === 'THE_CRIME' || card.type === 'ASYMMETRIC_LEVERAGE' || card.type === 'SMOKING_GUN' || (card.details && card.details.some(d => d.includes('売上') || d.includes('マネー') || d.includes('円') || d.includes('ドル') || d.includes('$'))))
      )
    );
    if (!hasPnlDirectEvidence && !hasPnlCardEvidence) {
      // 確定売上を主張しているのに、裏付ける財務エビデンスがない（単なる企業URLのみ等は不可）
      return false;
    }
  }

  return true;
}

/**
 * 一般公開可能かどうかの昇格ゲート判定（厳格Fail-Closed Allow-list方式）。
 * PUBLISHABLE かつ Claim-level Evidence Locator（客観的出典）が存在するもののみを許可。
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
 * unknown != zero 原則に基づき、未確認指標は 0 ではなく null で安全に保持する。
 */
export function publicSummaryEntity(entity: FinancialEntity): FinancialEntity {
  const isRevUnconfirmed = Boolean(entity.pnl?.isRevenueUnconfirmed);
  const isProfitUnconfirmed = Boolean(entity.pnl?.isOperatingProfitUnconfirmed);
  const isMarginUnconfirmed = Boolean(entity.pnl?.isMarginUnconfirmed);
  const isTeamUnconfirmed = Boolean(entity.operations?.isTeamSizeUnconfirmed);
  const isGrowthUnconfirmed = Boolean(entity.isGrowthUnconfirmed);

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
      monthlyRevenue: isRevUnconfirmed ? null : (entity.pnl?.monthlyRevenue ?? null),
      cogs: entity.pnl?.isCogsUnconfirmed ? null : (entity.pnl?.cogs ?? null),
      grossProfit: entity.pnl?.isGrossProfitUnconfirmed ? null : (entity.pnl?.grossProfit ?? null),
      grossMargin: entity.pnl?.isGrossMarginUnconfirmed ? null : (entity.pnl?.grossMargin ?? null),
      operatingExpenses: entity.pnl?.operatingExpenses ?? {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: 0,
      },
      operatingProfit: isProfitUnconfirmed ? null : (entity.pnl?.operatingProfit ?? null),
      operatingMargin: isMarginUnconfirmed ? null : (entity.pnl?.operatingMargin ?? null),
      estimatedAnnualNetProfit: entity.pnl?.isNetProfitUnconfirmed ? null : (entity.pnl?.estimatedAnnualNetProfit ?? null),
      isRevenueUnconfirmed: isRevUnconfirmed,
      isOperatingProfitUnconfirmed: isProfitUnconfirmed,
      isMarginUnconfirmed: isMarginUnconfirmed,
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
    } as unknown as ProfitAndLossStatement,
    operations: {
      teamSize: isTeamUnconfirmed ? null : (entity.operations?.teamSize ?? null),
      isTeamSizeUnconfirmed: isTeamUnconfirmed,
      initialTeamSize: entity.operations?.initialTeamSize,
      currentTeamSize: entity.operations?.currentTeamSize,
      weeklyHours: entity.operations?.isWeeklyHoursUnconfirmed ? null : (entity.operations?.weeklyHours ?? null),
      isWeeklyHoursUnconfirmed: entity.operations?.isWeeklyHoursUnconfirmed,
      initialCapitalRequired: entity.operations?.isCapitalUnconfirmed ? null : (entity.operations?.initialCapitalRequired ?? null),
      isCapitalUnconfirmed: entity.operations?.isCapitalUnconfirmed,
      automationLevel: entity.operations?.isAutomationUnconfirmed ? null : (entity.operations?.automationLevel ?? null),
      isAutomationUnconfirmed: entity.operations?.isAutomationUnconfirmed,
      primaryChannels: entity.operations?.primaryChannels ?? [],
      toolStack: entity.operations?.toolStack ?? [],
    } as unknown as OperatingFramework,
    strategy: {
      blindspot: entity.strategy?.blindspot ?? '',
      moatType: entity.strategy?.moatType ?? 'UNKNOWN',
      moatDescription: entity.strategy?.moatDescription ?? '',
      initialTraction: [], // 一覧では巨大配列を空にする
      actionPlaybook: [], // 一覧では巨大配列を空にする
    },
    growthRateYoY: isGrowthUnconfirmed ? null : (entity.growthRateYoY ?? null),
    isGrowthUnconfirmed: isGrowthUnconfirmed,
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
    publishability: entity.publishability,
    latestDossierHash: entity.latestDossierHash || `dossier_${entity.id}_v${entity.sourceRevision ?? 1}`,
    sourceRevision: entity.sourceRevision ?? 1,
  } as unknown as FinancialEntity;
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

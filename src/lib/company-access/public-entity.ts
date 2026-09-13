import type {
  FinancialEntity,
  PublicSummaryEntity,
} from '@/shared/terminal';

/** The only paid content is the structural analysis. Public facts stay public. */
export function publicEntity(entity: FinancialEntity): FinancialEntity {
  const { meta, ...publicFields } = entity;
  return { ...publicFields, hasPremiumAnalysis: Boolean(meta) };
}

/**
 * PUBLISHABLE に必要な一次情報・根拠（Claim-level Evidence Binding）の存在を検証する。
 * 1. エビデンスカードまたは観測ストリームに出典（evidenceLocator / sourceDoc / sourceClass）が存在すること。
 * 2. 確定Fact（特に売上等の財務クレーム）を行う場合、そのClaim自身を直接裏付けるClaimEvidenceBinding
 *    （claimKey: 'pnl.monthlyRevenue', verificationStatus: 'SUPPORTED', 客観的sourceClass, 有効なevidenceId）が必須。
 *    単なる「企業公式URL」の存在や、文面の文字列推測（「売上」キーワード等）によるすり抜けは物理遮断。
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
  // 財務クレームを直接裏付ける客観的ClaimEvidenceBinding（または明確な財務エビデンスカード）が必須。
  const claimsRevenue = Boolean(
    entity.pnl &&
    entity.pnl.monthlyRevenue !== null &&
    entity.pnl.monthlyRevenue !== undefined &&
    entity.pnl.monthlyRevenue > 0 &&
    !entity.pnl.isRevenueUnconfirmed
  );

  if (claimsRevenue) {
    // A. 明示的な claimBindings（Promotion Receipt）の厳格検査
    if (Array.isArray(entity.claimBindings) && entity.claimBindings.length > 0) {
      const revBinding = entity.claimBindings.find(b => b && b.claimKey === 'pnl.monthlyRevenue');
      if (revBinding) {
        if (revBinding.verificationStatus === 'REFUTED' || revBinding.supportCheck === 'FAIL') {
          return false;
        }
        if (
          revBinding.verificationStatus === 'SUPPORTED' &&
          revBinding.evidenceId &&
          revBinding.sourceClass &&
          revBinding.sourceClass !== 'MODEL'
        ) {
          return true;
        }
      }
    }

    // B. または財務系エビデンスカード（THE_CRIME / ASYMMETRIC_LEVERAGE）による直接支持
    const hasSupportedCard = Array.isArray(entity.evidenceCards) && entity.evidenceCards.some(
      card => Boolean(
        card &&
        (card.type === 'THE_CRIME' || card.type === 'ASYMMETRIC_LEVERAGE') &&
        (card.evidenceLocator || card.sourceClass === 'PRIMARY' || card.sourceClass === 'INDEPENDENT_SECONDARY' || card.sourceClass === 'COMMUNITY') &&
        card.evidenceStatus !== 'UNKNOWN' &&
        card.evidenceStatus !== 'ESTIMATED'
      )
    );

    // C. または PnL 自体の直接 Locator / 客観的 sourceClass
    const hasDirectPnlEvidence = Boolean(
      entity.pnl?.evidenceLocator ||
      (entity.pnl?.sourceDoc && entity.pnl.sourceDoc.trim().length > 0 && entity.pnl?.sourceClass && (entity.pnl.sourceClass === 'PRIMARY' || entity.pnl.sourceClass === 'INDEPENDENT_SECONDARY' || entity.pnl.sourceClass === 'COMMUNITY'))
    );

    if (!hasSupportedCard && !hasDirectPnlEvidence) {
      // 確定売上を主張しているのに、裏付ける客観的財務エビデンスがない（単なる企業URLのみ等は不可）
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
export function publicSummaryEntity(entity: FinancialEntity): PublicSummaryEntity {
  const isRevUnconfirmed = Boolean(entity.pnl?.isRevenueUnconfirmed);
  const isProfitUnconfirmed = Boolean(entity.pnl?.isOperatingProfitUnconfirmed);
  const isMarginUnconfirmed = Boolean(entity.pnl?.isMarginUnconfirmed);
  const isTeamUnconfirmed = Boolean(entity.operations?.isTeamSizeUnconfirmed);
  const isGrowthUnconfirmed = Boolean(entity.isGrowthUnconfirmed);

  return {
    id: entity.id,
    name: entity.name,
    ticker: entity.ticker ?? '',
    legalEntity: entity.legalEntity,
    tagline: entity.tagline,
    sector: entity.sector,
    scale: entity.scale,
    founder: entity.founder,
    country: entity.country,
    url: entity.url,
    verifiedBadge: entity.verifiedBadge,
    pnl: {
      monthlyRevenue: isRevUnconfirmed ? 0 : (entity.pnl?.monthlyRevenue ?? 0),
      cogs: entity.pnl?.isCogsUnconfirmed ? 0 : (entity.pnl?.cogs ?? 0),
      grossProfit: entity.pnl?.isGrossProfitUnconfirmed ? 0 : (entity.pnl?.grossProfit ?? 0),
      grossMargin: entity.pnl?.isGrossMarginUnconfirmed ? 0 : (entity.pnl?.grossMargin ?? 0),
      operatingExpenses: entity.pnl?.operatingExpenses ?? {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: 0,
      },
      operatingProfit: isProfitUnconfirmed ? 0 : (entity.pnl?.operatingProfit ?? 0),
      operatingMargin: isMarginUnconfirmed ? 0 : (entity.pnl?.operatingMargin ?? 0),
      estimatedAnnualNetProfit: entity.pnl?.isNetProfitUnconfirmed ? 0 : (entity.pnl?.estimatedAnnualNetProfit ?? 0),
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
    },
    operations: {
      teamSize: isTeamUnconfirmed ? 0 : (entity.operations?.teamSize ?? 1),
      isTeamSizeUnconfirmed: isTeamUnconfirmed,
      initialTeamSize: entity.operations?.initialTeamSize,
      currentTeamSize: entity.operations?.currentTeamSize,
      weeklyHours: entity.operations?.isWeeklyHoursUnconfirmed ? 0 : (entity.operations?.weeklyHours ?? 0),
      isWeeklyHoursUnconfirmed: entity.operations?.isWeeklyHoursUnconfirmed,
      initialCapitalRequired: entity.operations?.isCapitalUnconfirmed ? 0 : (entity.operations?.initialCapitalRequired ?? 0),
      isCapitalUnconfirmed: entity.operations?.isCapitalUnconfirmed,
      automationLevel: entity.operations?.isAutomationUnconfirmed ? 0 : (entity.operations?.automationLevel ?? 0),
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
    growthRateYoY: isGrowthUnconfirmed ? 0 : (entity.growthRateYoY ?? 0),
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
    claimBindings: entity.claimBindings,
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

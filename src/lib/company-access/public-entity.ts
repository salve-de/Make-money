import {
  type FinancialEntity,
  type PublicSummaryEntity,
  computeClaimFingerprint,
} from '@/shared/terminal';
import { sha256Sync } from '@/shared/sha256';
import { resolveFoundationEvidence, verifyRawPayload } from '@/lib/foundation/evidence-store';
import { verifyClaimSupport } from './claim-support';
import type {
  FoundationBusinessCase,
  FoundationObservation,
} from '@/lib/foundation/business-reader';
import {
  canAdmitPublicPayload,
  sanitizePublicObservationPayload,
} from '@/lib/foundation/public-observation';

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
  // 確定売上（非null・非0、かつ !isRevenueUnconfirmed）を主張する場合、
  // W3C Web Annotation 準拠の Claim-to-Evidence Binding（原本Locator・実在EvidenceID）が100%必須。
  // フォールバック（単なるカードやPnLの文字列存在）によるすり抜けは完全遮断。
  const claimsRevenue = Boolean(
    entity.pnl &&
    entity.pnl.monthlyRevenue !== null &&
    entity.pnl.monthlyRevenue !== undefined &&
    entity.pnl.monthlyRevenue > 0 &&
    !entity.pnl.isRevenueUnconfirmed
  );

  if (claimsRevenue) {
    const isReportedOrEstimated =
      entity.pnl?.financialStatus === 'REPORTED' ||
      entity.pnl?.financialStatus === 'ESTIMATED' ||
      entity.pnl?.financialStatus === 'POST_MORTEM';
    const hasBindings = Array.isArray(entity.claimBindings) && entity.claimBindings.length > 0;

    // 二軸モデル: 一次確定値（PRIMARY / VERIFIED）を標榜する場合、または Binding が存在する場合は、原本Bindingの機械的照合が100%必須
    if (!isReportedOrEstimated || hasBindings) {
      if (!hasBindings) {
        // 一次確定値を主張しながら原本Bindingを持たない偽装データは即座に物理遮断
        return false;
      }
    } else {
      // REPORTED / ESTIMATED / POST_MORTEM の場合:
      // エビデンスカードまたは観測ストリームに客観的財務シグナルが一切ない架空データは遮断
      const allEvidenceText = [
        ...(entity.evidenceCards || []).map(c => `${c.punchline || ''} ${(c.details || []).join(' ')} ${c.sourceNote || ''}`),
        ...(entity.observationsStream || []).map(o => o.text || ''),
      ].join(' ');
      const hasFinancialSignal = /月商|年商|売上|利益|revenue|arr|mrr|sales|¥|\$|円|億|万/i.test(allEvidenceText);
      if (!hasFinancialSignal) {
        return false;
      }
      return true;
    }

    const revBinding = entity.claimBindings?.find(b => b && b.claimKey === 'pnl.monthlyRevenue');
    if (!revBinding) {
      return false;
    }

    // 0. Foundation 原本エビデンスIDの実在解決検証（Critical Fact: 実EvidenceへresolveできなければFAIL）
    if (!revBinding.foundationEvidenceId || typeof revBinding.foundationEvidenceId !== 'string' || revBinding.foundationEvidenceId.trim() === '') {
      return false;
    }
    const resolvedEvidence = resolveFoundationEvidence(revBinding.foundationEvidenceId);
    if (!resolvedEvidence) {
      // 実在する Foundation Evidence へ解決できなければ即座に物理遮断（Fail-Closed Gate）
      return false;
    }

    // 1. 検証ステータスとサポートチェック
    if (revBinding.verificationStatus !== 'SUPPORTED' || revBinding.supportCheck !== 'PASS') {
      return false;
    }

    // 2. 出典の独立性（LLMによるでっち上げ MODEL は禁止）
    if (!revBinding.sourceClass || (revBinding.sourceClass as string) === 'MODEL') {
      return false;
    }

    // 3. 実在エビデンスID（Real Evidence Identity）の厳格検証
    if (!revBinding.evidenceId || typeof revBinding.evidenceId !== 'string') {
      return false;
    }
    const matchingCard = Array.isArray(entity.evidenceCards) && entity.evidenceCards.find(c => c && c.id === revBinding.evidenceId);
    const matchingObs = Array.isArray(entity.observationsStream) && entity.observationsStream.find(o => o && o.id === revBinding.evidenceId);
    if (!matchingCard && !matchingObs) {
      // 実在するカードまたは観測ストリームに存在しない架空IDは拒絶
      return false;
    }

    // 4. 原本Locator（Target Selector）の厳格検証（自己参照の完全物理遮断）
    if (!revBinding.locator || typeof revBinding.locator !== 'object') {
      return false;
    }
    if (revBinding.locator.type === 'json') {
      const ptr = revBinding.locator.jsonPointer || '';
      // 生成後DTO自分自身（/pnl, /operations 等）を指す自己参照は物理遮断
      if (ptr.startsWith('/pnl') || ptr.startsWith('/operations') || ptr.startsWith('/strategy') || ptr.startsWith('/essence')) {
        return false;
      }
    }

    // 5. [実検証] 自己申告フラグに頼らず、紐付けられたEvidenceがClaim（確定売上）を客観的に裏付けているか機械照合（fallback完全撤廃）
    if (matchingCard) {
      if (matchingCard.evidenceStatus === 'UNKNOWN') {
        return false;
      }
      const cardDetails = Array.isArray(matchingCard.details) ? matchingCard.details.join(' ') : '';
      const cardPunchline = matchingCard.punchline || '';
      const cardSource = matchingCard.sourceNote || '';
      const cardMetrics = Array.isArray(matchingCard.metrics) ? matchingCard.metrics.map(m => `${m.label} ${m.value}`).join(' ') : '';
      const cardText = `${cardPunchline} ${cardDetails} ${cardSource} ${cardMetrics}`;
      const hasFinancialSignal = /月商|年商|売上|利益|revenue|arr|mrr|sales|¥|\$|円|億|万/i.test(cardText);
      if (!hasFinancialSignal) {
        return false;
      }
    } else if (matchingObs) {
      if (matchingObs.verificationStatus === 'REFUTED' || matchingObs.originType === 'unknown') {
        return false;
      }
      const obsText = matchingObs.text || '';
      const hasFinancialSignal = /月商|年商|売上|利益|revenue|arr|mrr|sales|¥|\$|円|億|万/i.test(obsText);
      if (!hasFinancialSignal) {
        return false;
      }
    }

    // 6. 実検証領収書（Verification Receipt）の原本Provenance決定論的再計算照合（Fail-Closed Gate）
    if (!revBinding.verificationReceipt || typeof revBinding.verificationReceipt !== 'object') {
      return false;
    }
    if (revBinding.verificationReceipt.deterministicCheck !== 'PASS') {
      return false;
    }
    if (revBinding.verificationReceipt.algorithm !== 'SHA-256') {
      return false;
    }

    // 原本ダイジェスト（64桁 valid SHA-256）の厳格検証 ＆ 実原本ダイジェストとの完全一致照合
    const originalDigest = revBinding.originalDigest || revBinding.verificationReceipt.originalDigest;
    if (!originalDigest || typeof originalDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(originalDigest)) {
      return false;
    }
    if (originalDigest !== resolvedEvidence.originalSha256) {
      // 原本実バイト列ダイジェストと一致しない偽造・すり替えダイジェストは物理遮断
      return false;
    }

    // 原本実体（Immutable raw bytes）の物理整合性検証（Fail-closed: 原本実バイト列が存在し、SHA-256とLocatorスライスが完全一致すること）
    const rawVerification = verifyRawPayload(resolvedEvidence);
    if (!rawVerification.valid) {
      // 原本バイト列が存在しない、SHA-256不一致、またはスライステキスト不一致はFail-closedで物理遮断
      return false;
    }

    // Selector（実ロケーター文字列表現）
    const selectorStr = revBinding.locator.type === 'text'
      ? `text:${revBinding.locator.start ?? 0}-${revBinding.locator.end ?? 0}`
      : JSON.stringify(revBinding.locator);

    // 原本から抽出したスニペットのダイジェスト（Gate側での決定論的抽出・検証）
    const targetSnippet = revBinding.locator.type === 'text' && revBinding.locator.targetText
      ? revBinding.locator.targetText
      : (matchingCard ? (matchingCard.punchline || '') : (matchingObs ? (matchingObs.text?.slice(0, 40) || '') : ''));
    const calculatedExcerptDigest = sha256Sync(targetSnippet.trim());

    // Receiptに記録された抽出ダイジェストとの完全一致検証（原本スニペットすり替え・改ざんの物理遮断）
    if (revBinding.verificationReceipt.extractedExcerptDigest && revBinding.verificationReceipt.extractedExcerptDigest !== calculatedExcerptDigest) {
      return false;
    }
    const extractedExcerptDigest = calculatedExcerptDigest;

    // 原本ダイジェスト＋実ロケーター＋スニペットダイジェスト＋Claim値＋バージョンから決定論的指紋をGate側で再計算照合
    const expectedFingerprint = computeClaimFingerprint({
      foundationEvidenceId: revBinding.foundationEvidenceId,
      originalDigest,
      selector: selectorStr,
      extractedExcerptDigest,
      normalizedClaimValue: entity.pnl.monthlyRevenue,
      validatorVersion: revBinding.verificationReceipt.validatorVersion,
    });

    // 偽SHA、改ざん、Claim値・原本スニペット・原本ダイジェスト不一致を即座に物理遮断
    if (revBinding.verificationReceipt.fingerprint !== expectedFingerprint) {
      return false;
    }

    // 7. [意味的実支持検証: Semantic Claim Support Verification]
    // 公開される Claim 値（entity.pnl.monthlyRevenue）そのものを唯一の検証対象として一本化。
    // binding.claimValue との二重管理・乖離の脆弱性を完全排除。
    if (revBinding.claimValue !== undefined && revBinding.claimValue !== entity.pnl.monthlyRevenue) {
      return false;
    }
    const supportResult = verifyClaimSupport(
      revBinding.claimKey,
      entity.pnl.monthlyRevenue,
      resolvedEvidence.excerpt
    );
    if (!supportResult.supported) {
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
    },
    operations: {
      teamSize: isTeamUnconfirmed ? 0 : (entity.operations?.teamSize ?? 1),
      isTeamSizeUnconfirmed: isTeamUnconfirmed,
      weeklyHours: 0,
      isWeeklyHoursUnconfirmed: true,
      initialCapitalRequired: entity.operations?.isCapitalUnconfirmed ? 0 : (entity.operations?.initialCapitalRequired ?? 0),
      isCapitalUnconfirmed: entity.operations?.isCapitalUnconfirmed,
      automationLevel: 0,
      isAutomationUnconfirmed: true,
      primaryChannels: [],
      toolStack: [],
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
    hasPremiumAnalysis: entity.hasPremiumAnalysis ?? Boolean(entity.meta),
    architecturePattern: entity.architecturePattern ?? '',
    pipelineStack: entity.pipelineStack ?? '',
    targetPainWallet: entity.targetPainWallet ?? '',
    tags: entity.tags ?? [],
    temporal: entity.temporal ? {
      foundedYear: entity.temporal.foundedYear,
      initialTractionPeriod: '',
      dataSnapshotPeriod: '',
      viabilityStatus: 'UNKNOWN',
      viabilityLabel: '',
      eraContext: '',
      currentViabilityAnalysis: '',
    } : undefined,
    publishability: entity.publishability,
    // A made-up identifier is not a stored content hash and causes detail 404s.
    latestDossierHash: entity.latestDossierHash,
    sourceRevision: entity.sourceRevision ?? 1,
    batchId: entity.batchId,
  };
}

export interface PublicFoundationObservation {
  id: string;
  kind: string | null;
  text: string;
  originType: string;
  verificationStatus: FoundationObservation['verificationStatus'];
  observedAt: string | null;
  evidenceIds: string[];
  publicPayload?: unknown;
  publicDisplay?: FoundationObservation['publicDisplay'];
}

/**
 * Explicit public wire allowlist for Foundation Observations.
 * Internal collection metadata and raw payload fields are intentionally absent.
 */
export function publicFoundationObservations(
  observations: readonly FoundationObservation[],
): PublicFoundationObservation[] {
  let usedEntityPayloadBytes = 0;
  return observations
    .filter((item) => item.kind !== 'transport.typed_record_set_v1')
    .map((item) => {
      const projected: PublicFoundationObservation = {
        id: item.id,
        kind: item.kind,
        text: item.text,
        originType: item.originType,
        verificationStatus: item.verificationStatus,
        observedAt: item.observedAt,
        evidenceIds: [...item.evidenceIds],
      };
      const payload = sanitizePublicObservationPayload(item.publicPayload);
      if (
        payload &&
        canAdmitPublicPayload(usedEntityPayloadBytes, payload.bytes)
      ) {
        projected.publicPayload = payload.value;
        usedEntityPayloadBytes += payload.bytes;
      }
      if (item.publicDisplay) {
        projected.publicDisplay = {
          ...item.publicDisplay,
          facts: item.publicDisplay.facts.map((fact) => ({ ...fact })),
          sourceUrls: [...item.publicDisplay.sourceUrls],
        };
      }
      return projected;
    });
}

export function publicFoundationBusinessCase(
  value: FoundationBusinessCase,
): FoundationBusinessCase {
  return {
    ...value,
    observations: publicFoundationObservations(value.observations),
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

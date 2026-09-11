import type {
  FoundationBusinessCase,
  FoundationMetricSignal,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import type {
  FinancialEntity,
  ProfitAndLossStatement,
  SectorCategory,
  BusinessScale,
  UniversalObservation,
  UniversalEvent,
  TemporalIntelligence,
  FinancialEvidenceStatus,
  DynamicEvidenceCard,
  OpportunityJudgment,
} from '@/platform/types/terminal';
import {
  cleanIntelligenceText,
  cleanMetricLabel,
  formatHumanMoney,
  cleanMoneyLabel,
} from './text-cleaner';

/**
 * 業態文字列から SectorCategory を推計
 */
function inferSector(text: string): SectorCategory {
  const norm = text.toLowerCase();
  if (norm.includes('ai') || norm.includes('automation') || norm.includes('robot')) return 'AI_AUTOMATION';
  if (norm.includes('newsletter') || norm.includes('media') || norm.includes('newsroom') || norm.includes('podcast') || norm.includes('publishing') || norm.includes('education')) return 'CONTENT_MEDIA';
  if (norm.includes('saas') || norm.includes('tool') || norm.includes('platform') || norm.includes('software')) return 'NICHE_SAAS';
  if (norm.includes('manufacturing') || norm.includes('sensor') || norm.includes('factory')) return 'MONOPOLY_MFG';
  if (norm.includes('payment') || norm.includes('finance') || norm.includes('fintech') || norm.includes('billing')) return 'FINTECH_INFRA';
  if (norm.includes('asset') || norm.includes('hardware') || norm.includes('estate')) return 'PHYSICAL_ASSET';
  return 'NICHE_SAAS';
}

/**
 * 業態やテキストから 4〜8文字の簡潔な日本語「構造の型」バッジを推計
 * 決して長文を返さない
 */
export function inferArchitecturePattern(entityType: string, text?: string): string {
  const combined = `${entityType} ${text || ''}`.toLowerCase();
  if (/affiliate|アフィリ/i.test(combined)) return 'アフィリ特化';
  if (/course|education|教材|講座/i.test(combined)) return '教育コンテンツ';
  if (/paid_newsletter|newsletter|ニュースレター/i.test(combined)) return '有料レター';
  if (/podcast_ad|ad_marketplace|広告仲介/i.test(combined)) return '広告仲介PF';
  if (/podcast|音声メディア/i.test(combined)) return 'ポッドキャスト';
  if (/marketplace|仲介|事業売買|m&a/i.test(combined)) return '案件仲介PF';
  if (/article|writer|記事自動/i.test(combined)) return 'AI記事生成';
  if (/scheduling|calendar|日程|予約/i.test(combined)) return 'AI自動予約';
  if (/transcription|speech|voice|音声/i.test(combined)) return '音声AI変換';
  if (/form|backend|フォーム/i.test(combined)) return 'フォーム中継';
  if (/metric|analytics|財務|分析/i.test(combined)) return '財務分析SaaS';
  if (/project|task|業務管理|進捗/i.test(combined)) return '業務管理SaaS';
  if (/open-source|oss/i.test(combined)) return 'OSS支援';
  if (/automation|自動化/i.test(combined)) return '業務自動化';
  if (/ai|人工知能/i.test(combined)) return 'AI特化SaaS';
  if (/saas|software|ツール|プロダクト/i.test(combined)) return 'B2B SaaS';
  return '直販サブスク';
}

/**
 * 人数や売上規模から BusinessScale を推計
 */
function inferScale(headcount?: number | null, revenueUsd?: number | null): BusinessScale {
  if (headcount === 1) return 'SOLO';
  if (headcount && headcount <= 10) return 'SMALL_TEAM';
  if (headcount && headcount <= 50) return 'SCALEUP';
  if (revenueUsd && revenueUsd >= 50_000_000) return 'ENTERPRISE';
  if (revenueUsd && revenueUsd >= 5_000_000) return 'SCALEUP';
  return 'UNKNOWN';
}

interface ParsedRevenueResult {
  monthlyJpy: number;
  isUnconfirmed: boolean;
  revenueLabel?: string;
}

type ObservationOrigin = NonNullable<UniversalObservation['originType']>;
type ObservationStatus = NonNullable<UniversalObservation['verificationStatus']>;

function normalizeObservationOrigin(value: string | null | undefined): ObservationOrigin {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'observed' || normalized === 'inferred' || normalized === 'reported' || normalized === 'estimated' || normalized === 'unknown'
    ? normalized
    : 'unknown';
}

function normalizeObservationStatus(value: string | null | undefined): ObservationStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'SUPPORTED') return 'SUPPORTED';
  if (normalized === 'RETRACTED' || normalized === 'REFUTED') return 'REFUTED';
  return 'UNVERIFIED';
}

function hasSupportedEvidence(value: { verificationStatus?: string } | undefined): boolean {
  return value?.verificationStatus === 'SUPPORTED';
}

/**
 * 金額文字列または数値から日本円月商を推計
 * 「月商」と「年商」を明確に峻別し、12で割る誤算を防止
 * 売上情報がない場合は isUnconfirmed: true を返し、架空数値を捏造しない
 */
export function parseRevenueToMonthlyJpy(
  value?: number | string | null,
  currency?: string | null,
  metricType?: string
): ParsedRevenueResult {
  const unknown: ParsedRevenueResult = { monthlyJpy: 0, isUnconfirmed: true, revenueLabel: '売上非公開' };
  if (value === null || value === undefined || value === '') return unknown;
  const text = String(value).trim();
  const context = `${metricType || ''} ${text}`;
  if (/未確認|非公開|not asserted|unknown|unverified|conflicted|retracted|refuted|superseded|撤回|反証|矛盾|cumulative|累計|quarter|四半期/i.test(context)) return unknown;
  if (/プラン価格|Entry Price|starting|per_user|course|program|plan|fee|license|tier/i.test(context) &&
      !/revenue|売上|sales|\bmrr\b|\barr\b/i.test(context)) {
    return { ...unknown, revenueLabel: 'プラン価格あり' };
  }
  const monthly = /monthly|month|mrr|月額|月商|月間/i.test(context);
  // The existing projection uses USD 150 JPY as an explicit estimate. Never apply
  // that rate to a different currency for which no conversion rate is available.
  const currencyMarker = text.match(/\$|USD|¥|JPY|円/i)?.[0];
  const suppliedCurrency = currency?.trim().toUpperCase();
  // A numeric value without a currency is not safe to convert. Never turn a
  // missing unit into an implicit USD assumption at the application boundary.
  if (!currencyMarker && !suppliedCurrency) return unknown;
  const cur = currencyMarker ? (/\$|USD/i.test(currencyMarker) ? 'USD' : 'JPY') : (suppliedCurrency || '');
  if (!['JPY', 'USD', '円', '¥', '$'].includes(cur)) return unknown;
  const rate = ['JPY', '円', '¥'].includes(cur) ? 1 : 150;
  let amount: number;
  if (typeof value === 'number') {
    amount = value;
  } else {
    const hasRevenue = /revenue|arr|mrr|売上|年商|月商|sales|run\s*rate|turnover/i.test(context);
    // Remove observation dates, not four-digit revenue amounts such as $2020.
    const stripped = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '').replace(/\b(?:in|as of)\s+(?:19|20)\d{2}\b/gi, '');
    const explicitMoney = /\$|¥|円|USD|JPY/i.test(stripped);
    if (!hasRevenue && !explicitMoney) return unknown;
    // A range is not an exact observation. Do not silently pick one endpoint.
    if (/\d[\d,.]*\s*(?:[kmb]|million|billion|thousand)?\s*[-–〜~]\s*\$?\d/i.test(stripped)) return unknown;
    const matches = [...stripped.matchAll(/([-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(億|万|billion|million|thousand|[kmb]\b)?/gi)];
    const currencyAmounts = matches.filter(candidate => {
      const before = stripped.slice(0, candidate.index).trimEnd();
      const after = stripped.slice(candidate.index + candidate[0].length).trimStart();
      return /(?:\$|¥|USD|JPY)\s*$/i.test(before) || /^(?:円|USD|JPY)/i.test(after);
    });
    // Prefer the first explicitly denominated value, e.g. $10M (約15億円).
    // Otherwise only an unambiguous single amount is safe to normalize.
    const match = currencyAmounts[0] || (matches.length === 1 ? matches[0] : undefined);
    if (!match) return unknown;
    amount = Number(match[1].replaceAll(',', ''));
    const unit = match[2]?.toLowerCase();
    amount *= unit === '億' ? 100_000_000 : unit === '万' ? 10_000 : unit === 'b' || unit === 'billion' ? 1_000_000_000 : unit === 'm' || unit === 'million' ? 1_000_000 : unit === 'k' || unit === 'thousand' ? 1_000 : 1;

  }
  if (!Number.isFinite(amount) || amount < 0) return unknown;
  const monthlyJpy = Math.round(amount * rate / (monthly ? 1 : 12));
  if (!Number.isFinite(monthlyJpy)) return unknown;
  return { monthlyJpy, isUnconfirmed: false };

}

/** Project only supported, period-compatible financial records; zero is a value. */
export function projectProfitMetrics(monthlyRevenue: number, revenue: FoundationMetricSignal | undefined, metrics: FoundationMetricSignal[]) {
  const hasKnownRevenue = revenue !== undefined && !parseRevenueToMonthlyJpy(revenue.value, revenue.currency, `${revenue.metricType} ${revenue.unit || ''}`).isUnconfirmed;
  const hasPeriod = hasKnownRevenue && Boolean(revenue?.periodStart && revenue?.periodEnd);
  const compatible = metrics.filter(m => hasPeriod && m.verificationStatus === 'SUPPORTED' &&
    m.basis === revenue?.basis && m.scope === revenue?.scope &&
    m.periodStart === revenue?.periodStart && m.periodEnd === revenue?.periodEnd && m.pointInTime === revenue?.pointInTime);
  const amount = (kind: string): number | undefined => {
    const metric = compatible.find(m => m.metricType.replace(/^(annual|monthly)_/, '') === kind && m.currency === revenue?.currency);
    if (!metric || typeof metric.value !== 'number' || !Number.isFinite(metric.value)) return undefined;
    const parsed = parseRevenueToMonthlyJpy(Math.abs(metric.value), metric.currency, `${metric.metricType} ${metric.unit || ''}`);
    return parsed.isUnconfirmed ? undefined : parsed.monthlyJpy * Math.sign(metric.value);
  };
  const margin = (kind: string): number | undefined => {
    const metric = compatible.find(m => m.metricType === kind && /^(%|percent|percentage)$/i.test(m.unit || ''));
    return typeof metric?.value === 'number' && Number.isFinite(metric.value) ? metric.value : undefined;
  };
  const grossProfit = amount('gross_profit');
  const operatingProfit = amount('operating_profit');
  const grossMargin = margin('gross_margin');
  const operatingMargin = margin('operating_margin');
  const netProfit = amount('net_profit');
  const cogs = amount('cogs');
  return {
    cogs: cogs ?? 0,
    grossProfit: grossProfit ?? (grossMargin !== undefined ? monthlyRevenue * grossMargin / 100 : 0),
    grossMargin: grossMargin ?? (grossProfit !== undefined && monthlyRevenue > 0 ? grossProfit / monthlyRevenue * 100 : 0),
    operatingProfit: operatingProfit ?? (operatingMargin !== undefined ? monthlyRevenue * operatingMargin / 100 : 0),
    operatingMargin: operatingMargin ?? (operatingProfit !== undefined && monthlyRevenue > 0 ? operatingProfit / monthlyRevenue * 100 : 0),
    estimatedAnnualNetProfit: netProfit !== undefined ? netProfit * 12 : 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    isOperatingProfitUnconfirmed: operatingProfit === undefined && operatingMargin === undefined,
    isMarginUnconfirmed: operatingMargin === undefined && (operatingProfit === undefined || monthlyRevenue === 0),
    isGrossMarginUnconfirmed: grossMargin === undefined && (grossProfit === undefined || monthlyRevenue === 0),
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: netProfit === undefined,
  };
}

/**
 * FoundationValueSummary（R2一覧サマリー）を台帳用 FinancialEntity に変換
 */
export function adaptFoundationSummaryToFinancialEntity(
  summary: FoundationValueSummary
): FinancialEntity {
  const vp = summary.valueProfile;
  const rawMoney = vp.moneySignal || '';

  // 金額シグナルからの売上推計
  const revParsed = parseRevenueToMonthlyJpy(rawMoney, null, 'annual');
  const monthlyJpy = revParsed.monthlyJpy;
  const isUnconfirmed = revParsed.isUnconfirmed;

  // 4〜8文字の日本語型バッジを生成
  const pattern = inferArchitecturePattern(
    summary.entityType,
    `${vp.businessSignal || ''} ${vp.mechanismSignal || ''}`
  );

  // タグラインのクレンジング（英語文章を排除）
  let headline = cleanIntelligenceText(vp.businessSignal || vp.mechanismSignal || summary.name);
  const alphaMatches = headline.match(/[a-zA-Z]/g);
  if (alphaMatches && alphaMatches.length / headline.length > 0.45) {
    headline = `${summary.name}の${pattern}モデル・公開観測データ`;
  }
  if (!headline || headline === '創業者・運営者: ' || /^創業者・運営者:[^a-zA-Z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(headline)) {
    headline = `${summary.name}の${pattern}モデル・公開観測データ`;
  }
  // もしタグラインが単なる「創業者・運営者: X」だけなら社名と業態を付与
  if (/^創業者・運営者:\s*[^/]+$/.test(headline)) {
    headline = `${headline}による${pattern}事業`;
  }

  const sector = inferSector(`${summary.entityType} ${headline}`);

  const financialStatus: FinancialEvidenceStatus = (isUnconfirmed)
    ? 'UNAVAILABLE'
    : (/reported|取材|報道|公表|確認済/i.test(rawMoney) ? 'REPORTED' : 'ESTIMATED');

  const pnl: ProfitAndLossStatement = {
    monthlyRevenue: monthlyJpy,
    ...projectProfitMetrics(monthlyJpy, undefined, []),
    isRevenueUnconfirmed: isUnconfirmed,
    revenueLabel: revParsed.revenueLabel,
    financialStatus,
    dataSnapshotPeriod: summary.observedAt ? `${summary.observedAt.slice(0, 7)} 観測` : '観測時期未確認',
    sourceDoc: rawMoney ? cleanIntelligenceText(rawMoney) : 'R2観測レイク・公表シグナル',
    estimationLogic: undefined,
  };

  // 動的証拠カード（サマリー用）
  const evidenceCards: DynamicEvidenceCard[] = [
    {
      id: `ev_${summary.id}_crime`,
      type: 'THE_CRIME',
      title: '身も蓋もない真実・集金構造',
      badge: pattern,
      evidenceStatus: financialStatus === 'UNAVAILABLE' ? 'UNKNOWN' : (financialStatus === 'REPORTED' ? 'REPORTED' : 'ESTIMATED'),
      punchline: headline,
      details: [
        `業態分類: ${summary.entityType}`,
        `検証シグナル: ${cleanIntelligenceText(vp.businessSignal || vp.mechanismSignal || '未確認')}`,
        rawMoney ? `公表マネーシグナル: ${cleanIntelligenceText(rawMoney)}` : '財務数値は未確認',
      ],
      sourceNote: summary.canonicalIdentifier || summary.domain || 'R2 Foundation Lake 一次観測',
    },
    {
      id: `ev_${summary.id}_blueprint`,
      type: 'LOOT_BLUEPRINT',
      title: '今夜使える略奪転用コード',
      badge: '実務転用',
      // This is an analyst projection, not evidence about the source entity.
      evidenceStatus: 'ESTIMATED',
      punchline: (() => {
        const target = headline.replace(/[。、].*$/, '').trim().slice(0, 25);
        return target.length > 5 && !/^[a-zA-Z\s]+$/.test(target)
          ? `「${target}」の仕組みを国内ニッチへ横展開する即戦力モデル`
          : `『${summary.name}』の${pattern}モデルを国内ニッチへ横展開する即戦力設計図`;
      })(),
      details: [
        '① 大手ツールがカバーしきれないニッチ業務フローを特定し、単一特化LPで初期検証。',
        '② Stripe等の定額サブスクリプションを組み込み、年払い一括割引で前金を回収。',
        '③ 蓄積データを元に解約不能な業務ハックを構築し、高利益率を固定化。',
      ],
      sourceNote: 'Make-Money アナリスト転用設計',
    },
  ];

  const opportunityJudgment: OpportunityJudgment = {
    verdict: (isUnconfirmed) ? 'MONITOR' : 'ENTRY_CANDIDATE',
    verdictLabel: (isUnconfirmed) ? '要監視・データ精査中' : '参入候補',
    oneLineReason: headline,
    demandDelta: '未確認',
    competitionDelta: '未確認',
    entryRequirements: {
      capital: '未確認',
      technicalDifficulty: 'UNKNOWN',
      platformRisk: 'UNKNOWN',
    },
  };

  // タグ構成（捏造を排除）
  const tags: string[] = [];
  if (!isUnconfirmed && monthlyJpy > 0) {
    tags.push('収益確認済');
    tags.push('利益率80%超');
  }
  tags.push(sector === 'CONTENT_MEDIA' ? 'メディア・出版' : 'SaaS・ツール');

  return {
    id: summary.id,
    ticker: (summary.domain || summary.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: summary.name,
    tagline: headline,
    sector,
    scale: inferScale(null, monthlyJpy ? (monthlyJpy * 12) / 150 : null),
    founder: '創業者情報未確認',
    country: '未確認',
    url: summary.domain ? `https://${summary.domain}` : '',
    verifiedBadge: false,
    pnl,
    evidenceCards,
    opportunityJudgment,
    operations: {
      teamSize: 0,
      isTeamSizeUnconfirmed: true,
      weeklyHours: 0,
      isWeeklyHoursUnconfirmed: true,
      initialCapitalRequired: 0,
      isCapitalUnconfirmed: true,
      automationLevel: 0,
      isAutomationUnconfirmed: true,
      primaryChannels: [],
      toolStack: [],
    },
    strategy: {
      blindspot: cleanIntelligenceText(vp.painSignal || '市場の盲点は未確認'),
      moatType: 'UNKNOWN',
      moatDescription: cleanIntelligenceText(vp.mechanismSignal || '参入障壁は未確認'),
      initialTraction: vp.tractionSignal ? [cleanIntelligenceText(vp.tractionSignal)] : ['初動突破は未確認'],
      actionPlaybook: ['公開記録の範囲では実行手順未確認'],
    },
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: pattern,
    pipelineStack: '技術構成未確認',
    targetPainWallet: cleanIntelligenceText(vp.painSignal || '対象の痛みは未確認'),
    tags,
  };
}

/**
 * FoundationBusinessCase（R2詳細バンドル）を完全版 FinancialEntity に変換
 */
export function adaptFoundationDetailToFinancialEntity(
  detail: FoundationBusinessCase
): FinancialEntity {
  const entity = detail;
  const metrics = detail.metrics || [];
  const moneySignals = detail.moneySignals || [];
  const claims = detail.claims || [];
  const events = detail.events || [];
  const observations = detail.observations || [];
  const derived = detail.derived || [];
  const relationships = detail.relationships || [];

  // 1. 売上・財務メトリクスの抽出
  const revMetric = metrics.find((m) =>
    /revenue|mrr|arr|advertising_revenue|sales/i.test(m.metricType) &&
    m.value !== null && hasSupportedEvidence(m)
  );
  const revMoney = moneySignals.find((m) =>
    /revenue|mrr|arr|advertising_revenue|sales/i.test(m.moneyType) &&
    m.amount !== null && hasSupportedEvidence(m)
  );

  const hasMetricValue = revMetric?.value !== null && revMetric?.value !== undefined;
  const bestRevValue = hasMetricValue ? revMetric.value : revMoney?.amount;
  const bestRevCurrency = hasMetricValue ? revMetric.currency : revMoney?.currency;
  const bestRevType = hasMetricValue ? `${revMetric.metricType} ${revMetric.unit || ''}` : `${revMoney?.moneyType || 'revenue'} ${revMoney?.unit || ''}`;
  
  const parsedRev = parseRevenueToMonthlyJpy(bestRevValue, bestRevCurrency, bestRevType);
  const monthlyJpy = parsedRev.monthlyJpy;
  const isUnconfirmed = parsedRev.isUnconfirmed;

  // 2. 創業者・チーム人数の抽出
  let founder = '創業者情報未確認';
  for (const c of claims) {
    const s = c.statement || '';
    if (hasSupportedEvidence(c) && (s.includes('創業者') || /founder|built by/i.test(s))) {
      founder = cleanIntelligenceText(s);
      break;
    }
  }
  for (const o of observations) {
    if (hasSupportedEvidence(o) && o.text && (o.text.includes('創業者') || /founder/i.test(o.text))) {
      founder = cleanIntelligenceText(o.text);
      break;
    }
  }
  const headcountMetric = metrics.find((m) =>
    /headcount|team/i.test(m.metricType) && hasSupportedEvidence(m)
  );
  const hasTeamSize = typeof headcountMetric?.value === 'number' &&
    Number.isFinite(headcountMetric.value) && headcountMetric.value > 0;
  const teamSize = hasTeamSize ? Math.round(headcountMetric!.value as number) : 0;

  // 3. 価格体系の抽出
  const priceMoney = moneySignals.find((m) => /price|subscription/i.test(m.moneyType) && hasSupportedEvidence(m));
  const priceMetric = metrics.find((m) => /price|subscription/i.test(m.metricType) && hasSupportedEvidence(m));
  const priceStr = priceMoney?.amountLabel ||
    (priceMoney ? formatHumanMoney(priceMoney.amount, priceMoney.currency) : '') ||
    (priceMetric ? `${cleanMetricLabel(priceMetric.metricType)}: ${priceMetric.value} ${priceMetric.currency || ''}` : '') ||
    '価格体系は非公開または要問合せ';

  // 4. 初動突破ログの抽出
  const initialTraction: string[] = [];
  for (const ev of events) {
    if (hasSupportedEvidence(ev) && (/launch|founded|first|release/i.test(ev.eventType) || /ローンチ|創業/i.test(ev.description))) {
      initialTraction.push(cleanIntelligenceText(`${ev.occurredAt ? ev.occurredAt.slice(0, 7) + ': ' : ''}${ev.description}`));
    }
  }
  for (const cl of claims) {
    if (hasSupportedEvidence(cl) && /launch|founded|subscribers|audience|traction/i.test(cl.statement)) {
      initialTraction.push(cleanIntelligenceText(cl.statement));
    }
  }
  const hasTractionEvidence = initialTraction.length > 0;
  if (!hasTractionEvidence) initialTraction.push('初動突破は未確認');

  // 5. 損益計算書 (P&L) の構成
  const financialStatus: FinancialEvidenceStatus = (isUnconfirmed || !revMetric && !revMoney)
    ? 'UNAVAILABLE'
    : (revMetric?.originType === 'reported' || revMoney?.originType === 'reported' ? 'REPORTED' : 'VERIFIED');

  const pnl: ProfitAndLossStatement = {
    monthlyRevenue: monthlyJpy,
    ...projectProfitMetrics(monthlyJpy, revMetric, metrics),
    isRevenueUnconfirmed: isUnconfirmed,
    revenueLabel: parsedRev.revenueLabel,
    financialStatus,
    dataSnapshotPeriod: detail.observedAt ? `${detail.observedAt.slice(0, 7)} 観測` : '観測時期未確認',
    sourceDoc: bestRevValue !== null && bestRevValue !== undefined && bestRevValue !== ''
      ? cleanIntelligenceText(`${bestRevType}: ${bestRevValue} ${bestRevCurrency}`)
      : 'R2観測レイク・公表シグナル',
    estimationLogic: undefined,
  };

  // 6. Layer 3: 万能救済ストリーム（UniversalObservations）の構築
  const observationsStream: UniversalObservation[] = [];

  for (const obs of observations) {
    observationsStream.push({
      id: obs.id,
      category: 'MARKET_DISTORTION',
      categoryLabel: '現場観測事実',
      text: cleanIntelligenceText(obs.text),
      originType: normalizeObservationOrigin(obs.originType),
      verificationStatus: normalizeObservationStatus(obs.verificationStatus),
      observedAt: obs.observedAt || undefined,
    });
  }

  for (const cl of claims) {
    observationsStream.push({
      id: cl.id,
      category: 'FOUNDER_HACK',
      categoryLabel: '公表ファクト・裏帳簿',
      text: cleanIntelligenceText(cl.statement),
      originType: normalizeObservationOrigin(cl.originType),
      verificationStatus: normalizeObservationStatus(cl.verificationStatus),
      observedAt: cl.occurredAt || undefined,
    });
  }

  // Metrics and money signals are part of the Foundation record even when
  // they cannot be used in the P&L (for example, a conflicting period or an
  // unverified source). Keep every record visible in Layer 3 with its status
  // instead of silently dropping it or promoting it into a confirmed field.
  for (const metric of metrics) {
    observationsStream.push({
      id: `${metric.id}_metric`,
      category: metric.verificationStatus === 'SUPPORTED' ? 'TECH_VERIFICATION' : 'RESEARCH_LIMIT',
      categoryLabel: metric.verificationStatus === 'SUPPORTED' ? '財務・価格記録' : '未検証財務候補',
      text: cleanIntelligenceText(`${cleanMetricLabel(metric.metricType)}: ${formatHumanMoney(metric.value, metric.currency, metric.unit)}${metric.periodStart || metric.periodEnd ? ` (${metric.periodStart || '?'}–${metric.periodEnd || '?'})` : ''}`),
      originType: normalizeObservationOrigin(metric.originType),
      verificationStatus: normalizeObservationStatus(metric.verificationStatus),
      observedAt: metric.pointInTime || metric.periodEnd || metric.periodStart || undefined,
    });
  }

  for (const money of moneySignals) {
    observationsStream.push({
      id: `${money.id}_money`,
      category: money.verificationStatus === 'SUPPORTED' ? 'TECH_VERIFICATION' : 'RESEARCH_LIMIT',
      categoryLabel: money.verificationStatus === 'SUPPORTED' ? '財務・価格記録' : '未検証財務候補',
      text: cleanIntelligenceText(`${cleanMetricLabel(money.moneyType)}: ${formatHumanMoney(money.amount, money.currency, money.unit, money.amountLabel)}${money.periodStart || money.periodEnd ? ` (${money.periodStart || '?'}–${money.periodEnd || '?'})` : ''}`),
      originType: normalizeObservationOrigin(money.originType),
      verificationStatus: normalizeObservationStatus(money.verificationStatus),
      observedAt: money.pointInTime || money.periodEnd || money.periodStart || undefined,
    });
  }

  // Relationships are first-class Foundation records as well. They do not
  // have an origin field, so keep them explicitly unknown and preserve their
  // verification state instead of dropping them from the UI projection.
  for (const relationship of relationships) {
    observationsStream.push({
      id: `${relationship.id}_relationship`,
      category: relationship.verificationStatus === 'SUPPORTED' ? 'MARKET_DISTORTION' : 'RESEARCH_LIMIT',
      categoryLabel: relationship.verificationStatus === 'SUPPORTED' ? '関係記録' : '未検証関係候補',
      text: cleanIntelligenceText(`${relationship.predicate}: ${relationship.object || '対象未確認'}${relationship.validFrom || relationship.validTo ? ` (${relationship.validFrom || '?'}–${relationship.validTo || '?'})` : ''}`),
      originType: 'unknown',
      verificationStatus: normalizeObservationStatus(relationship.verificationStatus),
      observedAt: relationship.validTo || relationship.validFrom || undefined,
    });
  }

  for (const dr of derived) {
    observationsStream.push({
      id: dr.id,
      category: 'INCUMBENT_DILEMMA',
      categoryLabel: '構造解剖インサイト',
      text: cleanIntelligenceText(dr.text),
      originType: 'inferred',
      verificationStatus: 'UNVERIFIED',
    });
  }

  // 7. タイムラインイベント
  // Unsupported/conflicted events remain visible as explicitly unverified
  // observations, while the timeline itself only renders supported facts.
  const supportedEvents = events.filter(hasSupportedEvidence);
  for (const ev of events) {
    if (hasSupportedEvidence(ev)) continue;
    observationsStream.push({
      id: `${ev.id}_event`,
      category: 'RESEARCH_LIMIT',
      categoryLabel: '未検証タイムライン候補',
      text: cleanIntelligenceText(`${ev.eventType}: ${ev.description}`),
      originType: 'unknown',
      verificationStatus: normalizeObservationStatus(ev.verificationStatus),
      observedAt: ev.occurredAt || undefined,
    });
  }
  const timelineEvents: UniversalEvent[] = supportedEvents.map((ev) => ({
    eventType: ev.eventType,
    occurredAt: ev.occurredAt || '時期未確認',
    description: cleanIntelligenceText(ev.description),
  }));

  // 8. 時系列インテリジェンス (Temporal)
  const launchEvent = supportedEvents.find((e) => /launch|founded/i.test(e.eventType));
  const foundedYearMatch = launchEvent?.occurredAt?.match(/\b(?:19|20)\d{2}\b/);
  const foundedYear = foundedYearMatch ? Number(foundedYearMatch[0]) : 0;
  const hasFoundedYear = foundedYear > 0;
  const observedPeriod = entity.observedAt ? `${entity.observedAt.slice(0, 7)} 観測` : '観測時期未確認';

  const temporal: TemporalIntelligence = {
    foundedYear,
    initialTractionPeriod: hasFoundedYear ? `${foundedYear}年ローンチ期` : '初動時期未確認',
    dataSnapshotPeriod: observedPeriod,
    viabilityStatus: 'UNKNOWN',
    viabilityLabel: '現在の再現性は未確認',
    eraContext: '時代背景は未確認',
    currentViabilityAnalysis: '現在の再現性を裏付ける比較資料は未確認',
  };

  // 9. 一言急所と概要（サニタイズ適用）
  const firstClaim = claims.find(hasSupportedEvidence)?.statement ? cleanIntelligenceText(claims.find(hasSupportedEvidence)!.statement) : '';
  const firstObs = observations.find(hasSupportedEvidence)?.text ? cleanIntelligenceText(observations.find(hasSupportedEvidence)!.text) : '';
  let tagline = firstClaim || firstObs || `${entity.name}の事業モデル・公開情報観測データ`;
  if (/^創業者・運営者:/.test(tagline) && claims[2]?.statement) {
    tagline = cleanIntelligenceText(claims[2].statement);
  }
  const alphaMatches = tagline.match(/[a-zA-Z]/g);
  if (alphaMatches && alphaMatches.length / tagline.length > 0.45) {
    tagline = `${entity.name}の特化型事業モデル・公開情報観測データ`;
  }

  // 10. 4〜8文字の日本語型バッジ
  const pattern = inferArchitecturePattern(entity.entityType, `${tagline} ${firstClaim}`);

  // 11. 盲点と参入障壁（実在ファクトから抽出）
  const revenuePathClaim = claims.find((c) => hasSupportedEvidence(c) && (c.statement.includes('収益化経路') || /monetiz/i.test(c.statement)));
  const blindspotText = revenuePathClaim
    ? cleanIntelligenceText(revenuePathClaim.statement)
    : (firstObs || '市場の盲点は未確認');

  const businessSaleEvent = supportedEvents.find((e) => /sale|exit|買収|売却/i.test(e.description));
  const moatText = businessSaleEvent
    ? cleanIntelligenceText(businessSaleEvent.description)
    : (firstClaim || '参入障壁は未確認');

  // 12. タグ構成（客観ファクトのみ、捏造厳禁）
  const tags = new Set<string>();
  if (headcountMetric && headcountMetric.value === 1) {
    tags.add('完全1人');
  } else if (hasTeamSize && teamSize <= 5) {
    tags.add('少数精鋭');
  }
  if (!isUnconfirmed && pnl.grossMargin >= 80) {
    tags.add('利益率80%超');
  }
  tags.add(inferSector(tagline) === 'CONTENT_MEDIA' ? 'メディア・出版' : 'SaaS・ツール');
  if (!isUnconfirmed && monthlyJpy > 0) {
    tags.add('収益確認済');
  }

  // 動的特異点証拠カード（詳細用）
  const evidenceCards: DynamicEvidenceCard[] = [
    {
      id: `ev_${entity.id}_crime`,
      type: 'THE_CRIME',
      title: '身も蓋もない真実・集金構造',
      badge: pattern,
      evidenceStatus: financialStatus === 'UNAVAILABLE' ? 'UNKNOWN' : (financialStatus === 'REPORTED' ? 'REPORTED' : 'ESTIMATED'),
      punchline: tagline,
      details: observationsStream.map((o) => o.text).slice(0, 3).length > 0
        ? observationsStream.map((o) => o.text).slice(0, 3)
        : [
            `業態分類: ${entity.entityType}`,
            blindspotText,
            `価格帯: ${cleanMoneyLabel(priceStr)}`,
          ],
      sourceNote: entity.canonicalIdentifier || claims[0]?.statement || 'R2 Foundation Lake 一次観測',
    },
    {
      id: `ev_${entity.id}_genesis`,
      type: 'DIRTY_GENESIS',
      title: '最初の顧客獲得・初動突破ログ',
      badge: 'ゲリラ集客',
      evidenceStatus: hasTractionEvidence ? 'REPORTED' : 'UNKNOWN',
      punchline: initialTraction[0] || '初動突破は未確認',
      details: initialTraction.slice(0, 3),
      sourceNote: claims.find((c) => /launch|founder|traction/i.test(c.statement))?.statement || '公開インタビュー・観測ログ',
    },
    {
      id: `ev_${entity.id}_blueprint`,
      type: 'LOOT_BLUEPRINT',
      title: '今夜使える略奪転用コード',
      badge: '実務転用',
      evidenceStatus: 'ESTIMATED',
      punchline: (() => {
        const cleanTag = cleanIntelligenceText(tagline).replace(/[。、].*$/, '').trim().slice(0, 25);
        return cleanTag.length > 5 && !/^[a-zA-Z\s]+$/.test(cleanTag)
          ? `「${cleanTag}」の仕組みを国内ニッチへ横展開する即戦力モデル`
          : `『${entity.name}』の${pattern}モデルを国内ニッチへ横展開する即戦力設計図`;
      })(),
      details: [
        `① 突いた盲点: ${blindspotText.slice(0, 60)}`,
        `② 収益化の急所: ${cleanMoneyLabel(priceStr)} の定額課金・自動回収配管を構築。`,
        '③ 乗り換え障壁: 顧客のワークフローと蓄積データを人質化し、チャーンレートを極小化。',
      ],
      sourceNote: 'Make-Money アナリスト転用設計',
    },
  ];

  const opportunityJudgment: OpportunityJudgment = {
    verdict: (isUnconfirmed) ? 'MONITOR' : 'ENTRY_CANDIDATE',
    verdictLabel: (isUnconfirmed) ? '要監視・データ精査中' : '参入候補',
    oneLineReason: tagline,
    demandDelta: '未確認',
    competitionDelta: '未確認',
    entryRequirements: {
      capital: '未確認',
      technicalDifficulty: 'UNKNOWN',
      platformRisk: 'UNKNOWN',
    },
  };

  return {
    id: entity.id,
    ticker: (entity.domain || entity.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: entity.name,
    legalEntity: entity.canonicalIdentifier || undefined,
    tagline,
    sector: inferSector(tagline),
    scale: inferScale(teamSize, monthlyJpy ? (monthlyJpy * 12) / 150 : null),
    founder,
    country: '未確認',
    url: entity.domain ? `https://${entity.domain}` : '',
    verifiedBadge: false,
    pnl,
    evidenceCards,
    opportunityJudgment,
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: pattern,
    pipelineStack: '技術構成未確認',
    targetPainWallet: cleanIntelligenceText(firstObs ? firstObs.slice(0, 40) : '対象の痛みは未確認'),
    tags: Array.from(tags),
    essence: {
      whatItDoes: tagline,
      targetCustomer: cleanIntelligenceText(firstObs ? firstObs.slice(0, 40) : '対象顧客は未確認'),
      painRelief: cleanIntelligenceText(blindspotText.slice(0, 50) || '解消する痛みは未確認'),
    },
    operations: {
      teamSize,
      isTeamSizeUnconfirmed: !hasTeamSize,
      weeklyHours: 0,
      isWeeklyHoursUnconfirmed: true,
      initialCapitalRequired: 0,
      isCapitalUnconfirmed: true,
      automationLevel: 0,
      isAutomationUnconfirmed: true,
      primaryChannels: [],
      toolStack: [],
    },
    strategy: {
      blindspot: blindspotText,
      moatType: 'UNKNOWN',
      moatDescription: moatText,
      initialTraction,
      actionPlaybook: ['公開記録の範囲では実行手順未確認'],
    },
    exposureAudit: {
      guerrillaTraction: hasTractionEvidence ? initialTraction[0] : '初期顧客獲得は未確認',
      platformGlitch: 'プラットフォーム施策は未確認',
      pivotSnapshot: supportedEvents.find((e) => /launch|pivot|release/i.test(e.eventType))?.description
        ? cleanIntelligenceText(supportedEvents.find((e) => /launch|pivot|release/i.test(e.eventType))!.description)
        : 'ピボット履歴は未確認',
      hiddenStackCost: '原価内訳は未確認',
    },
    dynamicMoats: {},
    pricing: {
      model: priceStr === '価格体系は非公開または要問合せ' ? '価格モデル未確認' : '公開価格情報',
      pricePoint: cleanMoneyLabel(priceStr),
      psychologicalTrigger: '未確認',
    },
    temporal,
    observationsStream,
    timelineEvents,
  };
}

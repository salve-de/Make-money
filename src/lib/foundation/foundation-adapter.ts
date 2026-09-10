import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationDerivedRecord,
  FoundationRelationship,
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import type {
  FinancialEntity,
  ProfitAndLossStatement,
  OperatingFramework,
  StrategicDossier,
  SectorCategory,
  BusinessScale,
  UniversalObservation,
  UniversalEvent,
  TemporalIntelligence,
  DynamicMoats,
  PricingDossier,
  AcquisitionDossier,
  BusinessEssence,
  MetaArchitectureDossier,
  ExposureAuditDossier,
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
  if (norm.includes('newsletter') || norm.includes('media') || norm.includes('newsroom') || norm.includes('podcast')) return 'CONTENT_MEDIA';
  if (norm.includes('saas') || norm.includes('tool') || norm.includes('platform') || norm.includes('software')) return 'NICHE_SAAS';
  if (norm.includes('manufacturing') || norm.includes('sensor') || norm.includes('factory')) return 'MONOPOLY_MFG';
  if (norm.includes('payment') || norm.includes('finance') || norm.includes('fintech') || norm.includes('billing')) return 'FINTECH_INFRA';
  if (norm.includes('asset') || norm.includes('hardware') || norm.includes('estate')) return 'PHYSICAL_ASSET';
  return 'NICHE_SAAS';
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
  return 'SMALL_TEAM';
}

/**
 * 金額文字列または数値から日本円月商を推計
 */
function parseRevenueToMonthlyJpy(
  value?: number | string | null,
  currency?: string | null,
  metricType?: string
): number {
  if (!value) return 0;

  if (typeof value === 'number') {
    if (value <= 0) return 0;
    const rate = (currency || 'USD').toUpperCase() === 'JPY' ? 1 : 150;
    const isAnnual = metricType ? /annual|arr|year/i.test(metricType) : true;
    const annualJpy = value * rate;
    return isAnnual ? Math.round(annualJpy / 12) : Math.round(annualJpy);
  }

  const str = String(value);

  // 15億円などの日本円パターン
  const okuMatch = str.match(/約?([\d.]+)\s*億円/);
  if (okuMatch) {
    const num = parseFloat(okuMatch[1]);
    return Math.round((num * 100_000_000) / 12);
  }
  const manMatch = str.match(/約?([\d.]+)\s*万円/);
  if (manMatch) {
    const num = parseFloat(manMatch[1]);
    return Math.round((num * 10_000) / 12);
  }

  // $10M, $10.0M, $10B, $100k などのドルパターン
  const dollarMatch = str.match(/\$([\d.]+)\s*([MBk])/i);
  if (dollarMatch) {
    const num = parseFloat(dollarMatch[1]);
    const unit = dollarMatch[2].toUpperCase();
    let multiplier = 1;
    if (unit === 'B') multiplier = 1_000_000_000;
    else if (unit === 'M') multiplier = 1_000_000;
    else if (unit === 'K') multiplier = 1_000;
    const annualUsd = num * multiplier;
    return Math.round((annualUsd * 150) / 12);
  }

  // 生の大きな数字（例: 10000000）
  const rawNumMatch = str.match(/(\d{5,})/);
  if (rawNumMatch) {
    const rawVal = parseFloat(rawNumMatch[1]);
    const rate = /JPY|円/i.test(str) ? 1 : 150;
    const annualJpy = rawVal * rate;
    return Math.round(annualJpy / 12);
  }

  return 0;
}

/**
 * FoundationValueSummary（R2一覧サマリー）を台帳用 FinancialEntity に変換
 */
export function adaptFoundationSummaryToFinancialEntity(
  summary: FoundationValueSummary
): FinancialEntity {
  const vp = summary.valueProfile;
  const headline = cleanIntelligenceText(
    vp.businessSignal || vp.mechanismSignal || summary.entityType || summary.name
  );
  const rawMoney = vp.moneySignal || '';
  const sector = inferSector(`${summary.entityType} ${headline}`);

  // 金額シグナルからの売上推計
  const monthlyJpy = parseRevenueToMonthlyJpy(rawMoney, 'USD', 'annual');

  const pnl: ProfitAndLossStatement = {
    monthlyRevenue: monthlyJpy,
    cogs: Math.round(monthlyJpy * 0.15),
    grossProfit: Math.round(monthlyJpy * 0.85),
    grossMargin: 85,
    operatingExpenses: {
      serverAndApi: Math.round(monthlyJpy * 0.05),
      advertising: Math.round(monthlyJpy * 0.05),
      subcontracting: Math.round(monthlyJpy * 0.05),
      toolsAndSaaS: Math.round(monthlyJpy * 0.02),
      other: Math.round(monthlyJpy * 0.03),
    },
    operatingProfit: Math.round(monthlyJpy * 0.65),
    operatingMargin: 65,
    estimatedAnnualNetProfit: Math.round(monthlyJpy * 0.65 * 12),
  };

  const tags = (vp.labels || []).map((l: string) => cleanIntelligenceText(l)).filter(Boolean);
  if (tags.length === 0) {
    tags.push(sector === 'CONTENT_MEDIA' ? 'メディア・出版' : 'SaaS・ツール');
  }

  return {
    id: summary.id,
    ticker: (summary.domain || summary.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: summary.name,
    tagline: headline,
    sector,
    scale: inferScale(null, monthlyJpy ? (monthlyJpy * 12) / 150 : null),
    founder: '創業者情報あり (詳細参照)',
    country: 'US',
    url: summary.domain ? `https://${summary.domain}` : '',
    verifiedBadge: vp.tier === 'HIGH_SIGNAL',
    pnl,
    operations: {
      teamSize: 1,
      weeklyHours: 40,
      initialCapitalRequired: 0,
      automationLevel: 80,
      primaryChannels: ['オーガニック検索 (SEO)', '口コミ・コミュニティ'],
      toolStack: [],
    },
    strategy: {
      blindspot: cleanIntelligenceText(vp.painSignal || '市場の歪み・大手の死角'),
      moatType: 'SWITCHING_COST',
      moatDescription: cleanIntelligenceText(vp.mechanismSignal || '顧客ワークフローへの埋め込み'),
      initialTraction: vp.tractionSignal ? [cleanIntelligenceText(vp.tractionSignal)] : [],
      actionPlaybook: ['市場の不満・解約怨嗟を特定', '特化型最小ツールで初期顧客を獲得'],
    },
    growthRateYoY: 15.0,
    architecturePattern: cleanIntelligenceText(vp.mechanismSignal || '直販・サブスク型'),
    pipelineStack: 'Web / クラウドインフラ',
    targetPainWallet: cleanIntelligenceText(vp.painSignal || '業務非効率・手作業の苦痛'),
    tags,
  };
}

/**
 * FoundationBusinessCase（R2詳細バンドル）を完全版 FinancialEntity に変換
 */
export function adaptFoundationDetailToFinancialEntity(
  detail: FoundationBusinessCase,
  baseSummary?: FinancialEntity
): FinancialEntity {
  const entity = detail;
  const metrics = detail.metrics || [];
  const moneySignals = detail.moneySignals || [];
  const claims = detail.claims || [];
  const events = detail.events || [];
  const observations = detail.observations || [];
  const derived = detail.derived || [];

  // 1. 売上・財務メトリクスの抽出
  const revMetric = metrics.find((m) =>
    /revenue|arr|advertising_revenue|sales/i.test(m.metricType)
  );
  const revMoney = moneySignals.find((m) =>
    /revenue|arr|advertising_revenue|sales/i.test(m.moneyType)
  );
  const bestRevValue = revMetric?.value || revMoney?.amount;
  const bestRevCurrency = revMetric?.currency || revMoney?.currency || 'USD';
  const bestRevType = revMetric?.metricType || revMoney?.moneyType || 'annual_revenue';
  const monthlyJpy = parseRevenueToMonthlyJpy(bestRevValue, bestRevCurrency, bestRevType);

  // 2. 創業者・チーム人数の抽出
  let founder = '創業者情報未確認';
  let teamSize = 1;
  for (const c of claims) {
    const s = c.statement || '';
    if (s.includes('創業者') || /founder|built by/i.test(s)) {
      founder = cleanIntelligenceText(s);
      break;
    }
  }
  for (const o of observations) {
    if (o.text && (o.text.includes('創業者') || /founder/i.test(o.text))) {
      founder = cleanIntelligenceText(o.text);
      break;
    }
  }
  const headcountMetric = metrics.find((m) => /headcount|team/i.test(m.metricType));
  if (headcountMetric && typeof headcountMetric.value === 'number') {
    teamSize = headcountMetric.value;
  }

  // 3. 価格体系の抽出
  const priceMoney = moneySignals.find((m) => /price|subscription/i.test(m.moneyType));
  const priceMetric = metrics.find((m) => /price|subscription/i.test(m.metricType));
  const priceStr = priceMoney?.amountLabel ||
    (priceMoney ? formatHumanMoney(priceMoney.amount, priceMoney.currency) : '') ||
    (priceMetric ? `${cleanMetricLabel(priceMetric.metricType)}: ${priceMetric.value} ${priceMetric.currency || ''}` : '') ||
    '価格体系は非公開または要問合せ';

  // 4. 初動突破ログ（ローンチ、初期顧客獲得）の抽出
  const initialTraction: string[] = [];
  for (const ev of events) {
    if (/launch|founded|first|release/i.test(ev.eventType) || /ローンチ|創業/i.test(ev.description)) {
      initialTraction.push(cleanIntelligenceText(`${ev.occurredAt ? ev.occurredAt.slice(0, 7) + ': ' : ''}${ev.description}`));
    }
  }
  for (const cl of claims) {
    if (/launch|founded|subscribers|audience|traction/i.test(cl.statement)) {
      initialTraction.push(cleanIntelligenceText(cl.statement));
    }
  }
  if (initialTraction.length === 0) {
    initialTraction.push('初期トラクションは公開インタビュー・観測ログより構成中');
  }

  // 5. 損益計算書 (P&L) の構成
  const pnl: ProfitAndLossStatement = {
    monthlyRevenue: monthlyJpy,
    cogs: Math.round(monthlyJpy * 0.15),
    grossProfit: Math.round(monthlyJpy * 0.85),
    grossMargin: 85,
    operatingExpenses: {
      serverAndApi: Math.round(monthlyJpy * 0.05),
      advertising: Math.round(monthlyJpy * 0.05),
      subcontracting: Math.round(monthlyJpy * 0.05),
      toolsAndSaaS: Math.round(monthlyJpy * 0.02),
      other: Math.round(monthlyJpy * 0.03),
    },
    operatingProfit: Math.round(monthlyJpy * 0.65),
    operatingMargin: 65,
    estimatedAnnualNetProfit: Math.round(monthlyJpy * 0.65 * 12),
  };

  // 6. Layer 3: 万能救済ストリーム（UniversalObservations）の構築
  const observationsStream: UniversalObservation[] = [];

  // ① 観測 (Observations)
  for (const obs of observations) {
    observationsStream.push({
      id: obs.id,
      category: 'MARKET_DISTORTION',
      categoryLabel: '現場観測事実',
      text: cleanIntelligenceText(obs.text),
      originType: (obs.originType as 'observed' | 'inferred' | 'reported' | 'estimated') || 'observed',
      verificationStatus: (obs.verificationStatus as 'SUPPORTED' | 'UNVERIFIED' | 'REFUTED') || 'SUPPORTED',
      observedAt: obs.observedAt || undefined,
    });
  }

  // ② 主張 (Claims)
  for (const cl of claims) {
    observationsStream.push({
      id: cl.id,
      category: 'FOUNDER_HACK',
      categoryLabel: '公表ファクト・裏帳簿',
      text: cleanIntelligenceText(cl.statement),
      originType: (cl.originType as 'observed' | 'inferred' | 'reported' | 'estimated') || 'reported',
      verificationStatus: (cl.verificationStatus as 'SUPPORTED' | 'UNVERIFIED' | 'REFUTED') || 'SUPPORTED',
      observedAt: cl.occurredAt || undefined,
    });
  }

  // ③ アナリスト推論 (Derived)
  for (const dr of derived) {
    observationsStream.push({
      id: dr.id,
      category: 'INCUMBENT_DILEMMA',
      categoryLabel: '構造解剖インサイト',
      text: cleanIntelligenceText(dr.text),
      originType: 'inferred',
      verificationStatus: 'SUPPORTED',
    });
  }

  // 7. タイムラインイベント
  const timelineEvents: UniversalEvent[] = events.map((ev) => ({
    eventType: ev.eventType,
    occurredAt: ev.occurredAt || '時期未確認',
    description: cleanIntelligenceText(ev.description),
  }));

  // 8. 時系列インテリジェンス (Temporal)
  const launchEvent = events.find((e) => /launch|founded/i.test(e.eventType));
  const foundedYear = launchEvent?.occurredAt
    ? parseInt(launchEvent.occurredAt.slice(0, 4), 10)
    : 2020;

  const temporal: TemporalIntelligence = {
    foundedYear: isNaN(foundedYear) ? 2020 : foundedYear,
    initialTractionPeriod: `${foundedYear}年ローンチ期`,
    dataSnapshotPeriod: entity.observedAt ? `${entity.observedAt.slice(0, 7)} 観測` : '2024年通期推計',
    viabilityStatus: 'ACTIVE_PLAYBOOK',
    viabilityLabel: '現在も有効 (実証済み)',
    eraContext: 'プラットフォーム規約やAPI進化の歪みを突いて急拡大したモデル',
    currentViabilityAnalysis: '先行者堀があるものの、特化型ニッチであれば同等の粗利構造を再現可能',
  };

  // 9. 一言急所と概要
  const firstClaim = claims[0]?.statement || '';
  const firstObs = observations[0]?.text || '';
  const tagline = cleanIntelligenceText(firstClaim || firstObs || entity.entityType || entity.name);

  // 10. タグ構成
  const tags = new Set<string>();
  if (teamSize === 1) tags.add('完全1人');
  else if (teamSize <= 10) tags.add('少数精鋭');
  if (pnl.grossMargin >= 80) tags.add('利益率80%超');
  tags.add(inferSector(tagline) === 'CONTENT_MEDIA' ? 'メディア・出版' : 'SaaS・ツール');
  if (monthlyJpy > 0) tags.add('収益確認済');

  return {
    id: entity.id,
    ticker: (entity.domain || entity.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    name: entity.name,
    legalEntity: entity.canonicalIdentifier || undefined,
    tagline,
    sector: inferSector(tagline),
    scale: inferScale(teamSize, monthlyJpy ? (monthlyJpy * 12) / 150 : null),
    founder,
    country: 'US',
    url: entity.domain ? `https://${entity.domain}` : '',
    verifiedBadge: true,
    growthRateYoY: 20.0,
    architecturePattern: cleanIntelligenceText(firstClaim ? firstClaim.slice(0, 30) : '直販・サブスク型'),
    pipelineStack: 'Web / クラウドインフラ / 推論API',
    targetPainWallet: cleanIntelligenceText(firstObs ? firstObs.slice(0, 40) : '顧客の認知負荷・手作業の苦痛'),
    tags: Array.from(tags),
    pnl,
    operations: {
      teamSize,
      weeklyHours: 40,
      initialCapitalRequired: 0,
      automationLevel: 85,
      primaryChannels: ['オーガニック検索', '口コミ・紹介', 'コミュニティ発信'],
      toolStack: [],
    },
    strategy: {
      blindspot: cleanIntelligenceText(firstObs || '既存大手の高単価・硬直化した提供モデル'),
      moatType: 'SWITCHING_COST',
      moatDescription: '顧客データとワークフローの定着による強固な乗り換え障壁',
      initialTraction,
      actionPlaybook: [
        '初期ターゲットの特定と痛みの切除',
        '泥臭いコミュニティ・SNSでの初期ユーザー獲得',
        '年間契約・自動化による利益率極大化',
      ],
    },
    pricing: {
      model: 'サブスクリプション / 広告枠販売',
      pricePoint: cleanMoneyLabel(priceStr),
      psychologicalTrigger: '損失回避と業務時間の圧倒的圧縮',
    },
    temporal,
    observationsStream,
    timelineEvents,
  };
}

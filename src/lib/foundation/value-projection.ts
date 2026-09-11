import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationDerivedRecord,
  FoundationEntitySummary,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationRelationship,
} from '@/lib/foundation/business-reader';
import {
  cleanIntelligenceText,
  cleanMetricLabel,
  formatHumanMoney,
  cleanMoneyLabel,
} from './text-cleaner';

/**
 * Read-time UI projection only.
 *
 * This is deliberately not a Foundation schema and is never written to R2.
 * It turns the records that are already present in a bundle into a small set
 * of useful display signals. Missing facts stay null; this module never fills
 * revenue, margin, price, customers, or other values with defaults.
 */
export type FoundationValueTier = 'HIGH_SIGNAL' | 'USEFUL' | 'CANDIDATE';

export interface FoundationValueCounts {
  claims: number;
  metrics: number;
  moneySignals: number;
  events: number;
  observations: number;
  derived: number;
  evidence: number;
}

export interface FoundationValueProfile {
  tier: FoundationValueTier;
  score: number;
  labels: string[];
  businessSignal: string | null;
  painSignal: string | null;
  moneySignal: string | null;
  tractionSignal: string | null;
  mechanismSignal: string | null;
  timeSignal: string | null;
  counts: FoundationValueCounts;
}

type TextRecord = {
  text: string;
  evidenceIds: string[];
  verificationStatus?: string;
  confidence?: number | null;
  originType?: string;
  date?: string | null;
};

const BUSINESS_TERMS = [
  'is a',
  'provides',
  'platform',
  'software',
  'service',
  'tool',
  'app',
  'saas',
  'marketplace',
  'helps',
  'enables',
  'builds',
  'offers',
  '事業',
  'サービス',
  'プラットフォーム',
  'ソフトウェア',
  'アプリ',
  '提供',
  '支援',
];

const PAIN_TERMS = [
  'problem',
  'pain',
  'friction',
  'manual',
  'bottleneck',
  'expensive',
  'slow',
  'hard to',
  'need',
  '課題',
  '痛み',
  '手作業',
  'ボトルネック',
  '困',
  '面倒',
  '高コスト',
  '遅',
];

const TRACTION_TERMS = [
  'first customer',
  'first customers',
  'early customer',
  'initial customer',
  'customer acquisition',
  'acquired',
  'users',
  'signups',
  'launched',
  'launch',
  'grew',
  'growth',
  'revenue',
  'mrr',
  'arr',
  '顧客',
  'ユーザー',
  '初期',
  '最初',
  '獲得',
  '集客',
  'ローンチ',
  '成長',
  '売上',
];

const MECHANISM_TERMS = [
  'pricing',
  'subscription',
  'referral',
  'affiliate',
  'network',
  'lock-in',
  'switching',
  'integration',
  'distribution',
  'channel',
  'moat',
  'platform',
  'direct',
  'seo',
  'api',
  'commission',
  '価格',
  '料金',
  'サブスク',
  '紹介',
  'ネットワーク',
  'ロックイン',
  '参入',
  '販売',
  '集客経路',
  '仕組み',
];

const MONEY_TERMS = [
  'revenue',
  'profit',
  'margin',
  'mrr',
  'arr',
  'price',
  'pricing',
  'cost',
  'sales',
  '売上',
  '利益',
  '粗利',
  '価格',
  '料金',
  '費用',
  '収益',
];

const FINANCIAL_TEXT_TERMS = [
  'revenue',
  'profit',
  'margin',
  'mrr',
  'arr',
  'price',
  'pricing',
  'cost',
  'sales',
  '売上',
  '利益',
  '粗利',
  '価格',
  '料金',
  '費用',
  '収益',
];

function compact(text: string, maxLength = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function hasTerm(text: string, terms: string[]): boolean {
  const normalized = text.toLocaleLowerCase();
  return terms.some((term) => normalized.includes(term.toLocaleLowerCase()));
}

function statusWeight(status: string | undefined): number {
  if (status === 'SUPPORTED') return 4;
  if (status === 'CONFLICTED') return 1;
  if (status === 'UNVERIFIED') return 0;
  return 2;
}

function recordWeight(item: TextRecord): number {
  return statusWeight(item.verificationStatus) +
    Math.min(item.evidenceIds.length, 3) +
    (typeof item.confidence === 'number' ? item.confidence : 0);
}

function chooseText(records: TextRecord[], terms: string[], excludeFinancial = false): string | null {
  const candidates = records
    .filter((item) => item.text.trim().length > 0)
    .filter((item) => !excludeFinancial || !hasTerm(item.text, FINANCIAL_TEXT_TERMS))
    .sort((left, right) => {
      const rightMatch = hasTerm(right.text, terms) ? 1 : 0;
      const leftMatch = hasTerm(left.text, terms) ? 1 : 0;
      return rightMatch - leftMatch || recordWeight(right) - recordWeight(left);
    });

  const selected = candidates.find((item) => hasTerm(item.text, terms));
  if (!selected) return null;
  const prefix = selected.originType === 'inferred' ? '推論: ' : '';
  const cleaned = cleanIntelligenceText(selected.text);
  return compact(`${prefix}${cleaned}`);
}

function valueText(value: number | string | null, currency: string | null, unit: string | null): string | null {
  if (value === null || value === '') return null;
  return formatHumanMoney(value, currency, unit);
}

function periodText(item: { periodStart?: string | null; periodEnd?: string | null; pointInTime?: string | null }): string | null {
  const point = item.pointInTime?.slice(0, 10);
  if (point) return point;
  const start = item.periodStart?.slice(0, 10);
  const end = item.periodEnd?.slice(0, 10);
  if (start && end) return `${start}–${end}`;
  return start || end || null;
}

function metricText(item: FoundationMetricSignal): TextRecord & { isMoney: boolean } {
  const label = cleanMetricLabel(item.metricType);
  const amount = formatHumanMoney(item.value, item.currency, item.unit);
  const statusStr = item.verificationStatus === 'SUPPORTED' ? '確認済' : item.verificationStatus === 'UNVERIFIED' ? '未確認' : item.verificationStatus || '';
  return {
    text: `${label}: ${amount}${periodText(item) ? ` (${periodText(item)})` : ''}${statusStr ? ` ・ ${statusStr}` : ''}`,
    evidenceIds: item.evidenceIds,
    verificationStatus: item.verificationStatus,
    confidence: item.confidence,
    originType: item.originType,
    date: periodText(item),
    isMoney: Boolean(item.value) && hasTerm(item.metricType, MONEY_TERMS),
  };
}

function moneyText(item: FoundationMoneySignal): TextRecord & { isMoney: boolean } {
  const label = cleanMetricLabel(item.moneyType);
  const amount = formatHumanMoney(item.amount, item.currency, item.unit, item.amountLabel);
  const purpose = item.purpose ? cleanIntelligenceText(item.purpose) : '';
  const statusStr = item.verificationStatus === 'SUPPORTED' ? '確認済' : item.verificationStatus === 'UNVERIFIED' ? '未確認' : item.verificationStatus || '';
  return {
    text: `${label}: ${amount}${purpose ? ` (${purpose})` : ''}${periodText(item) ? ` [${periodText(item)}]` : ''}${statusStr ? ` ・ ${statusStr}` : ''}`,
    evidenceIds: item.evidenceIds,
    verificationStatus: item.verificationStatus,
    confidence: item.confidence,
    originType: item.originType,
    date: periodText(item),
    isMoney: Boolean(item.amount || item.amountLabel),
  };
}

function textRecords(
  claims: FoundationClaim[],
  observations: FoundationObservation[],
  events: FoundationEvent[],
  relationships: FoundationRelationship[],
  derived: FoundationDerivedRecord[]
): TextRecord[] {
  return [
    ...claims.map((item) => ({
      text: item.statement,
      evidenceIds: item.evidenceIds,
      verificationStatus: item.verificationStatus,
      confidence: item.confidence,
      originType: item.originType,
      date: item.occurredAt,
    })),
    ...observations.map((item) => ({
      text: item.text,
      evidenceIds: item.evidenceIds,
      verificationStatus: item.verificationStatus,
      originType: item.originType,
      date: item.observedAt,
    })),
    ...events.map((item) => ({
      text: item.description,
      evidenceIds: item.evidenceIds,
      verificationStatus: item.verificationStatus,
      confidence: item.confidence,
      date: item.occurredAt,
    })),
    ...relationships.map((item) => ({
      text: `${item.predicate}${item.object ? `: ${item.object}` : ''}`,
      evidenceIds: item.evidenceIds,
      verificationStatus: item.verificationStatus,
      confidence: item.confidence,
      date: item.validFrom,
    })),
    ...derived.map((item) => ({
      text: item.text,
      evidenceIds: item.supportingEvidenceIds,
      confidence: item.confidence,
      originType: item.originType,
    })),
  ];
}

function pickMoneySignal(metrics: FoundationMetricSignal[], moneySignals: FoundationMoneySignal[]): string | null {
  const moneyRecords = [
    ...moneySignals.map(moneyText),
    ...metrics.map(metricText).filter((item) => item.isMoney),
  ];
  const selected = moneyRecords
    .filter((item) => item.text.trim().length > 0)
    .sort((left, right) => recordWeight(right) - recordWeight(left))[0];
  return selected ? compact(selected.text) : null;
}

function pickTimeSignal(
  summary: FoundationEntitySummary,
  metrics: FoundationMetricSignal[],
  events: FoundationEvent[],
  claims: FoundationClaim[]
): string | null {
  const dated = [
    ...events.map((item) => ({ text: `${item.eventType}: ${item.description}`, date: item.occurredAt, evidenceIds: item.evidenceIds, verificationStatus: item.verificationStatus, confidence: item.confidence })),
    ...metrics.map((item) => ({ text: `${item.metricType}: ${valueText(item.value, item.currency, item.unit) || '値未確認'}`, date: periodText(item), evidenceIds: item.evidenceIds, verificationStatus: item.verificationStatus, confidence: item.confidence })),
    ...claims.map((item) => ({ text: item.statement, date: item.occurredAt, evidenceIds: item.evidenceIds, verificationStatus: item.verificationStatus, confidence: item.confidence })),
  ].filter((item) => item.date);
  const selected = dated.sort((left, right) => recordWeight(right) - recordWeight(left))[0];
  if (selected?.date) return `${selected.date.slice(0, 10)} ・ ${compact(selected.text, 180)}`;
  return summary.observedAt ? `観測日: ${summary.observedAt.slice(0, 10)}` : null;
}

function countEvidence(
  summary: FoundationEntitySummary,
  records: Array<{ evidenceIds?: string[]; supportingEvidenceIds?: string[] }>
): number {
  const ids = new Set(summary.evidenceIds);
  for (const record of records) {
    for (const id of record.evidenceIds || record.supportingEvidenceIds || []) ids.add(id);
  }
  return ids.size;
}

export function buildFoundationValueProfile(
  summary: FoundationEntitySummary,
  input: Pick<FoundationBusinessCase, 'claims' | 'metrics' | 'moneySignals' | 'events' | 'relationships' | 'observations' | 'derived'>
): FoundationValueProfile {
  const { claims, metrics, moneySignals, events, relationships, observations, derived } = input;
  const texts = textRecords(claims, observations, events, relationships, derived);
  const businessSignal = chooseText(texts, BUSINESS_TERMS, true);
  const painSignal = chooseText(texts, PAIN_TERMS, true);
  const moneySignal = pickMoneySignal(metrics, moneySignals);
  const tractionSignal = chooseText(texts, TRACTION_TERMS, true);
  const mechanismSignal = chooseText(texts, MECHANISM_TERMS, true);
  const timeSignal = pickTimeSignal(summary, metrics, events, claims);
  const counts: FoundationValueCounts = {
    claims: claims.length,
    metrics: metrics.length,
    moneySignals: moneySignals.length,
    events: events.length,
    observations: observations.length,
    derived: derived.length,
    evidence: countEvidence(summary, [
      ...claims,
      ...metrics,
      ...moneySignals,
      ...events,
      ...relationships,
      ...observations,
      ...derived.map((item) => ({ evidenceIds: item.supportingEvidenceIds })),
    ]),
  };

  const signalWeights = [
    businessSignal ? 2 : 0,
    painSignal ? 1 : 0,
    moneySignal ? 2 : 0,
    tractionSignal ? 2 : 0,
    mechanismSignal ? 2 : 0,
    timeSignal ? 1 : 0,
  ];
  const score = Math.min(10, signalWeights.reduce((total, value) => total + value, 0) + (counts.evidence > 0 ? 1 : 0));
  const tier: FoundationValueTier = score >= 7 ? 'HIGH_SIGNAL' : score >= 4 ? 'USEFUL' : 'CANDIDATE';
  const labels = [
    businessSignal ? '事業' : null,
    painSignal ? '課題' : null,
    moneySignal ? '価格/財務' : null,
    tractionSignal ? '初動/成長' : null,
    mechanismSignal ? '仕組み' : null,
    timeSignal ? '時系列' : null,
  ].filter((label): label is string => Boolean(label));

  return {
    tier,
    score,
    labels,
    businessSignal,
    painSignal,
    moneySignal,
    tractionSignal,
    mechanismSignal,
    timeSignal,
    counts,
  };
}

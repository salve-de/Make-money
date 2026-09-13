import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationDerivedRecord,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationRelationship,
  FoundationVerificationStatus,
} from '@/lib/foundation/business-reader';
import {
  cleanIntelligenceText,
  cleanMetricLabel,
  formatHumanMoney,
} from './text-cleaner';

export type DossierCaseLevel = 'FULL_DOSSIER' | 'FOCUSED_CASE' | 'SIGNAL' | 'RELATED_ENTITY';
export type DossierSection = 'CORE' | 'FINANCIALS' | 'PLAYBOOK' | 'RISK';

export type DossierModuleKind =
  | 'BUSINESS_DNA'
  | 'MONEY_MACHINE'
  | 'FIRST_CASH'
  | 'DISTRIBUTION_ENGINE'
  | 'PRICING'
  | 'FINANCIAL_XRAY'
  | 'LEVERAGE'
  | 'CUSTOMER_PROOF'
  | 'FAILURE_PIVOT'
  | 'CAPITAL_CONTROL'
  | 'PLATFORM_DEPENDENCY'
  | 'MARKET_GLITCH'
  | 'MOAT'
  | 'TRANSFERABLE_MECHANISM'
  | 'REALITY_CHECK'
  | 'COUNTER_EVIDENCE'
  | 'RESEARCH_LIMIT';

export interface DossierRow {
  label: string;
  value: string;
  note?: string;
  originType?: string;
  verificationStatus?: FoundationVerificationStatus | string;
  evidenceIds: string[];
}

export interface DossierModule {
  id: string;
  kind: DossierModuleKind;
  section: DossierSection;
  title: string;
  eyebrow: string;
  summary?: string;
  rows: DossierRow[];
  body: string[];
  evidenceIds: string[];
  importance: number;
  analysis: boolean;
}

export interface FoundationDossierProjection {
  headline: string;
  subheadline: string | null;
  strongestSignalLabel: string | null;
  strongestSignal: string | null;
  caseLevel: DossierCaseLevel;
  tags: string[];
  evidenceCount: number;
  conflictedCount: number;
  unverifiedCount: number;
  modules: DossierModule[];
}

const BUSINESS_TERMS = [
  'provides', 'platform', 'software', 'service', 'tool', 'app', 'saas', 'marketplace',
  'product', 'offers', 'helps', 'enables', '事業', 'サービス', 'ソフトウェア', '提供',
];

const DISTRIBUTION_TERMS = [
  'first customer', 'customer acquisition', 'organic', 'viral', 'build-in-public', 'build in public',
  'twitter', 'x ', 'x(', 'hacker news', 'guest blog', 'guest article', 'seo', 'search', 'referral',
  'affiliate', 'product hunt', 'marketing', 'launch', '初期', '集客', '紹介', '検索', 'ローンチ',
];

const CUSTOMER_PROOF_TERMS = [
  'customer', 'saved', 'hours', 'before', 'after', 'approval', 'workflow', '導入', '削減', '顧客', '時間',
];

const FAILURE_TERMS = [
  'layoff', 'cash crisis', 'overhiring', 'failed', 'failure', 'pivot', 'shutdown', 'closed', 'stopped',
  'discontinued', 'decline', 'bankrupt', '赤字', '失敗', '撤退', '閉鎖', 'ピボット', 'レイオフ',
];

const PLATFORM_TERMS = [
  'uses_', 'subprocessor', 'distributes', 'markets_via', 'platform', 'processor', 'api', 'hosting',
];

const FINANCIAL_PRIORITY = [
  'net_profit',
  'operating_profit',
  'revenue',
  'mrr',
  'arr',
  'cumulative_revenue',
  'peak_monthly_revenue',
  'gross_margin',
  'net_margin',
  'operating_margin',
  'gross_profit',
  'cogs',
  'paying_customers',
  'customer_lifetime_value',
  'arpu',
  'customer_time_saved',
];

const STRONGEST_SIGNAL_PRIORITY = [
  'net_profit',
  'operating_profit',
  'revenue',
  'cumulative_revenue',
  'peak_monthly_revenue',
  'mrr',
  'arr',
  'customer_time_saved',
  'paying_customers',
  'headcount_full_time',
];

function normalized(value: string | null | undefined): string {
  return (value || '').toLocaleLowerCase();
}

function includesAny(text: string | null | undefined, terms: string[]): boolean {
  const value = normalized(text);
  return terms.some((term) => value.includes(term.toLocaleLowerCase()));
}

function compact(text: string, maxLength = 260): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

function unionEvidence(...groups: Array<string[] | undefined>): string[] {
  const ids = new Set<string>();
  for (const group of groups) {
    for (const id of group || []) ids.add(id);
  }
  return [...ids];
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function metricDate(item: FoundationMetricSignal): string | null {
  return item.pointInTime || item.periodEnd || item.periodStart;
}

function eventDate(item: FoundationEvent): string | null {
  return item.occurredAt;
}

function yearOf(value: string | null): string | null {
  return value ? value.slice(0, 4) : null;
}

function numericValue(value: number | string | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 1 : 2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 1 : 2)}k`;
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMetric(item: FoundationMetricSignal): string {
  if (item.value === null || item.value === undefined) return '未確認';
  return formatHumanMoney(item.value, item.currency, item.unit);
}

function formatMoneySignal(item: FoundationMoneySignal): string {
  return formatHumanMoney(item.amount, item.currency, item.unit, item.amountLabel);
}

function statusRank(status: FoundationVerificationStatus | string | undefined): number {
  if (status === 'SUPPORTED') return 5;
  if (status === 'CONFLICTED') return 3;
  if (status === 'UNVERIFIED') return 1;
  if (status === 'SUPERSEDED' || status === 'RETRACTED') return 0;
  return 2;
}

function metricScore(item: FoundationMetricSignal): number {
  const priorityIndex = FINANCIAL_PRIORITY.findIndex((key) => normalized(item.metricType) === key);
  const priority = priorityIndex >= 0 ? 100 - priorityIndex * 4 : 30;
  const recency = metricDate(item) ? Number(yearOf(metricDate(item)) || '0') : 0;
  return priority + statusRank(item.verificationStatus) * 10 + recency / 1000;
}

function chooseStrongestMetric(metrics: FoundationMetricSignal[]): FoundationMetricSignal | null {
  const supported = metrics.filter((item) => item.value !== null && item.verificationStatus !== 'RETRACTED');
  for (const metricType of STRONGEST_SIGNAL_PRIORITY) {
    const found = supported
      .filter((item) => normalized(item.metricType) === metricType)
      .sort((left, right) => statusRank(right.verificationStatus) - statusRank(left.verificationStatus) || String(metricDate(right) || '').localeCompare(String(metricDate(left) || '')))[0];
    if (found) return found;
  }
  return supported.sort((left, right) => metricScore(right) - metricScore(left))[0] || null;
}

function rowFromMetric(item: FoundationMetricSignal): DossierRow {
  const period = metricDate(item)?.slice(0, 10);
  const noteParts = [period, item.basis, item.scope].filter(Boolean);
  return {
    label: cleanMetricLabel(item.metricType),
    value: formatMetric(item),
    note: noteParts.join(' ・ ') || undefined,
    originType: item.originType,
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  };
}

function rowFromClaim(label: string, item: FoundationClaim): DossierRow {
  return {
    label,
    value: compact(cleanIntelligenceText(item.statement)),
    note: item.occurredAt ? item.occurredAt.slice(0, 10) : undefined,
    originType: item.originType,
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  };
}

function rowFromEvent(item: FoundationEvent): DossierRow {
  return {
    label: item.occurredAt ? item.occurredAt.slice(0, 10) : cleanMetricLabel(item.eventType),
    value: compact(cleanIntelligenceText(item.description)),
    originType: 'event',
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  };
}

function rowFromDerived(item: FoundationDerivedRecord): DossierRow {
  return {
    label: cleanMetricLabel(item.type),
    value: compact(cleanIntelligenceText(item.text)),
    note: typeof item.confidence === 'number' ? `確信度 ${item.confidence}` : undefined,
    originType: item.originType,
    verificationStatus: 'ANALYSIS',
    evidenceIds: item.supportingEvidenceIds,
  };
}

function rowFromObservation(item: FoundationObservation): DossierRow {
  return {
    label: item.kind ? cleanMetricLabel(item.kind) : '観測事実',
    value: compact(cleanIntelligenceText(item.text)),
    note: item.observedAt ? item.observedAt.slice(0, 10) : undefined,
    originType: item.originType,
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  };
}

function rowFromRelationship(item: FoundationRelationship): DossierRow {
  return {
    label: cleanMetricLabel(item.predicate),
    value: cleanIntelligenceText(item.object || '関連先ID未確認'),
    note: item.validFrom ? item.validFrom.slice(0, 10) : undefined,
    originType: 'relationship',
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  };
}

function makeModule(input: Omit<DossierModule, 'evidenceIds'> & { evidenceIds?: string[] }): DossierModule {
  return {
    ...input,
    evidenceIds: input.evidenceIds || unionEvidence(...input.rows.map((row) => row.evidenceIds)),
  };
}

function pickBusinessClaim(entity: FoundationBusinessCase): FoundationClaim | null {
  return entity.claims
    .filter((item) => item.verificationStatus !== 'RETRACTED')
    .sort((left, right) => {
      const leftMatch = includesAny(left.statement, BUSINESS_TERMS) ? 1 : 0;
      const rightMatch = includesAny(right.statement, BUSINESS_TERMS) ? 1 : 0;
      return rightMatch - leftMatch || statusRank(right.verificationStatus) - statusRank(left.verificationStatus) || (right.evidenceIds.length - left.evidenceIds.length);
    })[0] || null;
}

function buildBusinessDna(entity: FoundationBusinessCase): DossierModule | null {
  const businessClaim = pickBusinessClaim(entity);
  const pain = entity.derived.find((item) => includesAny(item.type, ['pain', 'wallet', 'savannah'])) ||
    entity.observations.find((item) => includesAny(item.text, ['pain', 'friction', 'manual', 'delay', '苦痛', '面倒']));
  if (!businessClaim && !pain) return null;

  const rows: DossierRow[] = [];
  if (businessClaim) rows.push(rowFromClaim('何を売っているか', businessClaim));
  if (pain) {
    rows.push('supportingEvidenceIds' in pain ? rowFromDerived(pain as FoundationDerivedRecord) : rowFromObservation(pain as FoundationObservation));
  }
  if (entity.domain) rows.push({ label: '公式ドメイン', value: entity.domain, evidenceIds: entity.evidenceIds });

  return makeModule({
    id: 'business-dna',
    kind: 'BUSINESS_DNA',
    section: 'CORE',
    title: '事業の正体',
    eyebrow: 'BUSINESS DNA',
    summary: businessClaim ? compact(businessClaim.statement, 180) : undefined,
    rows,
    body: [],
    importance: 100,
    analysis: Boolean(pain && 'supportingEvidenceIds' in pain),
  });
}

function buildMoneyMachine(entity: FoundationBusinessCase): DossierModule | null {
  const signals = entity.moneySignals
    .filter((item) => item.verificationStatus !== 'RETRACTED')
    .sort((left, right) => statusRank(right.verificationStatus) - statusRank(left.verificationStatus) || Number(right.amount !== null) - Number(left.amount !== null))
    .slice(0, 6);
  if (signals.length === 0) return null;

  const rows = signals.map((item): DossierRow => ({
    label: humanize(item.moneyType),
    value: formatMoneySignal(item),
    note: item.purpose ? compact(item.purpose, 150) : item.basis || undefined,
    originType: item.originType,
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  }));

  return makeModule({
    id: 'money-machine',
    kind: 'MONEY_MACHINE',
    section: 'CORE',
    title: '金の流れ',
    eyebrow: 'MONEY MACHINE',
    rows,
    body: [],
    importance: 96,
    analysis: false,
  });
}

function buildFirstCash(entity: FoundationBusinessCase): DossierModule | null {
  const eventRows = entity.events
    .filter((item) => includesAny(`${item.eventType} ${item.description}`, ['first_sale', 'first sale', 'launch', 'product_launch', 'first paid', 'first customer', '初売上', '初課金']))
    .sort((left, right) => String(eventDate(left) || '').localeCompare(String(eventDate(right) || '')))
    .slice(0, 4)
    .map(rowFromEvent);

  const metricRows = entity.metrics
    .filter((item) => includesAny(item.metricType, ['subscription_payment', 'first', 'early_revenue', 'monthly_revenue']))
    .sort((left, right) => String(metricDate(left) || '').localeCompare(String(metricDate(right) || '')))
    .slice(0, 4)
    .map(rowFromMetric);

  const claimRows = entity.claims
    .filter((item) => includesAny(item.statement, ['first paying', 'first paid', 'first customer', 'first sale', '最初の有料', '初課金', '初売上']))
    .slice(0, 2)
    .map((item) => rowFromClaim('初動', item));

  const rows = [...eventRows, ...metricRows, ...claimRows];
  if (rows.length === 0) return null;

  return makeModule({
    id: 'first-cash',
    kind: 'FIRST_CASH',
    section: 'CORE',
    title: '最初の金が入るまで',
    eyebrow: 'FIRST CASH',
    rows,
    body: [],
    importance: 94,
    analysis: false,
  });
}

function buildDistribution(entity: FoundationBusinessCase): DossierModule | null {
  const claimRows = entity.claims
    .filter((item) => includesAny(item.statement, DISTRIBUTION_TERMS))
    .sort((left, right) => statusRank(right.verificationStatus) - statusRank(left.verificationStatus))
    .slice(0, 5)
    .map((item) => rowFromClaim('獲得経路', item));
  const relationRows = entity.relationships
    .filter((item) => includesAny(item.predicate, ['distributes', 'markets_via', 'referral', 'affiliate', 'channel']))
    .slice(0, 3)
    .map(rowFromRelationship);
  const rows = [...claimRows, ...relationRows];
  if (rows.length === 0) return null;

  return makeModule({
    id: 'distribution-engine',
    kind: 'DISTRIBUTION_ENGINE',
    section: 'CORE',
    title: '顧客獲得エンジン',
    eyebrow: 'DISTRIBUTION ENGINE',
    rows,
    body: [],
    importance: 91,
    analysis: false,
  });
}

function buildPricing(entity: FoundationBusinessCase): DossierModule | null {
  const metrics = entity.metrics
    .filter((item) => includesAny(item.metricType, ['price', 'pricing', 'subscription_price']))
    .sort((left, right) => String(metricDate(left) || '').localeCompare(String(metricDate(right) || '')))
    .slice(0, 8);
  const historyClaims = entity.claims
    .filter((item) => includesAny(item.statement, ['pricing', 'price', '$5', '$10', '$15', '値上げ', '価格']))
    .slice(0, 3);
  if (metrics.length === 0 && historyClaims.length === 0) return null;

  const rows = [
    ...metrics.map(rowFromMetric),
    ...historyClaims.map((item) => rowFromClaim('価格履歴・条件', item)),
  ];

  return makeModule({
    id: 'pricing',
    kind: 'PRICING',
    section: 'CORE',
    title: metrics.length >= 2 || historyClaims.length > 0 ? '価格と価格変遷' : '価格',
    eyebrow: metrics.length >= 2 || historyClaims.length > 0 ? 'PRICE EVOLUTION' : 'PRICING',
    rows,
    body: [],
    importance: 88,
    analysis: false,
  });
}

function buildFinancials(entity: FoundationBusinessCase): DossierModule | null {
  const rows = entity.metrics
    .filter((item) => FINANCIAL_PRIORITY.some((key) => normalized(item.metricType) === key))
    .filter((item) => item.value !== null)
    .sort((left, right) => metricScore(right) - metricScore(left))
    .slice(0, 10)
    .map(rowFromMetric);
  if (rows.length === 0) return null;

  return makeModule({
    id: 'financial-xray',
    kind: 'FINANCIAL_XRAY',
    section: 'FINANCIALS',
    title: '財務レントゲン',
    eyebrow: 'FINANCIAL X-RAY',
    rows,
    body: [],
    importance: 100,
    analysis: false,
  });
}

function buildLeverage(entity: FoundationBusinessCase): DossierModule | null {
  const teamMetrics = entity.metrics.filter((item) => includesAny(item.metricType, ['team_size', 'headcount']));
  if (teamMetrics.length === 0) return null;

  const latestTeam = [...teamMetrics].sort((left, right) => String(metricDate(right) || '').localeCompare(String(metricDate(left) || '')))[0];
  const teamSize = numericValue(latestTeam.value);
  if (teamSize === null || teamSize <= 0) return null;

  const rows: DossierRow[] = [rowFromMetric(latestTeam)];
  const teamYear = yearOf(metricDate(latestTeam));
  const sameYearMetrics = entity.metrics.filter((item) => {
    const type = normalized(item.metricType);
    return (type === 'revenue' || type === 'net_profit' || type === 'operating_profit') && yearOf(metricDate(item)) === teamYear;
  });

  for (const item of sameYearMetrics.slice(0, 3)) {
    const value = numericValue(item.value);
    if (value === null) continue;
    const perPerson = value / teamSize;
    rows.push({
      label: `${humanize(item.metricType)} / 人`,
      value: item.currency ? `${item.currency} ${formatNumber(perPerson)}` : formatNumber(perPerson),
      note: `${humanize(item.metricType)} ÷ ${formatNumber(teamSize)}人（同一年の公開値から計算）`,
      originType: 'calculated',
      verificationStatus: item.verificationStatus === 'SUPPORTED' && latestTeam.verificationStatus === 'SUPPORTED' ? 'SUPPORTED' : 'UNVERIFIED',
      evidenceIds: unionEvidence(item.evidenceIds, latestTeam.evidenceIds),
    });
  }

  return makeModule({
    id: 'leverage',
    kind: 'LEVERAGE',
    section: 'FINANCIALS',
    title: '人員レバレッジ',
    eyebrow: 'LEVERAGE',
    rows,
    body: [],
    importance: 88,
    analysis: rows.some((row) => row.originType === 'calculated'),
  });
}

function buildCustomerProof(entity: FoundationBusinessCase): DossierModule | null {
  const metricRows = entity.metrics
    .filter((item) => includesAny(item.metricType, ['customer_time_saved', 'customer_outcome', 'conversion', 'retention']))
    .slice(0, 5)
    .map(rowFromMetric);
  const claimRows = entity.claims
    .filter((item) => includesAny(item.statement, CUSTOMER_PROOF_TERMS) && includesAny(item.statement, ['customer', 'client', '顧客', '導入']))
    .slice(0, 4)
    .map((item) => rowFromClaim('顧客事例', item));
  const relationshipRows = entity.relationships
    .filter((item) => includesAny(item.predicate, ['customer']))
    .slice(0, 3)
    .map(rowFromRelationship);
  const rows = [...metricRows, ...claimRows, ...relationshipRows];
  if (rows.length === 0) return null;

  return makeModule({
    id: 'customer-proof',
    kind: 'CUSTOMER_PROOF',
    section: 'CORE',
    title: '顧客が実際に得た価値',
    eyebrow: 'CUSTOMER PROOF',
    rows,
    body: [],
    importance: 86,
    analysis: false,
  });
}

function buildFailurePivot(entity: FoundationBusinessCase): DossierModule | null {
  const eventRows = entity.events
    .filter((item) => includesAny(`${item.eventType} ${item.description}`, FAILURE_TERMS))
    .sort((left, right) => String(eventDate(left) || '').localeCompare(String(eventDate(right) || '')))
    .map(rowFromEvent);
  const claimRows = entity.claims
    .filter((item) => includesAny(item.statement, FAILURE_TERMS))
    .slice(0, 5)
    .map((item) => rowFromClaim('失敗・転換', item));
  const rows = [...eventRows, ...claimRows].slice(0, 8);
  if (rows.length === 0) return null;

  return makeModule({
    id: 'failure-pivot',
    kind: 'FAILURE_PIVOT',
    section: 'CORE',
    title: '失敗・ピボット・復活',
    eyebrow: 'FAILURE / PIVOT',
    rows,
    body: [],
    importance: 84,
    analysis: false,
  });
}

function buildCapitalControl(entity: FoundationBusinessCase): DossierModule | null {
  const signals = entity.moneySignals
    .filter((item) => includesAny(item.moneyType, ['funding', 'share_buyback', 'secondary', 'profit_share', 'acquisition', 'exit']))
    .slice(0, 8);
  if (signals.length === 0) return null;

  const rows = signals.map((item): DossierRow => ({
    label: humanize(item.moneyType),
    value: formatMoneySignal(item),
    note: item.purpose ? compact(item.purpose, 150) : item.basis || undefined,
    originType: item.originType,
    verificationStatus: item.verificationStatus,
    evidenceIds: item.evidenceIds,
  }));

  return makeModule({
    id: 'capital-control',
    kind: 'CAPITAL_CONTROL',
    section: 'CORE',
    title: '資本政策・所有権の動き',
    eyebrow: 'CAPITAL CONTROL',
    rows,
    body: [],
    importance: 80,
    analysis: false,
  });
}

function buildPlatformDependency(entity: FoundationBusinessCase): DossierModule | null {
  const relationshipRows = entity.relationships
    .filter((item) => includesAny(item.predicate, PLATFORM_TERMS))
    .slice(0, 8)
    .map(rowFromRelationship);
  const techRows = entity.observations
    .filter((item) => includesAny(item.text, ['tech stack', 'stack', 'api', 'stripe', 'aws', 'cloudflare', 'vercel', 'supabase', 'openai', 'anthropic']))
    .slice(0, 3)
    .map(rowFromObservation);
  const rows = [...relationshipRows, ...techRows];
  if (rows.length === 0) return null;

  return makeModule({
    id: 'platform-dependency',
    kind: 'PLATFORM_DEPENDENCY',
    section: 'RISK',
    title: '外部プラットフォーム・配管依存',
    eyebrow: 'PLATFORM DEPENDENCY',
    rows,
    body: [],
    importance: 82,
    analysis: false,
  });
}

function buildTransferableMechanism(entity: FoundationBusinessCase): DossierModule | null {
  const rows: DossierRow[] = [];

  const business = pickBusinessClaim(entity);
  if (business && business.evidenceIds.length > 0) {
    rows.push({ ...rowFromClaim('商品化点', business), label: '商品化点' });
  }

  const distribution = entity.claims.find((item) =>
    item.verificationStatus === 'SUPPORTED' &&
    item.evidenceIds.length > 0 &&
    includesAny(item.statement, DISTRIBUTION_TERMS)
  );
  if (distribution) {
    rows.push({ ...rowFromClaim('集客配管', distribution), label: '集客配管' });
  }

  const pricing = entity.metrics
    .filter((item) => item.verificationStatus === 'SUPPORTED' && item.evidenceIds.length > 0 && includesAny(item.metricType, ['price', 'pricing', 'subscription_price']))
    .sort((left, right) => metricScore(right) - metricScore(left))[0];
  if (pricing) {
    rows.push({ ...rowFromMetric(pricing), label: '課金構造' });
  }

  const money = entity.moneySignals.find((item) =>
    item.verificationStatus === 'SUPPORTED' && item.evidenceIds.length > 0
  );
  if (money) {
    rows.push({
      label: '金の流れ',
      value: formatMoneySignal(money),
      note: money.purpose ? compact(money.purpose, 150) : money.basis || undefined,
      originType: money.originType,
      verificationStatus: money.verificationStatus,
      evidenceIds: money.evidenceIds,
    });
  }

  const platform = entity.relationships.find((item) =>
    item.verificationStatus === 'SUPPORTED' &&
    item.evidenceIds.length > 0 &&
    includesAny(item.predicate, PLATFORM_TERMS)
  );
  if (platform) {
    rows.push({ ...rowFromRelationship(platform), label: '外部レバー' });
  }

  const analyticalPain = entity.derived.find((item) =>
    item.supportingEvidenceIds.length > 0 &&
    includesAny(item.type, ['pain', 'wallet', 'stage_glitch', 'buyer_psychology'])
  );
  if (analyticalPain) {
    rows.push({ ...rowFromDerived(analyticalPain), label: '分析された急所' });
  }

  if (rows.length < 2) return null;
  return makeModule({
    id: 'transferable-mechanism',
    kind: 'TRANSFERABLE_MECHANISM',
    section: 'PLAYBOOK',
    title: '転用候補になる構造部品',
    eyebrow: 'STEAL THIS',
    summary: '根拠がある構造部品だけを並べる。因果関係や再現性そのものは別途検証が必要。',
    rows: rows.slice(0, 6),
    body: [],
    importance: 96,
    analysis: true,
  });
}

function buildDerivedModule(
  entity: FoundationBusinessCase,
  options: {
    id: string;
    kind: DossierModuleKind;
    section: DossierSection;
    title: string;
    eyebrow: string;
    terms: string[];
    importance: number;
  }
): DossierModule | null {
  const derived = entity.derived
    .filter((item) => includesAny(item.type, options.terms))
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
    .slice(0, 5);
  if (derived.length === 0) return null;
  const rows = derived.map(rowFromDerived);
  return makeModule({
    id: options.id,
    kind: options.kind,
    section: options.section,
    title: options.title,
    eyebrow: options.eyebrow,
    rows,
    body: [],
    importance: options.importance,
    analysis: true,
  });
}

function buildCounterEvidence(entity: FoundationBusinessCase): DossierModule | null {
  const rows: DossierRow[] = [];
  entity.metrics.filter((item) => item.verificationStatus === 'CONFLICTED').slice(0, 5).forEach((item) => rows.push(rowFromMetric(item)));
  entity.claims.filter((item) => item.verificationStatus === 'CONFLICTED').slice(0, 4).forEach((item) => rows.push(rowFromClaim('矛盾する主張', item)));
  entity.observations.filter((item) => item.verificationStatus === 'CONFLICTED').slice(0, 4).forEach((item) => rows.push(rowFromObservation(item)));
  entity.derived.filter((item) => includesAny(item.type, ['fragility', 'counter', 'rejected'])).slice(0, 4).forEach((item) => rows.push(rowFromDerived(item)));
  if (rows.length === 0) return null;

  return makeModule({
    id: 'counter-evidence',
    kind: 'COUNTER_EVIDENCE',
    section: 'RISK',
    title: '反証・矛盾',
    eyebrow: 'COUNTER EVIDENCE',
    rows,
    body: [],
    importance: 96,
    analysis: rows.some((row) => row.verificationStatus === 'ANALYSIS'),
  });
}

function buildResearchLimit(entity: FoundationBusinessCase): DossierModule | null {
  const rows: DossierRow[] = [];
  entity.metrics
    .filter((item) => item.verificationStatus === 'UNVERIFIED')
    .slice(0, 4)
    .forEach((item) => rows.push(rowFromMetric(item)));
  entity.moneySignals
    .filter((item) => item.verificationStatus === 'UNVERIFIED' || item.amount === null)
    .slice(0, 5)
    .forEach((item) => rows.push({
      label: humanize(item.moneyType),
      value: formatMoneySignal(item),
      note: item.purpose || item.basis || undefined,
      originType: item.originType,
      verificationStatus: item.verificationStatus,
      evidenceIds: item.evidenceIds,
    }));
  entity.observations
    .filter((item) => item.verificationStatus === 'UNVERIFIED' || item.originType === 'unknown')
    .slice(0, 5)
    .forEach((item) => rows.push(rowFromObservation(item)));

  if (rows.length === 0) return null;
  return makeModule({
    id: 'research-limit',
    kind: 'RESEARCH_LIMIT',
    section: 'RISK',
    title: '調査限界・未確認',
    eyebrow: 'RESEARCH LIMIT',
    rows: rows.slice(0, 10),
    body: [],
    importance: 70,
    analysis: false,
  });
}

function evidenceCount(entity: FoundationBusinessCase): number {
  return unionEvidence(
    entity.evidenceIds,
    ...entity.claims.map((item) => item.evidenceIds),
    ...entity.metrics.map((item) => item.evidenceIds),
    ...entity.moneySignals.map((item) => item.evidenceIds),
    ...entity.events.map((item) => item.evidenceIds),
    ...entity.relationships.map((item) => item.evidenceIds),
    ...entity.observations.map((item) => item.evidenceIds),
    ...entity.derived.map((item) => item.supportingEvidenceIds),
  ).length;
}

function headlineFor(entity: FoundationBusinessCase): string {
  const hook = entity.derived.find((item) => normalized(item.type) === 'hook');
  if (hook) return compact(cleanIntelligenceText(hook.text), 190);
  const businessClaim = pickBusinessClaim(entity);
  if (businessClaim) return compact(cleanIntelligenceText(businessClaim.statement), 190);
  const fallback = entity.valueProfile.businessSignal || entity.valueProfile.painSignal || entity.name;
  return compact(cleanIntelligenceText(fallback), 190);
}

function caseLevelFor(moduleCount: number, evidence: number): DossierCaseLevel {
  if (moduleCount >= 8 && evidence >= 5) return 'FULL_DOSSIER';
  if (moduleCount >= 3) return 'FOCUSED_CASE';
  if (moduleCount >= 1) return 'SIGNAL';
  return 'RELATED_ENTITY';
}

export function buildFoundationDossierProjection(entity: FoundationBusinessCase): FoundationDossierProjection {
  const modules = [
    buildBusinessDna(entity),
    buildMoneyMachine(entity),
    buildFirstCash(entity),
    buildDistribution(entity),
    buildPricing(entity),
    buildCustomerProof(entity),
    buildFailurePivot(entity),
    buildCapitalControl(entity),
    buildFinancials(entity),
    buildLeverage(entity),
    buildDerivedModule(entity, {
      id: 'market-glitch',
      kind: 'MARKET_GLITCH',
      section: 'CORE',
      title: '突いた市場の歪み',
      eyebrow: 'MARKET GLITCH',
      terms: ['stage_glitch', 'market_glitch', 'market_distortion', 'arbitrage'],
      importance: 90,
    }),
    buildDerivedModule(entity, {
      id: 'moat',
      kind: 'MOAT',
      section: 'CORE',
      title: '参入障壁・大手の制約',
      eyebrow: 'MOAT / INCUMBENT DILEMMA',
      terms: ['moat', 'incumbent_dilemma', 'competitive_cannibalization_barrier', 'lock_in'],
      importance: 86,
    }),
    buildTransferableMechanism(entity),
    buildDerivedModule(entity, {
      id: 'reality-check',
      kind: 'REALITY_CHECK',
      section: 'PLAYBOOK',
      title: '今から真似する時の現実',
      eyebrow: 'REALITY CHECK / DON\'T COPY',
      terms: ['fragility', 'why_now', 'white_space'],
      importance: 94,
    }),
    buildPlatformDependency(entity),
    buildCounterEvidence(entity),
    buildResearchLimit(entity),
  ].filter((item): item is DossierModule => Boolean(item));

  const sectionOrder: Record<DossierSection, number> = { CORE: 0, FINANCIALS: 1, PLAYBOOK: 2, RISK: 3 };
  modules.sort((left, right) => sectionOrder[left.section] - sectionOrder[right.section] || right.importance - left.importance);

  const strongest = chooseStrongestMetric(entity.metrics);
  const evidence = evidenceCount(entity);
  const conflicts = [
    ...entity.metrics,
    ...entity.claims,
    ...entity.moneySignals,
    ...entity.events,
    ...entity.relationships,
    ...entity.observations,
  ].filter((item) => item.verificationStatus === 'CONFLICTED').length;
  const unverified = [
    ...entity.metrics,
    ...entity.claims,
    ...entity.moneySignals,
    ...entity.events,
    ...entity.relationships,
    ...entity.observations,
  ].filter((item) => item.verificationStatus === 'UNVERIFIED').length;

  const coreTags = modules
    .filter((item) => item.section === 'CORE' || item.section === 'PLAYBOOK')
    .slice(0, 6)
    .map((item) => item.eyebrow);

  return {
    headline: headlineFor(entity),
    subheadline: entity.valueProfile.painSignal || entity.valueProfile.mechanismSignal || entity.valueProfile.tractionSignal,
    strongestSignalLabel: strongest ? humanize(strongest.metricType) : entity.valueProfile.moneySignal ? 'Money Signal' : null,
    strongestSignal: strongest ? formatMetric(strongest) : entity.valueProfile.moneySignal,
    caseLevel: caseLevelFor(modules.length, evidence),
    tags: coreTags,
    evidenceCount: evidence,
    conflictedCount: conflicts,
    unverifiedCount: unverified,
    modules,
  };
}

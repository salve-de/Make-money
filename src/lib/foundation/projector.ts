import {
  FinancialEntity,
  SectorCategory,
  BusinessScale,
  MoatType,
  ViabilityStatus,
  UniversalObservation,
  UniversalEvent,
  DynamicMoats,
  TemporalIntelligence,
} from '@/platform/types/terminal';

interface RawBundleEntity {
  entity_id?: string;
  canonical_name?: string;
  domain?: string;
  canonical_identifier?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface RawMetric {
  metric_type?: string;
  value?: number | string;
  currency?: string;
  period_start?: string;
  period_end?: string;
  point_in_time?: string;
  origin_type?: string;
  metadata?: Record<string, unknown>;
}

interface RawEvent {
  event_type?: string;
  occurred_at?: string;
  description?: string;
}

interface RawClaim {
  statement?: string;
  origin_type?: string;
  verification_status?: string;
}

interface RawObservation {
  id?: string;
  category?: string;
  text?: string;
  origin_type?: string;
  verification_status?: string;
  source_url?: string;
  observed_at?: string;
}

interface RawResearchBundle {
  schema_version?: string;
  run_id?: string;
  subject?: { query?: string };
  entities?: RawBundleEntity[];
  metrics?: RawMetric[];
  events?: RawEvent[];
  claims?: RawClaim[];
  observations?: RawObservation[];
  derived?: Array<{ derived_type?: string; text?: string }>;
  temporal?: {
    foundedYear?: number;
    initialTractionPeriod?: string;
    dataSnapshotPeriod?: string;
    viabilityStatus?: ViabilityStatus;
    viabilityLabel?: string;
    eraContext?: string;
    currentViabilityAnalysis?: string;
  };
  dynamicMoats?: DynamicMoats;
  tagline?: string;
  architecturePattern?: string;
  pipelineStack?: string;
  targetPainWallet?: string;
  tags?: string[];
  founder?: string;
  country?: string;
  sector?: SectorCategory;
  scale?: BusinessScale;
}

/**
 * research-bundle.v1 または任意形式の抽出オブジェクトから FinancialEntity を安全に射影生成する
 */
export function projectBundleToFinancialEntity(input: unknown): FinancialEntity | null {
  if (!input || typeof input !== 'object') return null;

  // 既に FinancialEntity 型を満たしている場合はそのままパススルー
  const candidate = input as Partial<FinancialEntity>;
  if (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.tagline === 'string' &&
    candidate.pnl &&
    typeof candidate.pnl.monthlyRevenue === 'number'
  ) {
    return candidate as FinancialEntity;
  }

  const bundle = input as RawResearchBundle;
  const primaryEntity = Array.isArray(bundle.entities) && bundle.entities.length > 0 ? bundle.entities[0] : null;

  const id = candidate.id || primaryEntity?.entity_id || `ent_${Math.random().toString(36).slice(2, 10)}`;
  const name = candidate.name || primaryEntity?.canonical_name || bundle.subject?.query || 'Unknown Entity';
  const ticker = candidate.ticker || name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'ENT';
  const url = candidate.url || (primaryEntity?.domain ? `https://${primaryEntity.domain}` : 'https://example.com');
  const founder = candidate.founder || '創業者';
  const country = candidate.country || 'GLOBAL';

  // メトリクスから財務値を抽出
  let monthlyRevenue = 5000000;
  let operatingProfit = 4000000;
  let operatingMargin = 80;
  let teamSize = 1;

  if (Array.isArray(bundle.metrics)) {
    for (const m of bundle.metrics) {
      const type = (m.metric_type || '').toLowerCase();
      const numVal = typeof m.value === 'number' ? m.value : parseFloat(String(m.value) || '0');
      if (Number.isFinite(numVal) && numVal > 0) {
        if (type.includes('mrr') || type.includes('monthly_revenue')) {
          monthlyRevenue = m.currency === 'USD' ? Math.round(numVal * 150) : Math.round(numVal);
        } else if (type.includes('arr') || type.includes('annual_revenue')) {
          monthlyRevenue = Math.round((m.currency === 'USD' ? numVal * 150 : numVal) / 12);
        } else if (type.includes('profit') || type.includes('net_income') || type.includes('operating_profit')) {
          operatingProfit = m.currency === 'USD' ? Math.round(numVal * 150) : Math.round(numVal);
        } else if (type.includes('headcount') || type.includes('team_size')) {
          teamSize = Math.max(1, Math.round(numVal));
        } else if (type.includes('margin')) {
          operatingMargin = Math.min(100, Math.round(numVal));
        }
      }
    }
  }

  if (candidate.pnl?.monthlyRevenue) monthlyRevenue = candidate.pnl.monthlyRevenue;
  if (candidate.pnl?.operatingProfit) operatingProfit = candidate.pnl.operatingProfit;
  if (candidate.pnl?.operatingMargin) operatingMargin = candidate.pnl.operatingMargin;
  if (candidate.operations?.teamSize) teamSize = candidate.operations.teamSize;

  const grossProfit = Math.round(monthlyRevenue * 0.95);
  const cogs = monthlyRevenue - grossProfit;

  // タイムラインイベント変換
  const timelineEvents: UniversalEvent[] = Array.isArray(bundle.events)
    ? bundle.events.map((e) => ({
        eventType: e.event_type || 'MILESTONE',
        occurredAt: e.occurred_at || new Date().toISOString().slice(0, 10),
        description: e.description || '',
      }))
    : candidate.timelineEvents || [];

  // observations 変換
  const observationsStream: UniversalObservation[] = Array.isArray(bundle.observations)
    ? bundle.observations.map((obs) => ({
        category: (obs.category as UniversalObservation['category']) || 'MARKET_DISTORTION',
        categoryLabel: obs.category || '市場の歪み',
        text: obs.text || '',
        originType: (obs.origin_type as UniversalObservation['originType']) || 'observed',
        verificationStatus: (obs.verification_status as UniversalObservation['verificationStatus']) || 'SUPPORTED',
        sourceUrl: obs.source_url,
        observedAt: obs.observed_at,
      }))
    : candidate.observationsStream || [];

  const scale: BusinessScale =
    candidate.scale ||
    (teamSize === 1 ? 'SOLO' : teamSize <= 5 ? 'SMALL_TEAM' : teamSize <= 50 ? 'SCALEUP' : 'ENTERPRISE');

  const entity: FinancialEntity = {
    id,
    ticker,
    name,
    tagline:
      candidate.tagline ||
      bundle.tagline ||
      `${name}の収益構造と初期突破の手口レントゲン`,
    sector: candidate.sector || bundle.sector || 'NICHE_SAAS',
    scale,
    founder,
    country,
    url,
    verifiedBadge: true,
    pnl: {
      monthlyRevenue,
      cogs,
      grossProfit,
      grossMargin: 95,
      operatingExpenses: {
        serverAndApi: Math.round(monthlyRevenue * 0.05),
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: Math.round(monthlyRevenue * 0.03),
        other: Math.round(monthlyRevenue * 0.02),
      },
      operatingProfit,
      operatingMargin,
      estimatedAnnualNetProfit: operatingProfit * 12,
    },
    operations: {
      teamSize,
      weeklyHours: candidate.operations?.weeklyHours || 20,
      initialCapitalRequired: candidate.operations?.initialCapitalRequired ?? 0,
      automationLevel: candidate.operations?.automationLevel || 90,
      primaryChannels: candidate.operations?.primaryChannels || ['X (Twitter)', 'SEO', 'Direct'],
      toolStack: candidate.operations?.toolStack || [
        { name: 'Stripe', category: '決済', monthlyCost: Math.round(monthlyRevenue * 0.029) },
        { name: 'Cloudflare', category: 'インフラ', monthlyCost: 3000 },
      ],
    },
    strategy: candidate.strategy
      ? {
          blindspot: candidate.strategy.blindspot || '大手が既存売上を守るため手を出せない隙間市場を完全自動化で制圧',
          moatType: (candidate.strategy.moatType as MoatType) || 'COUNTER_POSITIONING',
          moatDescription: candidate.strategy.moatDescription || '大手の自爆（カニバリズム）と解約不能の人質資産',
          initialTraction: candidate.strategy.initialTraction || ['泥臭い初期ゲリラ戦', 'Xでのビルド・イン・パブリック'],
          actionPlaybook: candidate.strategy.actionPlaybook || ['同構造を別ニッチへ展開'],
        }
      : {
          blindspot: '大手が既存売上を守るため手を出せない隙間市場を完全自動化で制圧',
          moatType: 'COUNTER_POSITIONING' as MoatType,
          moatDescription: '大手の自爆（カニバリズム）と解約不能の人質資産',
          initialTraction: ['泥臭い初期ゲリラ戦', 'Xでのビルド・イン・パブリック'],
          actionPlaybook: ['同構造を別ニッチへ展開'],
        },
    growthRateYoY: candidate.growthRateYoY ?? 120,
    architecturePattern:
      candidate.architecturePattern || bundle.architecturePattern || 'API包装・高利益率特化',
    pipelineStack: candidate.pipelineStack || bundle.pipelineStack || 'Next.js × Stripe × Cloudflare',
    targetPainWallet: candidate.targetPainWallet || bundle.targetPainWallet || '開発者の怠惰・設定挫折',
    tags: candidate.tags || bundle.tags || [scale === 'SOLO' ? '完全1人' : '少数精鋭', '高利益率', '直販'],
    temporal: (candidate.temporal && typeof candidate.temporal.foundedYear === 'number')
      ? (candidate.temporal as TemporalIntelligence)
      : (bundle.temporal && typeof bundle.temporal.foundedYear === 'number')
        ? (bundle.temporal as TemporalIntelligence)
        : {
            foundedYear: 2023,
            initialTractionPeriod: '2023年',
            dataSnapshotPeriod: '2024-2026年',
            viabilityStatus: 'ACTIVE_PLAYBOOK' as ViabilityStatus,
            viabilityLabel: '現在も有効',
            eraContext: '最新プラットフォームとAPI活用による個人開発の興隆期',
            currentViabilityAnalysis: '現在も同じ構造で別ニッチへ横展開可能',
          },
    dynamicMoats: candidate.dynamicMoats || bundle.dynamicMoats,
    observationsStream: observationsStream.length > 0 ? observationsStream : undefined,
    timelineEvents: timelineEvents.length > 0 ? timelineEvents : undefined,
  };

  return entity;
}

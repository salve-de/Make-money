import type { FinancialEntity, ViabilityStatus } from '@/shared/terminal';

export type DiscoveryLens =
  | 'SURPRISE'
  | 'BIG_CASH'
  | 'LOW_CAPITAL'
  | 'SOLO'
  | 'LOW_WORK'
  | 'CURRENT'
  | 'FAILURE';

export interface DiscoveryMechanism {
  id: string;
  label: string;
}

export interface DiscoveryCase {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  resultLabel: string;
  resultValue: string;
  resultAmountJpy: number | null;
  startLine: string;
  criticalInsight: string;
  whyMoneyMoved: string;
  leverage: string;
  mechanism: DiscoveryMechanism;
  mechanismCount: number;
  currentLabel: string;
  currentDetail: string;
  isCurrent: boolean;
  isFailure: boolean;
  isSolo: boolean;
  lowCapital: boolean;
  lowWork: boolean;
  evidenceCount: number;
  descriptors: Array<{ label: string; value: string }>;
  related: Array<{ id: string; name: string; resultValue: string }>;
  scores: Record<DiscoveryLens, number>;
}

export interface DiscoveryDataset {
  sourceCount: number;
  visibleCount: number;
  cases: DiscoveryCase[];
  mechanisms: Array<{ id: string; label: string; count: number }>;
  highlights: DiscoveryCase[];
}

const SECTOR_LABELS: Record<string, string> = {
  AI_AUTOMATION: 'AI・自動化',
  NICHE_SAAS: '特化SaaS',
  MONOPOLY_MFG: '製造・独占',
  CONTENT_MEDIA: 'メディア',
  PHYSICAL_ASSET: '実物資産',
  FINTECH_INFRA: '金融・決済',
  LOCAL_SERVICES: '地域サービス',
};

const MECHANISMS: Array<{ id: string; label: string; re: RegExp }> = [
  {
    id: 'toll',
    label: '他人の取引から取る',
    re: /手数料|仲介|中抜き|通行税|marketplace|マーケットプレイス|決済|紹介料|送客|broker|仲介料/iu,
  },
  {
    id: 'automation',
    label: '高額な人力を技術で低原価化',
    re: /AI|自動化|自動|API|省人|効率化|無人|OCR|生成/iu,
  },
  {
    id: 'recurring',
    label: '継続課金で積み上げる',
    re: /サブスク|月額|年額|継続課金|subscription|ARR|MRR|リカーリング/iu,
  },
  {
    id: 'direct',
    label: '流通を飛ばして直接取る',
    re: /直販|D2C|中間業者|相見積|代理店.*飛ば|direct/iu,
  },
  {
    id: 'audience',
    label: '人を集めて別の財布から取る',
    re: /広告|メディア|newsletter|ニュースレター|affiliate|アフィリ|スポンサー|掲載料/iu,
  },
  {
    id: 'asset',
    label: '一度作った資産を繰り返し売る',
    re: /テンプレ|デジタル商品|ライセンス|ソフトウェア|SaaS|コンテンツ|教材|プラグイン|extension/iu,
  },
  {
    id: 'scarcity',
    label: '希少性・独占で価格決定力を持つ',
    re: /独占|希少|ブランド|monopoly|cornered|限定|供給制約/iu,
  },
];

function compact(value: string | undefined | null, max = 150): string {
  const text = (value || '').replace(/\s+/gu, ' ').trim();
  if (!text) return '';
  const first = text.split(/(?<=[。！？!?])\s*/u)[0] || text;
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

function formatJpy(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) {
    const n = abs / 100_000_000;
    return `${sign}¥${n >= 10 ? n.toFixed(0) : n.toFixed(1)}億`;
  }
  if (abs >= 10_000) return `${sign}¥${Math.round(abs / 10_000).toLocaleString()}万`;
  return `${sign}¥${Math.round(abs).toLocaleString()}`;
}

function resultOf(entity: FinancialEntity): {
  label: string;
  value: string;
  amount: number | null;
} {
  const pnl = entity.pnl;
  if (
    pnl.financialStatus === 'POST_MORTEM' ||
    (!pnl.isOperatingProfitUnconfirmed && pnl.operatingProfit < 0)
  ) {
    if (!pnl.isOperatingProfitUnconfirmed && pnl.operatingProfit !== 0) {
      return { label: '月間営業損失', value: formatJpy(pnl.operatingProfit), amount: pnl.operatingProfit };
    }
    return { label: '結果', value: '失敗・撤退', amount: null };
  }

  if (!pnl.isOperatingProfitUnconfirmed && pnl.operatingProfit > 0) {
    return { label: '月間営業利益', value: formatJpy(pnl.operatingProfit), amount: pnl.operatingProfit };
  }
  if (!pnl.isRevenueUnconfirmed && pnl.monthlyRevenue > 0) {
    return { label: '月商', value: formatJpy(pnl.monthlyRevenue), amount: pnl.monthlyRevenue };
  }
  if (pnl.revenueLabel) return { label: '売上', value: pnl.revenueLabel, amount: null };
  return { label: '結果', value: '金額未確認', amount: null };
}

function mechanismOf(entity: FinancialEntity): DiscoveryMechanism {
  const haystack = [
    entity.architecturePattern,
    entity.strategy?.secretInsight,
    entity.strategy?.blindspot,
    entity.strategy?.moatDescription,
    entity.lootBlueprint?.tollGateSetup,
    entity.lootBlueprint?.structuralFlaw,
    entity.targetPainWallet,
  ]
    .filter(Boolean)
    .join(' ');

  const found = MECHANISMS.find((item) => item.re.test(haystack));
  if (found) return { id: found.id, label: found.label };

  return {
    id: `sector:${entity.sector}`,
    label: `${SECTOR_LABELS[entity.sector] || 'その他'}で金を作る`,
  };
}

function viability(status: ViabilityStatus | undefined, label?: string, detail?: string) {
  const isCurrent = status === 'ACTIVE_PLAYBOOK' || status === 'RISING_WAVE';
  const fallback =
    status === 'MATURED_MOAT'
      ? '先行者優位が強い'
      : status === 'HISTORICAL_WINDOW'
        ? '当時限定'
        : status === 'EVOLVING_BARRIER'
          ? '条件が変化中'
          : '現在性未確認';
  return {
    isCurrent,
    label: compact(label, 38) || (isCurrent ? '現在も有効' : fallback),
    detail: compact(detail, 220) || '現在性の詳しい根拠は未確認です。',
  };
}

function startLineOf(entity: FinancialEntity): string {
  const parts: string[] = [];
  const ops = entity.operations;
  if (!ops.isTeamSizeUnconfirmed) {
    const team = ops.initialTeamSize ?? ops.teamSize;
    if (Number.isFinite(team) && team > 0) parts.push(team === 1 ? '1人開始' : `${team}人開始`);
  }
  if (!ops.isCapitalUnconfirmed && Number.isFinite(ops.initialCapitalRequired)) {
    parts.push(`初期 ${formatJpy(ops.initialCapitalRequired)}`);
  }
  if (entity.temporal?.foundedYear && entity.temporal.foundedYear > 0) {
    parts.push(`${entity.temporal.foundedYear}年開始`);
  }
  return parts.length > 0 ? parts.join(' / ') : '開始条件は一部未確認';
}

function criticalInsightOf(entity: FinancialEntity): string {
  return (
    compact(entity.strategy?.secretInsight, 190) ||
    compact(entity.lootBlueprint?.structuralFlaw, 190) ||
    compact(entity.strategy?.blindspot, 190) ||
    compact(entity.architecturePattern, 190) ||
    '決定的な急所は未整理'
  );
}

function whyMoneyMovedOf(entity: FinancialEntity): string {
  return (
    compact(entity.pricing?.psychologicalTrigger, 190) ||
    compact(entity.essence?.painRelief, 190) ||
    compact(entity.targetPainWallet, 190) ||
    compact(entity.essence?.targetCustomer, 190) ||
    '支払理由は未確認'
  );
}

function leverageOf(entity: FinancialEntity): string {
  return (
    compact(entity.lootBlueprint?.tollGateSetup, 190) ||
    compact(entity.meta?.capitalEfficiency?.incrementalMargin, 190) ||
    compact(entity.dynamicMoats?.upfrontCash?.detail, 190) ||
    compact(entity.strategy?.moatDescription, 190) ||
    'レバレッジの急所は未整理'
  );
}

function shockBase(entity: FinancialEntity, resultAmount: number | null): number {
  const ops = entity.operations;
  const result = Math.max(0, resultAmount || 0);
  let score = result > 0 ? Math.log10(result + 1) * 11 : 0;

  if (!ops.isTeamSizeUnconfirmed && (ops.initialTeamSize ?? ops.teamSize) === 1) score += 16;
  if (!ops.isCapitalUnconfirmed && ops.initialCapitalRequired <= 100_000) score += 14;
  if (!ops.isWeeklyHoursUnconfirmed && ops.weeklyHours > 0 && ops.weeklyHours <= 10) score += 14;
  if (!entity.pnl.isMarginUnconfirmed && entity.pnl.operatingMargin >= 50) score += 8;
  if ((entity.evidenceCards?.length || 0) >= 2) score += 5;
  if (entity.temporal?.viabilityStatus === 'ACTIVE_PLAYBOOK' || entity.temporal?.viabilityStatus === 'RISING_WAVE') score += 5;
  return score;
}

function descriptorsOf(entity: FinancialEntity): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];
  const ops = entity.operations;

  if (!ops.isTeamSizeUnconfirmed) items.push({ label: '体制', value: `${ops.teamSize}人` });
  if (!ops.isWeeklyHoursUnconfirmed && ops.weeklyHours > 0) items.push({ label: '週稼働', value: `${ops.weeklyHours}時間` });
  if (!ops.isCapitalUnconfirmed) items.push({ label: '初期資金', value: formatJpy(ops.initialCapitalRequired) });
  if (!entity.pnl.isMarginUnconfirmed) items.push({ label: '営業利益率', value: `${entity.pnl.operatingMargin}%` });
  if (!ops.isAutomationUnconfirmed && Number.isFinite(ops.automationLevel)) {
    items.push({ label: '自動化', value: `${ops.automationLevel}%` });
  }
  return items.slice(0, 5);
}

function lensScores(
  entity: FinancialEntity,
  amount: number | null,
  base: number,
): Record<DiscoveryLens, number> {
  const ops = entity.operations;
  const isFailure =
    entity.pnl.financialStatus === 'POST_MORTEM' ||
    entity.opportunityJudgment?.verdict === 'HAZARD_REJECT' ||
    (!entity.pnl.isOperatingProfitUnconfirmed && entity.pnl.operatingProfit < 0);
  const current =
    entity.temporal?.viabilityStatus === 'ACTIVE_PLAYBOOK' ||
    entity.temporal?.viabilityStatus === 'RISING_WAVE';

  return {
    SURPRISE: base,
    BIG_CASH: (amount && amount > 0 ? Math.log10(amount + 1) * 20 : 0) + base * 0.2,
    LOW_CAPITAL:
      (!ops.isCapitalUnconfirmed ? Math.max(0, 30 - Math.log10(ops.initialCapitalRequired + 1) * 5) : 0) +
      base * 0.35,
    SOLO:
      (!ops.isTeamSizeUnconfirmed && (ops.initialTeamSize ?? ops.teamSize) === 1 ? 45 : 0) + base * 0.35,
    LOW_WORK:
      (!ops.isWeeklyHoursUnconfirmed && ops.weeklyHours > 0
        ? Math.max(0, 45 - ops.weeklyHours * 1.5)
        : 0) + base * 0.3,
    CURRENT: (current ? 50 : 0) + base * 0.3,
    FAILURE: (isFailure ? 70 : 0) + (entity.evidenceCards?.length || 0) * 2,
  };
}

export function deriveDiscoveryDataset(
  entities: FinancialEntity[],
  visibleLimit = 220,
): DiscoveryDataset {
  const publicEntities = entities.filter((entity) => entity && entity.id && entity.name);
  const mechanismsById = new Map<string, { label: string; count: number }>();

  for (const entity of publicEntities) {
    const mechanism = mechanismOf(entity);
    const current = mechanismsById.get(mechanism.id);
    mechanismsById.set(mechanism.id, {
      label: mechanism.label,
      count: (current?.count || 0) + 1,
    });
  }

  const lightweight = publicEntities.map((entity) => {
    const result = resultOf(entity);
    const mechanism = mechanismOf(entity);
    const current = viability(
      entity.temporal?.viabilityStatus,
      entity.temporal?.viabilityLabel,
      entity.temporal?.currentViabilityAnalysis,
    );
    const base = shockBase(entity, result.amount);
    const isFailure =
      entity.pnl.financialStatus === 'POST_MORTEM' ||
      entity.opportunityJudgment?.verdict === 'HAZARD_REJECT' ||
      (!entity.pnl.isOperatingProfitUnconfirmed && entity.pnl.operatingProfit < 0);
    const team = entity.operations.initialTeamSize ?? entity.operations.teamSize;

    return {
      entity,
      result,
      mechanism,
      current,
      base,
      isFailure,
      isSolo: !entity.operations.isTeamSizeUnconfirmed && team === 1,
      lowCapital: !entity.operations.isCapitalUnconfirmed && entity.operations.initialCapitalRequired <= 100_000,
      lowWork:
        !entity.operations.isWeeklyHoursUnconfirmed &&
        entity.operations.weeklyHours > 0 &&
        entity.operations.weeklyHours <= 10,
    };
  });

  const relatedIndex = new Map<string, typeof lightweight>();
  for (const item of lightweight) {
    const list = relatedIndex.get(item.mechanism.id) || [];
    list.push(item);
    relatedIndex.set(item.mechanism.id, list);
  }

  const cases = lightweight
    .map((item): DiscoveryCase => {
      const { entity, result, mechanism, current } = item;
      const relatedPool = (relatedIndex.get(mechanism.id) || [])
        .filter((candidate) => candidate.entity.id !== entity.id)
        .slice()
        .sort((a, b) => b.base - a.base);

      return {
        id: entity.id,
        name: entity.name,
        tagline: compact(entity.tagline, 180),
        sector: SECTOR_LABELS[entity.sector] || entity.sector,
        resultLabel: result.label,
        resultValue: result.value,
        resultAmountJpy: result.amount,
        startLine: startLineOf(entity),
        criticalInsight: criticalInsightOf(entity),
        whyMoneyMoved: whyMoneyMovedOf(entity),
        leverage: leverageOf(entity),
        mechanism,
        mechanismCount: mechanismsById.get(mechanism.id)?.count || 1,
        currentLabel: current.label,
        currentDetail: current.detail,
        isCurrent: current.isCurrent,
        isFailure: item.isFailure,
        isSolo: item.isSolo,
        lowCapital: item.lowCapital,
        lowWork: item.lowWork,
        evidenceCount: entity.evidenceCards?.length || 0,
        descriptors: descriptorsOf(entity),
        related: relatedPool.slice(0, 4).map((candidate) => ({
          id: candidate.entity.id,
          name: candidate.entity.name,
          resultValue: candidate.result.value,
        })),
        scores: lensScores(entity, result.amount, item.base),
      };
    })
    .sort((a, b) => b.scores.SURPRISE - a.scores.SURPRISE)
    .slice(0, Math.max(1, visibleLimit));

  const highlights = cases
    .filter((item) => !item.isFailure && item.resultAmountJpy !== null && item.resultAmountJpy > 0)
    .slice(0, 3);

  return {
    sourceCount: publicEntities.length,
    visibleCount: cases.length,
    cases,
    mechanisms: Array.from(mechanismsById.entries())
      .map(([id, item]) => ({ id, ...item }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    highlights,
  };
}

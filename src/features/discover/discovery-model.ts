import type { FinancialEntity, ViabilityStatus } from '@/shared/terminal';
import { firstSentence, formatMetricAmount, metricListLabel, metricOriginLabel, pickListMetric, readerSummaryFact } from '@/shared/display-text';
import type { ReaderCase } from '@/shared/reader-case';
import { UI } from '@/shared/ui-strings';

export type DiscoveryLens =
  | 'SURPRISE'
  | 'BIG_CASH'
  | 'LOW_CAPITAL'
  | 'SOLO'
  | 'LOW_WORK'
  | 'CURRENT'
  | 'FAILURE';

export interface DiscoveryCase {
  id: string;
  name: string;
  tagline: string;
  /** SEC の標準産業分類（SEC_SIC）が根拠の時だけ入る。それ以外は空文字で、画面に出さない。 */
  sector: string;
  resultLabel: string;
  resultValue: string;
  resultAmountJpy: number | null;
  resultMetricId: string | null;
  summaryFactId: string | null;
  summaryText: string;
  /**
   * 詳細と AI への文脈が読む唯一の中身。検証は ReaderCaseSchema（zod）が持つので、JSON スキーマの生成からは外す。
   * @hidden
   */
  reader?: ReaderCase;
  resultEvidenceLabel: string;
  resultPeriod: string | null;
  resultSource: string | null;
  resultPeriodNote: string | null;
  startLine: string;
  criticalInsight: string;
  whyMoneyMoved: string;
  leverage: string;
  currentLabel: string;
  currentDetail: string;
  isCurrent: boolean;
  isFailure: boolean;
  isSolo: boolean;
  lowCapital: boolean;
  lowWork: boolean;
  evidenceCount: number;
  descriptors: Array<{ label: string; value: string }>;
  scores: Record<DiscoveryLens, number>;
}

export interface DiscoveryDataset {
  sourceCount: number;
  visibleCount: number;
  cases: DiscoveryCase[];
  highlights: DiscoveryCase[];
}

const SECTOR_LABELS: Record<string, string> = {
  AI_AUTOMATION: 'AI',
  NICHE_SAAS: 'ソフトウェア',
  MONOPOLY_MFG: '製造',
  CONTENT_MEDIA: 'メディア',
  PHYSICAL_ASSET: '物販・不動産',
  FINTECH_INFRA: '金融・決済',
  LOCAL_SERVICES: '地域サービス',
};

function compact(value: string | undefined | null, max = 150): string {
  const text = (value || '').replace(/\s+/gu, ' ').trim();
  // 取り込み側が欠け項目に入れる「未確認」だけの値は、中身が無いものとして扱う（呼び出し側の「—」が出る）
  if (!text || text === '未確認') return '';
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
  metricId: string | null;
  evidenceLabel: string;
  period: string | null;
  source: string | null;
} {
  // 一覧の結果は entity.reader.metrics から選ぶ。売上が無ければ売却額・調達額などをその名前で出す。
  const metric = pickListMetric(entity.reader);
  if (!metric) {
    return { label: UI.LIST_COL_REVENUE, value: UI.LIST_REVENUE_UNKNOWN, amount: null, metricId: null, evidenceLabel: '', period: null, source: null };
  }
  const publisher = entity.reader?.sources.find((s) => s.id === metric.sourceId)?.publisher ?? null;
  return {
    label: metricListLabel(metric),
    value: formatMetricAmount(metric),
    amount: metric.currency === 'JPY' ? metric.amount : null,
    metricId: metric.id,
    evidenceLabel: metricOriginLabel(metric),
    period: metric.period,
    source: publisher,
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
          : '—';
  return {
    isCurrent,
    label: compact(label, 38) || (isCurrent ? '現在も有効' : fallback),
    detail: compact(detail, 220) || '—',
  };
}

function startLineOf(entity: FinancialEntity): string {
  const parts: string[] = [];
  const ops = entity.operations;
  if (entity.scale !== 'ENTERPRISE' && !ops.isTeamSizeUnconfirmed) {
    const team = ops.initialTeamSize;
    if (typeof team === 'number' && Number.isFinite(team) && team > 0) parts.push(team === 1 ? '1人開始' : `${team}人開始`);
  }
  if (entity.scale !== 'ENTERPRISE' && !ops.isCapitalUnconfirmed && Number.isFinite(ops.initialCapitalRequired)) {
    parts.push(`初期 ${formatJpy(ops.initialCapitalRequired)}`);
  }
  if (entity.temporal?.foundedYear && entity.temporal.foundedYear > 0) {
    parts.push(`${entity.temporal.foundedYear}年開始`);
  }
  return parts.join(' / ');
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
    '—'
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

  if (entity.scale !== 'ENTERPRISE' && !ops.isTeamSizeUnconfirmed && ops.initialTeamSize === 1) score += 16;
  if (entity.scale !== 'ENTERPRISE' && !ops.isCapitalUnconfirmed && ops.initialCapitalRequired <= 100_000) score += 14;
  if (entity.scale !== 'ENTERPRISE' && !ops.isWeeklyHoursUnconfirmed && ops.weeklyHours > 0 && ops.weeklyHours <= 10) score += 14;
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
      (entity.scale !== 'ENTERPRISE' && !ops.isCapitalUnconfirmed ? Math.max(0, 30 - Math.log10(ops.initialCapitalRequired + 1) * 5) : 0) +
      base * 0.35,
    SOLO:
      (entity.scale !== 'ENTERPRISE' && !ops.isTeamSizeUnconfirmed && ops.initialTeamSize === 1 ? 45 : 0) + base * 0.35,
    LOW_WORK:
      (entity.scale !== 'ENTERPRISE' && !ops.isWeeklyHoursUnconfirmed && ops.weeklyHours > 0
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
  const lightweight = publicEntities.map((entity) => {
    const result = resultOf(entity);
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
    const team = entity.operations.initialTeamSize;

    return {
      entity,
      result,
      current,
      base,
      isFailure,
      isSolo: entity.scale !== 'ENTERPRISE' && !entity.operations.isTeamSizeUnconfirmed && team === 1,
      lowCapital: entity.scale !== 'ENTERPRISE' && !entity.operations.isCapitalUnconfirmed && entity.operations.initialCapitalRequired <= 100_000,
      lowWork:
        entity.scale !== 'ENTERPRISE' &&
        !entity.operations.isWeeklyHoursUnconfirmed &&
        entity.operations.weeklyHours > 0 &&
        entity.operations.weeklyHours <= 10,
    };
  });

  const allCases = lightweight
    .map((item): DiscoveryCase => {
      const { entity, result, current } = item;
      return {
        id: entity.id,
        name: entity.name,
        tagline: compact(entity.tagline, 180),
        sector: entity.sectorBasis?.source === 'SEC_SIC' ? SECTOR_LABELS[entity.sector] || '' : '',
        resultLabel: result.label,
        resultValue: result.value,
        resultAmountJpy: result.amount,
        resultMetricId: result.metricId,
        reader: entity.reader,
        summaryFactId: readerSummaryFact(entity.reader)?.id ?? null,
        summaryText: firstSentence(readerSummaryFact(entity.reader)?.text ?? ''),
        resultEvidenceLabel: result.evidenceLabel,
        resultPeriod: result.period,
        resultSource: result.source,
        resultPeriodNote: null,
        startLine: startLineOf(entity),
        criticalInsight: criticalInsightOf(entity),
        whyMoneyMoved: whyMoneyMovedOf(entity),
        leverage: leverageOf(entity),
        currentLabel: current.label,
        currentDetail: current.detail,
        isCurrent: current.isCurrent,
        isFailure: item.isFailure,
        isSolo: item.isSolo,
        lowCapital: item.lowCapital,
        lowWork: item.lowWork,
        evidenceCount: entity.evidenceCards?.length || 0,
        descriptors: descriptorsOf(entity),
        scores: lensScores(entity, result.amount, item.base),
      };
    });

  const selectedById = new Map<string, DiscoveryCase>();
  const lensOrder: DiscoveryLens[] = [
    'SURPRISE',
    'BIG_CASH',
    'LOW_CAPITAL',
    'SOLO',
    'LOW_WORK',
    'CURRENT',
    'FAILURE',
  ];
  for (const lens of lensOrder) {
    allCases
      .slice()
      .sort((a, b) => b.scores[lens] - a.scores[lens])
      .slice(0, Math.max(1, visibleLimit))
      .forEach((item) => selectedById.set(item.id, item));
  }

  const cases = Array.from(selectedById.values()).sort(
    (a, b) => b.scores.SURPRISE - a.scores.SURPRISE,
  );

  const highlights = allCases
    .filter((item) => !item.isFailure && item.resultAmountJpy !== null && item.resultAmountJpy > 0)
    .sort((a, b) => b.scores.SURPRISE - a.scores.SURPRISE)
    .slice(0, 3);

  return {
    sourceCount: publicEntities.length,
    visibleCount: cases.length,
    cases,
    highlights,
  };
}

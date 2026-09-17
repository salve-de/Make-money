import { legacyNumber, legacyText } from '../model/legacy-fields';
import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';

function stripLeadingEntityName(text: string, name?: string, legalEntity?: string): string {
  if (!text) return '';
  let result = text.trim();
  const names = [name, legalEntity].filter(Boolean) as string[];
  for (const candidate of names) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`^${escaped}[は|が|の|による]?\\s*[、,]?\\s*`, 'u'), '');
  }
  return result.trim();
}

function cleanValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '未確認' || trimmed === 'UNKNOWN' || trimmed.startsWith('未確認：')) {
    return null;
  }
  return trimmed;
}

export function ExecutiveIntuitiveSummary({
  entity,
  isHazardMode,
  formatMoney,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const headline = stripLeadingEntityName(
    entity.tagline || entity.essence?.whatItDoes || '',
    entity.name,
    entity.legalEntity,
  );

  const revenueKnown = !entity.pnl.isRevenueUnconfirmed && Number.isFinite(entity.pnl.monthlyRevenue) && entity.pnl.monthlyRevenue > 0;
  const profitKnown = !entity.pnl.isOperatingProfitUnconfirmed && Number.isFinite(entity.pnl.operatingProfit);
  const marginKnown = !entity.pnl.isMarginUnconfirmed && Number.isFinite(entity.pnl.operatingMargin);
  const teamSize = !entity.operations?.isTeamSizeUnconfirmed
    ? entity.operations?.teamSize || legacyNumber(entity, 'teamSize') || null
    : null;

  // 4大KPI
  const metrics = [
    {
      label: '月商規模',
      value: revenueKnown ? formatMoney(entity.pnl.monthlyRevenue) : '非公開',
      tone: revenueKnown ? 'neutral' : 'muted',
    },
    {
      label: '営業利益（純手残り）',
      value: profitKnown ? formatMoney(entity.pnl.operatingProfit) : '非公開',
      tone: profitKnown && entity.pnl.operatingProfit < 0 ? 'negative' : profitKnown ? 'positive' : 'muted',
    },
    {
      label: '営業利益率',
      value: marginKnown ? `${entity.pnl.operatingMargin.toFixed(1)}%` : '非公開',
      tone: marginKnown && entity.pnl.operatingMargin < 0 ? 'negative' : marginKnown ? 'positive' : 'muted',
    },
    {
      label: '組織規模',
      value: teamSize ? `${teamSize.toLocaleString()}名` : '少数精鋭',
      tone: 'neutral',
    },
  ];

  // 重複・未確認を排除した生々しいファクト行
  const whatItDoes = cleanValue(entity.essence?.whatItDoes || legacyText(entity, 'executiveSummary'));
  // headlineとwhatItDoesの類似重複排除
  const isDuplicateWhatItDoes = Boolean(
    whatItDoes && headline && (
      whatItDoes.slice(0, 30) === headline.slice(0, 30) ||
      headline.includes(whatItDoes.slice(0, 30))
    )
  );

  const targetPain = cleanValue(entity.targetPainWallet || entity.essence?.painRelief);
  const targetCustomer = cleanValue(entity.essence?.targetCustomer);
  const pricingModel = cleanValue(entity.pricing?.model);
  const pricePoint = cleanValue(entity.pricing?.pricePoint);
  const psychoTrigger = cleanValue(entity.pricing?.psychologicalTrigger);
  const incumbentDilemma = cleanValue(
    entity.meta?.incumbentDilemma?.cannibalizationBarrier ||
    entity.strategy?.incumbentDilemma ||
    entity.strategy?.moatDescription ||
    legacyText(entity.strategy, 'moat')
  );

  // 表示する有効な項目だけを構築（未確認・カス表示は1つも入れない）
  const infoRows: Array<{ label: string; value: string }> = [];

  if (whatItDoes && !isDuplicateWhatItDoes) {
    infoRows.push({ label: '事業内容', value: whatItDoes });
  }

  if (targetPain) {
    infoRows.push({
      label: isHazardMode ? '致命的出血点' : '仕留める痛みの財布',
      value: targetCustomer ? `${targetCustomer} / ${targetPain}` : targetPain,
    });
  } else if (targetCustomer) {
    infoRows.push({ label: '対象顧客', value: targetCustomer });
  }

  if (pricingModel || pricePoint || psychoTrigger) {
    const pricingParts = [
      pricingModel,
      pricePoint && `単価: ${pricePoint}`,
      psychoTrigger && `心理動機: ${psychoTrigger}`,
    ].filter(Boolean);
    infoRows.push({
      label: '課金・値付けの手口',
      value: pricingParts.join(' / '),
    });
  }

  if (incumbentDilemma) {
    infoRows.push({
      label: isHazardMode ? '破綻の構造要因' : '大手の死角・障壁',
      value: incumbentDilemma.replace(/^【.*?】/g, '').trim(),
    });
  }

  return (
    <InspectorSectionCard
      id="section-summary"
      index="01"
      categoryEn={isHazardMode ? 'FAILURE THESIS' : 'INVESTMENT THESIS'}
      titleJa={isHazardMode ? '破綻要因・死因の核心' : '事業仮説・核心の正体'}
      isHazardMode={isHazardMode}
    >
      {/* 核心の正体（大見出し） */}
      {headline && (
        <div className={`p-4 sm:p-5 border-b border-white/[0.07] ${
          isHazardMode ? 'bg-red-950/20' : 'bg-white/[0.015]'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-1 h-5 rounded-full shrink-0 mt-0.5 ${
              isHazardMode ? 'bg-red-400' : 'bg-cyan-400'
            }`} />
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
              {headline}
            </p>
          </div>
        </div>
      )}

      {/* 4大KPIメトリクスグリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/[0.07] bg-[#090d13]">
        {metrics.map((metric, index) => {
          const toneClass = metric.tone === 'positive'
            ? 'text-emerald-400'
            : metric.tone === 'negative'
              ? 'text-red-400'
              : metric.tone === 'muted'
                ? 'text-zinc-500 font-normal'
                : 'text-zinc-100';
          return (
            <div
              key={metric.label}
              className={`p-3.5 sm:px-4 sm:py-3 ${
                index > 0 ? 'border-l border-white/[0.06]' : ''
              } ${index >= 2 ? 'border-t border-white/[0.06] sm:border-t-0' : ''}`}
            >
              <div className="text-[11px] font-mono text-zinc-400 font-medium">{metric.label}</div>
              <div className={`mt-1 font-mono text-sm sm:text-base font-bold tabular-nums ${toneClass}`}>
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 生々しいファクト行（有効なものだけ表示・未確認ゼロ） */}
      {infoRows.length > 0 && (
        <div className="divide-y divide-white/[0.06] px-4 sm:px-5">
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1.5 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4 items-baseline"
            >
              <div className="text-[11px] font-mono font-semibold text-zinc-400">
                {row.label}
              </div>
              <div className="text-xs sm:text-[13px] leading-relaxed text-zinc-200">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </InspectorSectionCard>
  );
}

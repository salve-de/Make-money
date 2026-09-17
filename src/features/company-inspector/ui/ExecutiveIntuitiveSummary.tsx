import { legacyNumber, legacyText } from '../model/legacy-fields';
import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';

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

function compact(value: string | null | undefined, fallback: string): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

export function ExecutiveIntuitiveSummary({
  entity,
  isHazardMode,
  formatMoney,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const whatItDoes = compact(
    entity.essence?.whatItDoes || legacyText(entity, 'executiveSummary'),
    '事業内容は未確認',
  );
  const targetCustomer = compact(entity.essence?.targetCustomer, '対象顧客は未確認');
  const painRelief = compact(entity.essence?.painRelief || entity.targetPainWallet, '顧客課題は未確認');
  const monetization = compact(
    legacyText(entity.essence, 'monetizationWay') || legacyText(entity, 'monetizationWay'),
    '課金・収益化構造は未確認',
  );
  const rawMoat = entity.strategy?.moatDescription
    || legacyText(entity.strategy, 'moat')
    || legacyText(entity, 'coreMoatDescription')
    || entity.architecturePattern;
  const moat = compact(rawMoat?.replace(/^【.*?】/g, '').trim(), '追随障壁は未確認');
  const headline = stripLeadingEntityName(
    entity.tagline || entity.essence?.whatItDoes || whatItDoes,
    entity.name,
    entity.legalEntity,
  );

  const revenueKnown = !entity.pnl.isRevenueUnconfirmed && Number.isFinite(entity.pnl.monthlyRevenue);
  const profitKnown = !entity.pnl.isOperatingProfitUnconfirmed && Number.isFinite(entity.pnl.operatingProfit);
  const marginKnown = !entity.pnl.isMarginUnconfirmed && Number.isFinite(entity.pnl.operatingMargin);
  const teamSize = !entity.operations?.isTeamSizeUnconfirmed
    ? entity.operations?.teamSize || legacyNumber(entity, 'teamSize') || null
    : null;

  const metrics = [
    { label: '月商', value: revenueKnown ? formatMoney(entity.pnl.monthlyRevenue) : '未確認', tone: 'neutral' },
    {
      label: '営業利益',
      value: profitKnown ? formatMoney(entity.pnl.operatingProfit) : '未確認',
      tone: profitKnown && entity.pnl.operatingProfit < 0 ? 'negative' : profitKnown ? 'positive' : 'neutral',
    },
    {
      label: '営業利益率',
      value: marginKnown ? `${entity.pnl.operatingMargin.toFixed(1)}%` : '未確認',
      tone: marginKnown && entity.pnl.operatingMargin < 0 ? 'negative' : marginKnown ? 'positive' : 'neutral',
    },
    { label: '組織', value: teamSize ? `${teamSize.toLocaleString()}名` : '未確認', tone: 'neutral' },
  ] as const;

  const rows = isHazardMode
    ? [
        { label: '事業', value: whatItDoes },
        { label: '顧客', value: targetCustomer },
        { label: '破綻圧力', value: painRelief },
        { label: '構造要因', value: moat },
      ]
    : [
        { label: '事業', value: whatItDoes },
        { label: '顧客 / 痛み', value: `${targetCustomer} / ${painRelief}` },
        { label: '稼ぎ方', value: monetization },
        { label: '真似しにくさ', value: moat },
      ];

  return (
    <section id="section-summary" className="overflow-hidden rounded-lg border border-white/[0.09] bg-[#0e131b] select-text">
      <div className={`border-l-2 px-4 py-4 sm:px-5 ${isHazardMode ? 'border-red-400' : 'border-blue-400'}`}>
        <div className={`text-[10px] font-medium tracking-wide ${isHazardMode ? 'text-red-300' : 'text-blue-300'}`}>
          {isHazardMode ? 'FAILURE THESIS' : 'INVESTMENT THESIS'}
        </div>
        <p className="mt-1.5 max-w-5xl text-[15px] font-semibold leading-relaxed text-zinc-50 sm:text-base">
          {headline}
        </p>
      </div>

      <div className="grid grid-cols-2 border-y border-white/[0.07] bg-[#0b0f15] sm:grid-cols-4">
        {metrics.map((metric, index) => {
          const toneClass = metric.tone === 'positive'
            ? 'text-emerald-300'
            : metric.tone === 'negative'
              ? 'text-red-300'
              : 'text-zinc-100';
          return (
            <div
              key={metric.label}
              className={`px-3 py-2.5 ${index > 0 ? 'border-l border-white/[0.06]' : ''} ${index >= 2 ? 'border-t border-white/[0.06] sm:border-t-0' : ''}`}
            >
              <div className="text-[9px] text-zinc-500">{metric.label}</div>
              <div className={`mt-0.5 font-mono text-[12px] font-semibold tabular-nums ${toneClass}`}>
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-white/[0.06] px-4 sm:px-5">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-2.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4">
            <div className="text-[10px] font-medium text-zinc-500">{row.label}</div>
            <div className="text-[12px] leading-relaxed text-zinc-300">{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

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

const BOILERPLATE_PATTERNS = [
  /業務の属人化、余計な手間、高額な仲介手数料の苦痛を解消し/,
  /日々の面倒な手作業の繰り返し、属人化によるミスの発生/,
  /既存の汎用ツールの使いにくさや高額な価格設定に強い不満/,
  /_SAASの非効率や高コストに不満を持ち/,
  /_MEDIAの非効率や高コストに不満を持ち/,
  /_ASSETの非効率や高コストに不満を持ち/,
  /_INFRAの非効率や高コストに不満を持ち/,
  /_AUTOMATIONの非効率や高コストに不満を持ち/,
  /迅速かつ確実に業務を完了させたい企業の現場担当者/,
  /不要な手作業や複雑な設定を極限まで削ぎ落とすことで、高い利益率を実現する高収益ビジネスモデル/,
];

function isBoilerplate(text: string): boolean {
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === '未確認' ||
    trimmed === 'UNKNOWN' ||
    trimmed.startsWith('未確認：') ||
    trimmed.startsWith('未確認:') ||
    isBoilerplate(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

function cleanHeadline(text: string, name?: string, legalEntity?: string): string {
  let result = stripLeadingEntityName(text, name, legalEntity);
  // 先頭の不対な鉤括弧「の除去（『』の外側の「など）
  if (
    result.startsWith('「') &&
    !result.endsWith('」') &&
    (result.match(/「/g)?.length || 0) > (result.match(/」/g)?.length || 0)
  ) {
    result = result.slice(1);
  }
  return result.trim();
}

function buildExecutiveLead(
  entity: InspectorSectionProps['entity'],
  headline: string,
): string | null {
  const whatItDoes = cleanValue(entity.essence?.whatItDoes || legacyText(entity, 'executiveSummary'));
  const painRelief = cleanValue(entity.essence?.painRelief);
  const secretInsight = cleanValue(entity.strategy?.secretInsight);
  const targetPain = cleanValue(entity.targetPainWallet);

  // headline と whatItDoes の重複判定（先頭15文字または headline に whatItDoes の核が含まれるか）
  const isWhatItDoesDupe = Boolean(
    headline && whatItDoes && (
      headline.includes(whatItDoes.slice(0, 15)) ||
      whatItDoes.includes(headline.slice(0, 15)) ||
      headline.slice(0, 25) === whatItDoes.slice(0, 25)
    )
  );

  const parts: string[] = [];

  // 重複していない場合のみ whatItDoes を追加
  if (whatItDoes && !isWhatItDoesDupe) {
    parts.push(whatItDoes.endsWith('。') ? whatItDoes : `${whatItDoes}。`);
  }

  if (painRelief) {
    const cleanPain = painRelief.endsWith('。') ? painRelief : `${painRelief}。`;
    if (!parts.some((p) => p.includes(painRelief.slice(0, 15))) && !headline.includes(painRelief.slice(0, 15))) {
      parts.push(cleanPain);
    }
  } else if (targetPain && !parts.some((p) => p.includes(targetPain.slice(0, 15))) && !headline.includes(targetPain.slice(0, 15))) {
    parts.push(targetPain.endsWith('。') ? targetPain : `狙う急所: ${targetPain}。`);
  }

  if (secretInsight) {
    const cleanSecret = secretInsight.endsWith('。') ? secretInsight : `${secretInsight}。`;
    if (!parts.some((p) => p.includes(secretInsight.slice(0, 15))) && !headline.includes(secretInsight.slice(0, 15))) {
      parts.push(cleanSecret);
    }
  }

  if (parts.length === 0 && targetPain) {
    parts.push(`狙う急所: ${targetPain}。`);
  }

  const combined = parts.join(' ').trim();
  return combined.length > 0 ? combined : null;
}

export function ExecutiveIntuitiveSummary({
  entity,
  isHazardMode,
  formatMoney,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const headline = cleanHeadline(
    entity.tagline || entity.essence?.whatItDoes || '',
    entity.name,
    entity.legalEntity,
  );

  const leadParagraph = buildExecutiveLead(entity, headline);

  const revenueKnown = !entity.pnl.isRevenueUnconfirmed && Number.isFinite(entity.pnl.monthlyRevenue) && entity.pnl.monthlyRevenue > 0;
  const profitKnown = !entity.pnl.isOperatingProfitUnconfirmed && Number.isFinite(entity.pnl.operatingProfit);
  const marginKnown = !entity.pnl.isMarginUnconfirmed && Number.isFinite(entity.pnl.operatingMargin);
  const teamSize = !entity.operations?.isTeamSizeUnconfirmed
    ? entity.operations?.teamSize || legacyNumber(entity, 'teamSize') || null
    : null;

  // 1人あたり月利
  const perCapitaProfit = teamSize && profitKnown && teamSize > 0
    ? Math.round(entity.pnl.operatingProfit / teamSize)
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
      sub: perCapitaProfit && perCapitaProfit > 0 ? `月利 ${formatMoney(perCapitaProfit)}/人` : null,
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
      sub: entity.operations?.weeklyHours ? `週稼働 ${entity.operations.weeklyHours}h` : null,
      tone: 'neutral',
    },
  ];

  const targetPain = cleanValue(entity.targetPainWallet || entity.essence?.painRelief);
  const targetCustomer = cleanValue(entity.essence?.targetCustomer);
  const blindspot = cleanValue(entity.strategy?.blindspot);
  const secretInsight = cleanValue(entity.strategy?.secretInsight);
  const incumbentDilemma = cleanValue(
    entity.meta?.incumbentDilemma?.cannibalizationBarrier ||
    entity.strategy?.incumbentDilemma ||
    entity.strategy?.moatDescription ||
    legacyText(entity.strategy, 'moat')
  );
  const pricingModel = cleanValue(entity.pricing?.model);
  const pricePoint = cleanValue(entity.pricing?.pricePoint);
  const psychoTrigger = cleanValue(entity.pricing?.psychologicalTrigger);

  // 表示する有効な項目だけを構築（未確認・カス表示は1つも入れない）
  const infoRows: Array<{ label: string; value: string }> = [];

  if (targetPain) {
    infoRows.push({
      label: isHazardMode ? '致命的出血点' : '仕留める痛みの財布',
      value: targetCustomer ? `${targetCustomer} / ${targetPain}` : targetPain,
    });
  } else if (targetCustomer) {
    infoRows.push({ label: '対象顧客', value: targetCustomer });
  }

  if (blindspot) {
    infoRows.push({
      label: '業界の盲点・欠陥',
      value: blindspot.replace(/^【.*?】/g, '').trim(),
    });
  }

  if (secretInsight && (!leadParagraph || !leadParagraph.includes(secretInsight.slice(0, 20)))) {
    infoRows.push({
      label: '儲けの本質・裏の急所',
      value: secretInsight,
    });
  }

  if (incumbentDilemma) {
    infoRows.push({
      label: isHazardMode ? '破綻の構造要因' : '大手の死角・障壁',
      value: incumbentDilemma.replace(/^【.*?】/g, '').trim(),
    });
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

  return (
    <InspectorSectionCard
      id="section-summary"
      index="01"
      categoryEn={isHazardMode ? 'FAILURE THESIS' : 'INVESTMENT THESIS'}
      titleJa={isHazardMode ? '破綻要因・死因の核心' : '事業仮説・核心の正体'}
      isHazardMode={isHazardMode}
    >
      {/* 核心の正体（大見出しタグライン） */}
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

      {/* エグゼクティブ・リード文（読者が1秒で理解できる要約文章） */}
      {leadParagraph && (
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
              isHazardMode
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
            }`}>
              {isHazardMode ? 'CASE OVERVIEW / 事例の全体像' : 'EXECUTIVE BRIEFING / 事業概要と儲けの急所'}
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-sans">
            {leadParagraph}
          </p>
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
              {metric.sub && (
                <div className="mt-0.5 text-[10px] font-mono text-zinc-500 tabular-nums">
                  {metric.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 生々しい構造ファクト行（有効なものだけ表示・未確認ゼロ） */}
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

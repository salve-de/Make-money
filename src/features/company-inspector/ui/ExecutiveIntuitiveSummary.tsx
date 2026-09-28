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
    parts.push(targetPain.endsWith('。') ? targetPain : `顧客の課題: ${targetPain}。`);
  }

  if (secretInsight) {
    const cleanSecret = secretInsight.endsWith('。') ? secretInsight : `${secretInsight}。`;
    if (!parts.some((p) => p.includes(secretInsight.slice(0, 15))) && !headline.includes(secretInsight.slice(0, 15))) {
      parts.push(cleanSecret);
    }
  }

  if (parts.length === 0 && targetPain) {
    parts.push(`顧客の課題: ${targetPain}。`);
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

  const metrics = [
    {
      label: '売上（月額換算）',
      value: revenueKnown ? formatMoney(entity.pnl.monthlyRevenue) : '未確認',
      known: revenueKnown,
      tone: revenueKnown ? 'neutral' : 'muted',
    },
    {
      label: '営業利益（月額換算）',
      value: profitKnown ? formatMoney(entity.pnl.operatingProfit) : '未確認',
      known: profitKnown,
      tone: profitKnown && entity.pnl.operatingProfit < 0 ? 'negative' : profitKnown ? 'positive' : 'muted',
    },
    {
      label: '営業利益率',
      value: marginKnown ? `${entity.pnl.operatingMargin.toFixed(1)}%` : '未確認',
      known: marginKnown,
      tone: marginKnown && entity.pnl.operatingMargin < 0 ? 'negative' : marginKnown ? 'positive' : 'muted',
    },
    {
      label: '組織規模',
      value: teamSize ? `${teamSize.toLocaleString()}名` : '未確認',
      known: Boolean(teamSize),
      sub: entity.operations?.isWeeklyHoursUnconfirmed === false && entity.operations?.weeklyHours ? `週稼働 ${entity.operations.weeklyHours}h` : null,
      tone: 'neutral',
    },
  ];

  const targetPain = cleanValue(entity.targetPainWallet || entity.essence?.painRelief);
  const targetCustomer = cleanValue(entity.essence?.targetCustomer);
  const blindspot = cleanValue(entity.strategy?.blindspot);
  const secretInsight = cleanValue(entity.strategy?.secretInsight);
  const pricingModel = cleanValue(entity.pricing?.model);
  const pricePoint = cleanValue(entity.pricing?.pricePoint);
  const psychoTrigger = cleanValue(entity.pricing?.psychologicalTrigger);


  // 表示する有効な項目だけを構築（未確認・カス表示は1つも入れない）
  const infoRows: Array<{ label: string; value: string }> = [];

  if (targetPain) {
    infoRows.push({
      label: isHazardMode ? '事業継続の課題' : '顧客の課題',
      value: targetPain,
    });
  }
  if (targetCustomer) {
    infoRows.push({ label: '対象顧客', value: targetCustomer });
  }

  if (blindspot) {
    infoRows.push({
      label: '業界の見立て',
      value: blindspot.replace(/^【.*?】/g, '').trim(),
    });
  }

  if (secretInsight && (!leadParagraph || !leadParagraph.includes(secretInsight.slice(0, 20)))) {
    infoRows.push({
      label: '収益の仕組み',
      value: secretInsight,
    });
  }

  for (const [label, value] of [
    ['競争優位', entity.strategy?.moatDescription],
    ['大手との競争条件', entity.strategy?.incumbentDilemma],
    ['競争上の補足', legacyText(entity.strategy, 'moat')],
  ]) {
    const content = cleanValue(value);
    if (content && !infoRows.some((row) => row.value === content)) infoRows.push({ label: label!, value: content });
  }

  if (pricingModel || pricePoint || psychoTrigger) {
    const pricingParts = [
      pricingModel,
      pricePoint && `単価: ${pricePoint}`,
      psychoTrigger && `利用のきっかけ: ${psychoTrigger}`,
    ].filter(Boolean);
    infoRows.push({
      label: '価格・利用動機',
      value: pricingParts.join(' / '),
    });
  }

  return (
    <InspectorSectionCard
      id="section-summary"
      index="01"
      categoryEn={isHazardMode ? '事業の経緯' : '主要データ'}
      titleJa={isHazardMode ? '撤退・破綻の要因' : '事業の概要'}
      isHazardMode={isHazardMode}
    >
      {(headline || leadParagraph) && (
        <div className="space-y-1.5 border-b border-white/[0.1] py-3">
          {headline && <p className="text-sm font-medium leading-6 text-zinc-100 break-words">{headline}</p>}
          {leadParagraph && <p className="text-sm leading-6 text-zinc-300 break-words">{leadParagraph}</p>}
        </div>
      )}
      <dl className="flex flex-wrap items-stretch border-b border-white/[0.1]">
        {metrics.filter((metric) => metric.known).map((metric) => {
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
              className="min-w-[130px] flex-1 border-r border-white/[0.08] py-2 pr-3 last:border-r-0 sm:py-3"
            >
              <dt className="text-xs text-zinc-400">{metric.label}</dt>
              <dd className={`mt-1 font-mono text-sm font-semibold tabular-nums sm:text-base ${toneClass}`}>
                {metric.value}
              </dd>
              {metric.sub && (
                <dd className="mt-0.5 text-xs text-zinc-500">
                  {metric.sub}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
      {infoRows.length > 0 && (
        <dl className="divide-y divide-white/[0.08]">
          {infoRows.map((row) => (
            <div key={row.label} className="grid gap-1 py-2.5 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
              <dt className="text-xs font-medium text-sky-200">{row.label}</dt>
              <dd className="min-w-0 break-words text-sm leading-6 text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </InspectorSectionCard>
  );
}

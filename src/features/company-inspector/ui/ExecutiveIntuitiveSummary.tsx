import { legacyNumber, legacyText } from '../model/legacy-fields';
import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { MoneyText } from './MoneyText';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';

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

function siteHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function KeyValue({
  label,
  children,
  tag,
  tagTone = 'dim',
}: {
  label: string;
  children: React.ReactNode;
  tag?: string;
  tagTone?: 'dim' | 'accent';
}) {
  return (
    <div className="flex min-h-[34px] items-center justify-between gap-3 border-b border-term-line-soft px-2.5 py-1 lg:min-h-[30px] lg:odd:border-r lg:odd:border-term-line-soft">
      <dt className="shrink-0 text-xs text-term-label">{label}</dt>
      <dd className="flex min-w-0 items-baseline justify-end gap-1.5">
        {children}
        {tag && <span className={`shrink-0 text-xs ${tagTone === 'accent' ? 'text-term-accent' : 'text-term-dim'}`}>{tag}</span>}
      </dd>
    </div>
  );
}

const UNKNOWN = <span className="term-num text-[15px] text-term-dim">—</span>;

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
  const isEstimated = entity.pnl.financialStatus === 'ESTIMATED';
  const foundedYear = entity.temporal?.foundedYear;
  const sourceCount = new Set((entity.observationsStream || []).flatMap((item) => item.evidenceIds ?? [])).size
    || new Set([entity.pnl.sourceDoc, ...(entity.evidenceCards || []).map((card) => card.sourceNote)].filter(Boolean)).size;
  const host = siteHost(entity.url);

  const targetPain = cleanValue(entity.targetPainWallet || entity.essence?.painRelief);
  const targetCustomer = cleanValue(entity.essence?.targetCustomer);
  const blindspot = cleanValue(entity.strategy?.blindspot);
  const secretInsight = cleanValue(entity.strategy?.secretInsight);
  const pricingModel = cleanValue(entity.pricing?.model);
  const pricePoint = cleanValue(entity.pricing?.pricePoint);
  const psychoTrigger = cleanValue(entity.pricing?.psychologicalTrigger);

  // 表示する有効な項目だけを構築（未確認・同じ文面の重複は入れない）
  const infoRows: Array<{ label: string; value: string }> = [];
  const pushRow = (label: string, value: string) => {
    const text = value.trim();
    if (text && !infoRows.some((row) => row.value === text)) infoRows.push({ label, value: text });
  };

  if (targetPain) pushRow(isHazardMode ? '事業継続の課題' : '顧客の課題', targetPain);
  if (targetCustomer) pushRow('対象顧客', targetCustomer);
  if (blindspot) pushRow('業界の見立て', blindspot.replace(/^【.*?】/g, '').trim());
  if (secretInsight && (!leadParagraph || !leadParagraph.includes(secretInsight.slice(0, 20)))) {
    pushRow('収益の仕組み', secretInsight);
  }

  for (const [label, value] of [
    ['競争優位', entity.strategy?.moatDescription],
    ['大手との競争条件', entity.strategy?.incumbentDilemma],
    ['競争上の補足', legacyText(entity.strategy, 'moat')],
  ]) {
    const content = cleanValue(value);
    if (content) pushRow(label!, content);
  }

  if (pricingModel || pricePoint || psychoTrigger) {
    const pricingParts = [
      pricingModel,
      pricePoint && `単価: ${pricePoint}`,
      psychoTrigger && `利用のきっかけ: ${psychoTrigger}`,
    ].filter(Boolean);
    pushRow('価格・利用動機', pricingParts.join(' / '));
  }

  const approx = (value: number) => (isEstimated ? `約${formatMoney(value)}` : formatMoney(value));
  const moneyClass = (accent: boolean, negative = false) =>
    `term-num text-base ${negative ? 'text-term-danger' : accent ? 'text-term-accent' : 'text-term-fg-strong'}`;

  return (
    <InspectorSectionCard
      id="section-summary"
      index="01"
      categoryEn={isHazardMode ? '事業の経緯' : '主要データ'}
      titleJa={isHazardMode ? '撤退・破綻の要因' : '事業の概要'}
      isHazardMode={isHazardMode}
    >
      <div className="border-b border-term-line-soft py-2.5">
        <h2 className="text-lg font-semibold leading-tight text-term-fg-strong">{entity.name}</h2>
        <p className="mt-0.5 text-xs text-term-label">
          {sectorLabel(entity.sector)}{host ? ` ・ ${host}` : ''}
        </p>
        {headline && <p className="mt-1.5 break-words text-[13px] leading-6 text-term-sub">{headline}</p>}
        {leadParagraph && <p className="mt-1 break-words text-[13px] leading-6 text-term-sub">{leadParagraph}</p>}
      </div>

      <dl className="grid grid-cols-1 border-b border-term-line-soft lg:grid-cols-2 [&>div:last-child]:border-b-0">
        <KeyValue label="月商" tag={revenueKnown ? (isEstimated ? '推定' : undefined) : '未確認'} tagTone={revenueKnown && isEstimated ? 'accent' : 'dim'}>
          {revenueKnown ? (
            <MoneyText text={approx(entity.pnl.monthlyRevenue)} className={moneyClass(isEstimated)} />
          ) : UNKNOWN}
        </KeyValue>
        <KeyValue
          label={isEstimated ? '手残り（推定）' : '営業利益'}
          tag={profitKnown ? (isEstimated ? '推定' : undefined) : '未確認'}
          tagTone={profitKnown && isEstimated ? 'accent' : 'dim'}
        >
          {profitKnown ? (
            <MoneyText text={approx(entity.pnl.operatingProfit)} className={moneyClass(isEstimated, entity.pnl.operatingProfit < 0)} />
          ) : UNKNOWN}
        </KeyValue>
        {marginKnown && (
          <KeyValue label="営業利益率">
            <span className={moneyClass(false, entity.pnl.operatingMargin < 0)}>{entity.pnl.operatingMargin.toFixed(1)}<span className="ml-0.5 font-sans text-xs text-term-label">%</span></span>
          </KeyValue>
        )}
        <KeyValue label="運営人数" tag={teamSize ? undefined : '未確認'}>
          {teamSize ? (
            <span className="term-num text-base text-term-fg-strong">{teamSize.toLocaleString('ja-JP')}<span className="ml-0.5 font-sans text-xs text-term-label">人</span></span>
          ) : UNKNOWN}
          {teamSize && entity.operations?.isWeeklyHoursUnconfirmed === false && entity.operations?.weeklyHours ? (
            <span className="text-xs text-term-label">週{entity.operations.weeklyHours}h</span>
          ) : null}
        </KeyValue>
        <KeyValue label="開始年" tag={foundedYear && foundedYear > 0 ? undefined : '未確認'}>
          {foundedYear && foundedYear > 0 ? (
            <span className="term-num text-base text-term-fg-strong">{foundedYear}<span className="ml-0.5 font-sans text-xs text-term-label">年</span></span>
          ) : UNKNOWN}
        </KeyValue>
        <KeyValue label="分野">
          <span className="text-[13px] text-term-fg-strong">{sectorLabel(entity.sector)}</span>
        </KeyValue>
        <KeyValue label="出典">
          {sourceCount > 0 ? (
            <span className="term-num text-base text-term-fg-strong">{sourceCount}<span className="ml-0.5 font-sans text-xs text-term-label">件</span></span>
          ) : UNKNOWN}
        </KeyValue>
      </dl>

      {infoRows.length > 0 && (
        <dl>
          {infoRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-term-line-soft py-1.5 last:border-b-0">
              <dt className="text-xs leading-6 text-term-label">{row.label}</dt>
              <dd className="min-w-0 break-words text-[13px] leading-6 text-term-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </InspectorSectionCard>
  );
}

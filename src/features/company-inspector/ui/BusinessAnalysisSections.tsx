import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
const MOAT_TYPE_LABELS: Record<string, string> = {
  COUNTER_POSITIONING: '大企業が真似できない構造',
  NETWORK_EFFECT: '利用者が増えるほど強くなる仕組み',
  HIGH_SWITCHING_COSTS: '他社へ乗り換えられない仕組み',
  CORNERED_RESOURCE: '独自の独占資産・特権',
  SCALE_ECONOMIES: '規模の大きさによる圧倒的低コスト',
  PROCESS_POWER: '真似できない独自の現場ノウハウ',
  BRAND_SPEED: '圧倒的なブランド認知とスピード',
  UNKNOWN: '未確認',
};

type Props = Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney' | 'isPro' | 'onOpenPro'>;
function text(value: unknown): string {
  return typeof value === 'string' && !/^(UNKNOWN|未確認)(?:$|[：:])/.test(value.trim()) ? value.trim() : '';
}
function Rows({ rows }: { rows: [string, unknown][] }) {
  return <dl className="divide-y divide-term-line-soft">{rows.filter(([, value]) => text(value)).map(([label, value]) => <div key={label} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 py-1.5"><dt className="text-xs leading-6 text-term-label">{label}</dt><dd className="min-w-0 whitespace-pre-line break-words text-[13px] leading-6 text-term-fg">{text(value)}</dd></div>)}</dl>;
}
function Steps({ title, items }: { title: string; items?: string[] }) {
  const values = [...new Set((items || []).map(text).filter(Boolean))];
  return values.length > 0 ? <div className="py-3"><h4 className="mb-1 text-xs text-term-label">{title}</h4><ol className="list-decimal space-y-1 pl-5 text-[13px] leading-6 text-term-fg">{values.map((value) => <li key={value} className="whitespace-pre-line break-words pl-1">{value}</li>)}</ol></div> : null;
}
export function BusinessAnalysisSections({ entity, isHazardMode, formatMoney, isPro, onOpenPro }: Props) {
  const acquisition = entity.acquisition;
  const actions = entity.strategy?.actionPlaybook || [];
  const checklist = entity.lootBlueprint?.executionChecklist || [];
  const hasAcquisition = Boolean((entity.strategy?.moatType && entity.strategy.moatType !== 'UNKNOWN') || text(entity.pricing?.churnRate) || Number.isFinite(entity.pricing?.estimatedLtvJpy) || text(acquisition?.primaryFunnel) || acquisition?.tactics?.some(text) || text(entity.strategy?.coldOutreachTemplate) || actions.some(text) || checklist.some(text) || (acquisition && Number.isFinite(acquisition.cacJpy)));
  const judgment = entity.opportunityJudgment;
  const meta = isPro ? entity.meta : undefined;
  const groups: { title: string; rows: [string, unknown][] }[] = meta ? [
    { title: '大手との競争', rows: [['既存事業との衝突', meta.incumbentDilemma?.cannibalizationBarrier], ['市場規模の違い', meta.incumbentDilemma?.scaleMismatchReason], ['意思決定の速さ', meta.incumbentDilemma?.decisionSpeedAdvantage]] },
    { title: '価格決定力', rows: [['比較される価格', meta.pricingPower?.anchorComparison], ['購入の動機', meta.pricingPower?.lossAversionTrigger], ['支払い元の予算', meta.pricingPower?.budgetCategory]] },
    { title: '継続利用の仕組み', rows: [['データの蓄積', meta.lockInMechanism?.dataHostage], ['業務への組み込み', meta.lockInMechanism?.workflowIntegration], ['乗り換えの手間', meta.lockInMechanism?.switchingFriction]] },
    { title: '資金効率', rows: [['入出金の周期', meta.capitalEfficiency?.cashConversionCycle], ['追加販売の利益', meta.capitalEfficiency?.incrementalMargin], ['運転資金', meta.capitalEfficiency?.workingCapitalStrategy]] },
  ] : [];
  return <>
    {hasAcquisition && <InspectorSectionCard id="section-playbook" index="05" categoryEn="顧客獲得・実行" titleJa={isHazardMode ? '獲得経路と再発防止の手順' : '顧客獲得・実行手順'} isHazardMode={isHazardMode}>
      <Rows rows={[
        ['顧客獲得経路', acquisition?.primaryFunnel],
        ['推定顧客生涯価値', typeof entity.pricing?.estimatedLtvJpy === 'number' && Number.isFinite(entity.pricing.estimatedLtvJpy) ? formatMoney(entity.pricing.estimatedLtvJpy) : ''],
        ['解約率', entity.pricing?.churnRate],
        ['獲得単価（記録値）', acquisition && Number.isFinite(acquisition.cacJpy) && acquisition.cacJpy >= 0 ? formatMoney(acquisition.cacJpy) : ''],
        ['競争優位の種類', entity.strategy?.moatType && entity.strategy.moatType !== 'UNKNOWN' ? MOAT_TYPE_LABELS[entity.strategy.moatType] : ''],
      ]} />
      <Steps title="獲得施策" items={acquisition?.tactics} />
      <Steps title="実行手順" items={actions} />
      <Steps title="初動チェックリスト" items={checklist.filter((item) => !actions.includes(item))} />
      {text(entity.strategy?.coldOutreachTemplate) && <details className="border-t border-term-line py-3"><summary className="cursor-pointer text-sm text-term-fg">初回連絡の文面</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{entity.strategy.coldOutreachTemplate}</p></details>}
    </InspectorSectionCard>}
    {(groups.some((group) => group.rows.some(([, value]) => text(value))) || (!isPro && entity.hasPremiumAnalysis)) && <InspectorSectionCard id="section-structure" index="06" categoryEn="構造分析" titleJa="競争・価格・継続利用・資金効率" isHazardMode={isHazardMode}>
      {groups.filter((group) => group.rows.some(([, value]) => text(value))).map((group) => <div key={group.title} className="py-3"><h4 className="border-b border-term-line pb-2 text-sm font-semibold text-zinc-100">{group.title}</h4><Rows rows={group.rows} /></div>)}
      {!isPro && onOpenPro && <button type="button" onClick={onOpenPro} className="my-3 rounded-sm border border-term-line px-3 py-2 text-sm text-term-fg">詳細分析を開く</button>}
    </InspectorSectionCard>}
    {judgment && <InspectorSectionCard id="section-judgment" index="07" categoryEn="事業検討" titleJa="参入判断の材料" isHazardMode={isHazardMode}><Rows rows={[
      ['記録された見立て', judgment.verdictLabel], ['理由', judgment.oneLineReason], ['需要の変化', judgment.demandDelta], ['競争の変化', judgment.competitionDelta], ['必要資本', judgment.entryRequirements?.capital], ['技術的な難度', judgment.entryRequirements?.technicalDifficulty], ['プラットフォーム依存', judgment.entryRequirements?.platformRisk],
    ]} /></InspectorSectionCard>}
  </>;
}

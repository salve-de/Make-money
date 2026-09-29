'use client';

import React from 'react';
import type { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';

interface DeathTrapsSectionProps {
  shelfLifeAlerts: MacroIntelligenceData['shelfLifeAlerts'];
  deathTraps: MacroIntelligenceData['deathTraps'];
  selectedTrapId: string;
  setSelectedTrapId: (id: string) => void;
  activeTrap?: MacroIntelligenceData['deathTraps'][number];
}

type RiskGuide = { title: string; summary: string; signal: string; impact: string; response: string };

const RISKS: Record<string, RiskGuide> = {
  'trap-api-wrapper': {
    title: '基盤サービスへの依存',
    summary: '提供価値の大部分が外部APIの機能そのものになっている。',
    signal: '利用者が元のサービスへ直接移っても、成果や手間がほとんど変わらない。',
    impact: 'APIの価格・機能・提供条件が変わると、利益と差別化を同時に失う。',
    response: '特定の業務手順、データ整備、導入支援など、自分たちが継続して担う価値を確認する。',
  },
  'trap-temporary-windfall': {
    title: '一時的な需要への固定費投資',
    summary: '短期の需要を前提に、長く残る費用を増やしてしまう。',
    signal: '特定のイベントや制度変更の間だけ注文が増え、継続利用が見えていない。',
    impact: '需要が戻った後も人件費や契約費用が残る。',
    response: '継続率を確認できるまで、変動費で対応できる範囲を見極める。',
  },
  'trap-regulatory-shortcut': {
    title: '規制・許認可の確認不足',
    summary: '事業を始める前に必要な条件や責任範囲を確かめていない。',
    signal: '販売方法や担当者の権限を、公式資料や専門家の確認なしで決めている。',
    impact: '提供停止や顧客への影響が、売上より大きくなる場合がある。',
    response: '対象地域と業務に適用される現行ルール、許認可、記録義務を先に確認する。',
  },
  'trap-ignoring-savannah-os': {
    title: '需要確認前の過大投資',
    summary: '顧客が買う理由を確かめる前に、製作や広告に資金を使う。',
    signal: '利用者の課題や支払意思より、完成品の仕様が先に決まっている。',
    impact: '商品が完成しても販売経路と継続需要が見つからない。',
    response: '小さな試作品で、使用と支払いの両方を確認してから固定費を増やす。',
  },
  'trap-cannibalism-direct-hit': {
    title: '強い販売網との正面競争',
    summary: '商品だけを比べ、既存事業者の流通や調達の強さを見落とす。',
    signal: '自社の価格・品質が少し良いだけで、同じ売り場で勝てると考えている。',
    impact: '販売場所や仕入れ条件で不利になり、顧客に届く前に費用が増える。',
    response: '別の購入場面や販路で、顧客に届く方法を具体的に確かめる。',
  },
};

const RiskDetail: React.FC<{ guide: RiskGuide; trap: DeathTrapsSectionProps["deathTraps"][number] }> = ({ guide, trap }) => (
  <div>
    <h3 className="hidden border-b border-term-line px-3 py-2 text-base font-semibold text-term-fg-strong lg:block">{guide.title}</h3>
    <dl className="text-sm leading-6">
      {[
        ['見つける兆候', guide.signal],
        ['起こり得ること', guide.impact],
        ['見直し方', guide.response],
      ].map(([label, value]) => (
        <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs text-term-label">{label}</dt>
          <dd className="text-term-fg">{value}</dd>
        </div>
      ))}
    </dl>
    <details className="border-b border-term-line px-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-0">原因・対応の資料</summary>
      <div className="space-y-3 pb-3 text-sm leading-6 text-term-fg"><p>{trap.mechanism}</p>
      <ul className="list-disc space-y-2 pl-5">{trap.warningSigns.map((sign, index) => <li key={index}>{sign}</li>)}</ul>
      <p>{trap.antidote}</p>
      {trap.victimEntities.length > 0 && <section className="border-t border-term-line pt-3"><h4 className="text-xs text-term-label">資料内の参考例</h4>{trap.victimEntities.map((entity) => <article key={entity.id} className="mt-3 space-y-1"><h5 className="font-medium text-term-fg-strong">{entity.name}</h5><p>{entity.headline}</p><p>{entity.punchline}</p><ul className="list-disc pl-5">{entity.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul></article>)}</section>}</div>
    </details>
  </div>
);

export const DeathTrapsSection: React.FC<DeathTrapsSectionProps> = ({ deathTraps, shelfLifeAlerts, selectedTrapId, setSelectedTrapId }) => {
  const selected = deathTraps.find((trap) => trap.id === selectedTrapId) ?? deathTraps[0];
  return (
    <div className="grid w-full lg:grid-cols-[minmax(280px,36%)_minmax(0,1fr)]">
      <div className="lg:border-r lg:border-term-line">
        <div className="term-panel-title"><span className="term-panel-name">失敗と見直し</span><span className="term-num">{deathTraps.length}件</span></div>
        {deathTraps.map((trap, index) => {
          const guide = riskGuide(trap);
          const isSelected = selected?.id === trap.id;
          return (
            <div key={trap.id}>
              <button type="button" onClick={() => setSelectedTrapId(trap.id)} aria-pressed={isSelected} className={`block min-h-11 w-full border-b border-term-line-soft px-3 py-2 text-left ${isSelected ? 'bg-term-select text-term-fg-strong' : index % 2 ? 'bg-term-row-alt hover:bg-term-head' : 'hover:bg-term-head'}`}>
                <span className="block text-sm font-semibold text-term-fg-strong">{guide.title}</span>
                <span className={`mt-0.5 block text-sm leading-5 ${isSelected ? 'text-term-select-fg' : 'text-term-sub'}`}>{guide.summary}</span>
              </button>
              {isSelected && <div className="border-b border-term-line lg:hidden"><RiskDetail guide={guide} trap={trap} /></div>}
            </div>
          );
        })}
      </div>
      <div className="hidden lg:block">
        <div className="term-panel-title"><span className="term-panel-name">詳細</span></div>
        {selected && <RiskDetail guide={riskGuide(selected)} trap={selected} />}
      </div>
      {shelfLifeAlerts.length > 0 && <details className="border-t border-term-line px-3 lg:col-span-2">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-0">環境変化の資料（{shelfLifeAlerts.length}件）</summary>
        <div className="grid gap-x-4 pb-3 sm:grid-cols-2">{shelfLifeAlerts.map((alert) => <article key={alert.id} className="space-y-1 border-t border-term-line-soft py-2 text-sm leading-6 text-term-fg"><h3 className="font-semibold text-term-fg-strong">{alert.playbookName}</h3><p className="term-num text-xs text-term-label">{alert.downgradeDate}</p><p>{alert.triggerEvent}</p><p>{alert.fatalReason}</p><p>{alert.survivalPivot}</p></article>)}</div>
      </details>}
    </div>
  );
};

function riskGuide(trap: DeathTrapsSectionProps['deathTraps'][number]): RiskGuide {
  return RISKS[trap.id] ?? { title: trap.title, summary: trap.mechanism, signal: trap.warningSigns.join(' / '), impact: trap.mechanism, response: trap.antidote };
}

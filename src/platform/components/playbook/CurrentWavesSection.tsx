'use client';

import React from 'react';
import type { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';

interface CurrentWavesSectionProps {
  currentWaves: MacroIntelligenceData['currentWaves'];
  selectedWaveId: string;
  setSelectedWaveId: (id: string) => void;
  activeWave?: MacroIntelligenceData['currentWaves'][number];
}

type ModelGuide = { title: string; summary: string; customer: string; offer: string; revenue: string; verify: string };

const MODELS: Record<string, ModelGuide> = {
  'wave-saas-boilerplate': {
    title: 'アプリ開発用テンプレートの販売',
    summary: '認証、決済、通知など繰り返し作る部分をまとめて提供する案。',
    customer: '新しいWebサービスを立ち上げる開発者や小規模チーム。',
    offer: '動くコード、導入手順、更新時の互換性情報。',
    revenue: 'ライセンス販売と継続更新・サポート。',
    verify: '買い手が自作をやめてまで使いたい部分と、保守に必要な時間。',
  },
  'wave-privacy-b2b': {
    title: 'シンプルなアクセス解析',
    summary: 'サイトの利用状況を、必要な項目に絞って見せる案。',
    customer: '専門の分析担当がいないサイト運営者。',
    offer: '訪問、流入、主要な操作を確認できる画面。',
    revenue: 'サイト数や利用量に応じた継続利用料。',
    verify: '利用者が本当に見る指標、取得への同意、既存ツールからの移行負担。',
  },
  'wave-b2b-expense-ai': {
    title: '組織向けプロフィール写真の制作',
    summary: '複数人の写真制作と更新を、組織として管理できるようにする案。',
    customer: '社員紹介や営業資料の写真をそろえたい事業者。',
    offer: '撮影・編集の受付、確認、納品、利用許諾の管理。',
    revenue: '人数・制作回数に応じた料金、または年間契約。',
    verify: '本人の同意、肖像の利用範囲、品質基準、修正対応。',
  },
  'wave-faceless-commerce': {
    title: '商品の実演動画制作',
    summary: '顔出しを前提にせず、使用場面が伝わる短い動画を作る案。',
    customer: '商品の使い方を画面上で説明したい販売者。',
    offer: '構成、撮影、編集、掲載先に合わせた動画データ。',
    revenue: '動画ごとの制作費用や継続制作契約。',
    verify: '商品の実物確認、広告表示のルール、動画経由の販売結果。',
  },
};

const ModelDetail: React.FC<{ guide: ModelGuide; wave: CurrentWavesSectionProps["currentWaves"][number] }> = ({ guide, wave }) => (
  <div>
    <h3 className="hidden border-b border-term-line px-3 py-2 text-base font-semibold text-term-fg-strong lg:block">{guide.title}</h3>
    <dl className="text-sm leading-6">
      {[
        ['想定する顧客', guide.customer],
        ['提供するもの', guide.offer],
        ['収益の取り方', guide.revenue],
        ['成立を確かめる点', guide.verify],
      ].map(([label, value]) => (
        <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs text-term-label">{label}</dt>
          <dd className="text-term-fg">{value}</dd>
        </div>
      ))}
    </dl>
    <details className="border-b border-term-line px-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-6">背景・手順の資料</summary>
      <div className="space-y-3 pb-3 text-sm leading-6 text-term-fg">
        <p>{wave.whyItWinsNow}</p><p>{wave.shelfLifeAnalysis}</p>
        <h4 className="font-medium text-term-fg-strong">{wave.lootBlueprint.headline}</h4>
        <ol className="list-decimal space-y-2 pl-5">{wave.lootBlueprint.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        {wave.proofEntities.length > 0 && <section className="border-t border-term-line pt-3"><h4 className="text-xs text-term-label">資料内の参考例</h4>{wave.proofEntities.map((entity) => <p key={entity.id} className="mt-2"><span className="font-medium text-term-fg-strong">{entity.name}</span> — {entity.tagline}</p>)}</section>}
      </div>
    </details>
  </div>
);

export const CurrentWavesSection: React.FC<CurrentWavesSectionProps> = ({ currentWaves, selectedWaveId, setSelectedWaveId }) => {
  const selected = currentWaves.find((wave) => wave.id === selectedWaveId) ?? currentWaves[0];
  return (
    <div className="grid w-full lg:grid-cols-[minmax(280px,36%)_minmax(0,1fr)]">
      <div className="lg:border-r lg:border-term-line">
        <div className="term-panel-title"><span className="term-panel-name">事業の型</span><span className="term-num">{currentWaves.length}件</span></div>
        {currentWaves.map((wave, index) => {
          const guide = waveGuide(wave);
          const isSelected = selected?.id === wave.id;
          return (
            <div key={wave.id}>
              <button type="button" onClick={() => setSelectedWaveId(wave.id)} aria-pressed={isSelected} className={`block min-h-11 w-full border-b border-term-line-soft px-3 py-2 text-left ${isSelected ? 'bg-term-select text-term-fg-strong' : index % 2 ? 'bg-term-row-alt hover:bg-term-head' : 'hover:bg-term-head'}`}>
                <span className="block text-sm font-semibold text-term-fg-strong">{guide.title}</span>
                <span className={`mt-0.5 block text-sm leading-5 ${isSelected ? 'text-term-select-fg' : 'text-term-sub'}`}>{guide.summary}</span>
              </button>
              {isSelected && <div className="border-b border-term-line lg:hidden"><ModelDetail guide={guide} wave={wave} /></div>}
            </div>
          );
        })}
      </div>
      <div className="hidden lg:block">
        <div className="term-panel-title"><span className="term-panel-name">詳細</span></div>
        {selected && <ModelDetail guide={waveGuide(selected)} wave={selected} />}
      </div>
    </div>
  );
};

function waveGuide(wave: CurrentWavesSectionProps['currentWaves'][number]): ModelGuide {
  return MODELS[wave.id] ?? { title: wave.title, summary: wave.targetPainWallet, customer: wave.targetPainWallet, offer: wave.lootBlueprint.headline, revenue: wave.whyItWinsNow, verify: wave.shelfLifeAnalysis };
}

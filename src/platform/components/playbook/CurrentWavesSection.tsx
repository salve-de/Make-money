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
  <div className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
    <h3 className="hidden border-b border-white/[0.12] bg-[#1a2530] px-4 py-3 text-base font-semibold text-white lg:block">{guide.title}</h3>
    <dl className="divide-y divide-white/[0.1] px-4 text-sm leading-6">
      {[
        ['想定する顧客', guide.customer],
        ['提供するもの', guide.offer],
        ['収益の取り方', guide.revenue],
        ['成立を確かめる点', guide.verify],
      ].map(([label, value]) => (
        <div key={label} className="grid gap-0.5 py-2 sm:py-2.5 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs font-medium text-sky-200">{label}</dt>
          <dd className="text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
    <details className="border-t border-white/[0.12] px-4 pb-3">
      <summary className="cursor-pointer py-3 text-sm font-medium text-sky-200">背景・手順の資料</summary>
      <div className="space-y-3 text-sm leading-6 text-zinc-200">
        <p>{wave.whyItWinsNow}</p><p>{wave.shelfLifeAnalysis}</p>
        <h4 className="font-medium">{wave.lootBlueprint.headline}</h4>
        <ol className="list-decimal space-y-2 pl-5">{wave.lootBlueprint.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        {wave.proofEntities.length > 0 && <section className="border-t border-white/[0.1] pt-3"><h4 className="text-xs font-medium text-zinc-400">資料内の参考例</h4>{wave.proofEntities.map((entity) => <p key={entity.id} className="mt-2"><span className="font-medium">{entity.name}</span> — {entity.tagline}</p>)}</section>}
      </div>
    </details>
  </div>
);

export const CurrentWavesSection: React.FC<CurrentWavesSectionProps> = ({ currentWaves, selectedWaveId, setSelectedWaveId }) => {
  const selected = currentWaves.find((wave) => wave.id === selectedWaveId) ?? currentWaves[0];
  return (
    <div className="mx-auto grid max-w-7xl gap-3 p-3 sm:p-5 lg:grid-cols-[minmax(260px,36%)_minmax(0,1fr)]">
      <div className="space-y-2">
        {currentWaves.map((wave) => {
          const guide = waveGuide(wave);
          const isSelected = selected?.id === wave.id;
          return (
            <div key={wave.id}>
              <button type="button" onClick={() => setSelectedWaveId(wave.id)} aria-pressed={isSelected} className={`w-full rounded-md border-l-[3px] px-3 py-3 text-left transition-colors ${isSelected ? 'border-sky-300 bg-[#1a2530]' : 'border-transparent bg-[#101721] hover:bg-[#18212b]'}`}>
                <span className="block text-sm font-semibold text-white">{guide.title}</span>
                <span className="mt-1 block text-sm leading-5 text-zinc-300">{guide.summary}</span>
              </button>
              {isSelected && <div className="mt-2 lg:hidden"><ModelDetail guide={guide} wave={wave} /></div>}
            </div>
          );
        })}
      </div>
      <div className="hidden lg:block">{selected && <ModelDetail guide={waveGuide(selected)} wave={selected} />}</div>
    </div>
  );
};

function waveGuide(wave: CurrentWavesSectionProps['currentWaves'][number]): ModelGuide {
  return MODELS[wave.id] ?? { title: wave.title, summary: wave.targetPainWallet, customer: wave.targetPainWallet, offer: wave.lootBlueprint.headline, revenue: wave.whyItWinsNow, verify: wave.shelfLifeAnalysis };
}

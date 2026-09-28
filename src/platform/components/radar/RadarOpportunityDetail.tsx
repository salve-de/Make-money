'use client';

import React from 'react';
import type { MarketRadarTrendItem } from '@/platform/data/marketRadarData';
import { radarTrendGuide, radarTrendTitle } from './radarLabels';

interface RadarOpportunityDetailProps {
  trend: MarketRadarTrendItem;
}

export const RadarOpportunityDetail: React.FC<RadarOpportunityDetailProps> = ({ trend }) => {
  const guide = radarTrendGuide(trend.id);
  const playbook = trend.actionablePlaybook;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <header className="border-b border-white/[0.16] pb-3">
        <p className="text-xs font-medium text-sky-200">{guide?.category || trend.categoryLabel}</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
          {radarTrendTitle(trend.id, trend.categoryLabel)}
        </h1>
        <p className="mt-1 text-sm leading-5 text-zinc-300">{guide?.summary || trend.subtitle}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {(guide ? [
          ['使う人', guide.customer],
          ['提供するもの', guide.service],
          ['提供方法', guide.delivery],
          ['最初に確かめること', guide.firstCheck],
        ] : []).map(([label, value]) => (
          <section key={label} className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
            <h2 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">{label}</h2>
            <p className="px-4 py-3 text-sm leading-6 text-zinc-200">{value}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['背景の分析', trend.macroContext.whyNow],
          ['顧客の課題', trend.macroContext.targetPainWallet],
          ['競争上の着眼点', trend.gapAndProof.incumbentGap.fatalDilemma],
          ['参入の切り口（案）', playbook.unbundlingAngle],
        ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
          <section key={label} className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
            <h2 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">{label}</h2>
            <p className="break-words px-4 py-3 text-sm leading-6 text-zinc-200">{value}</p>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
        <h2 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">具体的な事業案</h2>
        <dl className="divide-y divide-white/[0.08] px-4 text-sm leading-6">
          {[
            ['価格設定の案', playbook.pricingRecommendation],
            ['初期顧客の獲得案', playbook.first10CustomersLog],
            ['実行時の注意点', playbook.fatalPitfalls],
          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
              <dt className="text-xs font-medium text-sky-200">{label}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
        {playbook.threeToolStack.length > 0 && <details className="border-t border-white/[0.08] px-4">
          <summary className="cursor-pointer py-3 text-sm font-medium text-zinc-200">ツール構成・費用案</summary>
          <ul className="divide-y divide-white/[0.08] text-sm">
            {playbook.threeToolStack.map((tool) => (
              <li key={tool.name} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
                <div className="min-w-0 break-words"><p className="font-medium text-zinc-100">{tool.name}</p><p className="text-xs leading-5 text-zinc-300">{tool.role}</p></div>
                <p className="text-xs text-zinc-300">{tool.cost}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-white/[0.08] py-3 text-xs text-zinc-300">費用の想定: {playbook.totalMonthlyCost}</p>
        </details>}
      </section>
    </div>
  );
};

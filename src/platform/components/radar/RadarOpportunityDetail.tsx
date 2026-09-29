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

  const plan = [
    ['価格設定の案', playbook.pricingRecommendation],
    ['初期顧客の獲得案', playbook.first10CustomersLog],
    ['実行時の注意点', playbook.fatalPitfalls],
  ].filter(([, value]) => Boolean(value));
  const overview = guide ? [
    ['使う人', guide.customer],
    ['提供するもの', guide.service],
    ['提供方法', guide.delivery],
    ['最初に確かめること', guide.firstCheck],
  ] : [];
  const analysis = [
    ['背景の分析', trend.macroContext.whyNow],
    ['顧客の課題', trend.macroContext.targetPainWallet],
    ['競争上の着眼点', trend.gapAndProof.incumbentGap.fatalDilemma],
    ['参入の切り口（案）', playbook.unbundlingAngle],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="w-full">
      <header className="border-b border-term-line px-3 py-3">
        <p className="text-xs text-term-label">{guide?.category || trend.categoryLabel}</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug text-term-fg-strong sm:text-2xl">
          {radarTrendTitle(trend.id, trend.categoryLabel)}
        </h1>
        <p className="mt-1 text-sm leading-5 text-term-sub">{guide?.summary || trend.subtitle}</p>
      </header>

      <section aria-labelledby="radar-plan-heading">
        <div className="term-panel-title"><h2 id="radar-plan-heading" className="term-panel-name">具体的な事業案</h2></div>
        <dl className="text-sm leading-6">
          {plan.map(([label, value]) => (
            <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-xs text-term-label sm:pt-0.5">{label}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-term-fg">{value}</dd>
            </div>
          ))}
        </dl>
        {playbook.threeToolStack.length > 0 && <details className="border-b border-term-line px-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-6">ツール構成・費用案</summary>
          <ul className="text-sm">
            {playbook.threeToolStack.map((tool) => (
              <li key={tool.name} className="grid gap-1 border-t border-term-line-soft py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
                <div className="min-w-0 break-words"><p className="font-medium text-term-fg-strong">{tool.name}</p><p className="text-xs leading-5 text-term-sub">{tool.role}</p></div>
                <p className="term-num text-xs text-term-sub">{tool.cost}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-term-line-soft py-3 text-xs text-term-sub">費用の想定: {playbook.totalMonthlyCost}</p>
        </details>}
      </section>

      {overview.length > 0 && <section aria-labelledby="radar-overview-heading">
        <div className="term-panel-title"><h2 id="radar-overview-heading" className="term-panel-name">事業の形</h2></div>
        <dl className="grid text-sm leading-6 sm:grid-cols-2">
          {overview.map(([label, value], index) => (
            <div key={label} className={`border-b border-term-line-soft px-3 py-2 ${index % 2 === 0 ? 'sm:border-r' : ''}`}>
              <dt className="text-xs text-term-label">{label}</dt>
              <dd className="break-words text-term-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </section>}

      <section aria-labelledby="radar-analysis-heading">
        <div className="term-panel-title"><h2 id="radar-analysis-heading" className="term-panel-name">背景と競争</h2></div>
        <dl className="text-sm leading-6">
          {analysis.map(([label, value]) => (
            <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-xs text-term-label sm:pt-0.5">{label}</dt>
              <dd className="break-words text-term-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

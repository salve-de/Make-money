'use client';

import React from 'react';
import type { MarketRadarLandmineItem } from '@/platform/data/marketRadarData';
import { RADAR_LANDMINE_GUIDES } from './radarLandmineGuides';

interface RadarLandmineDetailProps {
  landmine: MarketRadarLandmineItem;
}

export const RadarLandmineDetail: React.FC<RadarLandmineDetailProps> = ({ landmine }) => {
  const guide = RADAR_LANDMINE_GUIDES[landmine.id] ?? {
    category: landmine.fatalCategory, title: landmine.title, summary: landmine.subtitle,
    signal: landmine.survivalWedge.whatToAvoid, impact: landmine.deadlyReason.mechanism,
    response: landmine.survivalWedge.howToPivotOrSurvive,
  };

  return (
    <div className="w-full">
      <header className="border-b border-term-line px-3 py-3">
        <p className="text-xs text-term-label">{guide.category}</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug text-term-fg-strong sm:text-2xl">{guide.title}</h1>
        <p className="mt-1 text-sm leading-5 text-term-sub">{guide.summary}</p>
      </header>

      <dl className="text-sm leading-6">
        {[
          ['見つける兆候', guide.signal],
          ['起こり得ること', guide.impact],
          ['見直し方', guide.response],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-xs text-term-label sm:pt-0.5">{label}</dt>
            <dd className="text-term-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <details className="border-b border-term-line px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-0">要因・対応の資料</summary>
        <div className="space-y-3 pb-3 text-sm leading-6 text-term-fg"><p>{landmine.deadlyReason.mechanism}</p><p>{landmine.survivalWedge.whatToAvoid}</p><p>{landmine.survivalWedge.howToPivotOrSurvive}</p>
        {landmine.graveyardExamples.length > 0 && <section className="border-t border-term-line pt-3"><h2 className="text-xs text-term-label">資料内の参考例</h2>{landmine.graveyardExamples.map((example, index) => <article key={index} className="mt-3"><h3 className="font-medium text-term-fg-strong">{example.name}</h3><p>{example.deathTrigger}</p></article>)}</section>}</div>
      </details>
    </div>
  );
};

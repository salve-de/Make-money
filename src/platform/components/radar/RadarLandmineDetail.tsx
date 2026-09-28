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
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <header className="border-b border-white/[0.16] pb-3">
        <p className="text-xs font-medium text-rose-200">{guide.category}</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">{guide.title}</h1>
        <p className="mt-1 text-sm leading-5 text-zinc-300">{guide.summary}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['見つける兆候', guide.signal],
          ['起こり得ること', guide.impact],
          ['見直し方', guide.response],
        ].map(([label, value]) => (
          <section key={label} className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
            <h2 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">{label}</h2>
            <p className="px-4 py-3 text-sm leading-6 text-zinc-200">{value}</p>
          </section>
        ))}
      </div>
      <details className="rounded-md border border-white/[0.16] bg-[#101721] px-4 pb-3">
        <summary className="cursor-pointer py-3 text-sm font-medium text-rose-200">要因・対応の資料</summary>
        <div className="space-y-3 text-sm leading-6 text-zinc-200"><p>{landmine.deadlyReason.mechanism}</p><p>{landmine.survivalWedge.whatToAvoid}</p><p>{landmine.survivalWedge.howToPivotOrSurvive}</p>
        {landmine.graveyardExamples.length > 0 && <section className="border-t border-white/[0.1] pt-3"><h2 className="text-xs font-medium text-zinc-400">資料内の参考例</h2>{landmine.graveyardExamples.map((example, index) => <article key={index} className="mt-3"><h3 className="font-medium">{example.name}</h3><p>{example.deathTrigger}</p></article>)}</section>}</div>
      </details>
    </div>
  );
};

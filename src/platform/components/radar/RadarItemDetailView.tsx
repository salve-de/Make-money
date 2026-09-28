'use client';

import React from 'react';
import Link from 'next/link';
import { MARKET_RADAR_TRENDS, MARKET_RADAR_LANDMINES } from '@/platform/data/marketRadarData';
import { ArrowLeft } from 'lucide-react';
import { RadarOpportunityDetail } from './RadarOpportunityDetail';
import { RadarLandmineDetail } from './RadarLandmineDetail';

interface RadarItemDetailViewProps {
  id: string;
  onSelectEntity?: (entityId: string) => void;
  resolveEntityId?: (entityId: string) => string | null;
}

export const RadarItemDetailView: React.FC<RadarItemDetailViewProps> = ({ id }) => {
  const trend = MARKET_RADAR_TRENDS.find((item) => item.id === id);
  const landmine = MARKET_RADAR_LANDMINES.find((item) => item.id === id);

  if (!trend && !landmine) {
    return (
      <div className="flex-1 bg-term-bg text-term-fg">
        <div className="term-panel-title"><span className="term-panel-name">市場動向</span></div>
        <div className="px-3 py-4 text-sm">
          <h2 className="text-base font-semibold text-term-fg-strong">項目が見つかりません</h2>
          <p className="mt-1 text-term-sub">リンク先の資料は削除されたか、URLが正しくありません。一覧から選び直してください。</p>
          <Link href="/radar" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm border border-term-accent px-4 text-sm text-term-accent hover:bg-term-head lg:min-h-8">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            市場動向の一覧へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-term-bg text-term-fg">
      <div className="term-panel-title">
        <span className="term-panel-name">市場動向</span>
        <Link href="/radar" className="inline-flex min-h-6 items-center gap-1 text-term-sub hover:text-term-fg-strong">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />一覧へ戻る
        </Link>
      </div>
      <div className="w-full max-w-6xl flex-1">
        {trend && <RadarOpportunityDetail trend={trend} />}
        {landmine && <RadarLandmineDetail landmine={landmine} />}
      </div>
    </div>
  );
};

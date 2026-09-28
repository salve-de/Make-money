'use client';

import React from 'react';
import Link from 'next/link';
import { MARKET_RADAR_TRENDS, MARKET_RADAR_LANDMINES } from '@/platform/data/marketRadarData';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
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
      <div className="grid flex-1 place-items-center bg-background p-6 text-zinc-300">
        <div className="max-w-md rounded-lg border border-white/[0.12] bg-surface p-6 text-center">
          <AlertTriangle aria-hidden="true" className="mx-auto h-7 w-7 text-amber-200" />
          <h2 className="mt-3 text-lg font-semibold text-white">項目が見つかりません</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">リンク先の資料は削除されたか、URLが正しくありません。</p>
          <Link href="/radar" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/[0.14] bg-surface-raised px-4 text-sm text-zinc-100">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            市場動向の一覧へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
        <Link href="/radar" className="inline-flex min-h-10 items-center gap-2 text-xs text-zinc-400 hover:text-white">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />市場動向
        </Link>
        {trend && <RadarOpportunityDetail trend={trend} />}
        {landmine && <RadarLandmineDetail landmine={landmine} />}
      </div>
    </div>
  );
};

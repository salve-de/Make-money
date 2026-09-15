'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RadarItemDetailView } from '@/platform/components/radar/RadarItemDetailView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import type { SnapshotEntity } from '@/platform/utils/financialSnapshot';

interface RadarDetailClientShellProps {
  id: string;
  entities: SnapshotEntity[];
}

export const RadarDetailClientShell: React.FC<RadarDetailClientShellProps> = ({ id, entities }) => {
  const router = useRouter();

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060709] overflow-hidden">
      <GlobalHeader currentSection="RADAR" />
      <MarketTickerStrip entities={entities} sourceLabel="市場レーダー詳細" onSelectEntity={handleSelectEntity} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RadarItemDetailView id={id} onSelectEntity={handleSelectEntity} />
      </main>
    </div>
  );
};

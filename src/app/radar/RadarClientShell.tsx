'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MarketRadarView } from '@/platform/components/radar/MarketRadarView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import { FinancialEntity } from '@/platform/types/terminal';

interface RadarClientShellProps {
  entities: FinancialEntity[];
}

export const RadarClientShell: React.FC<RadarClientShellProps> = ({ entities }) => {
  const router = useRouter();

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060709] overflow-hidden">
      {/* 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader currentSection="RADAR" />

      {/* 最上部 ティッカーストリップ */}
      <MarketTickerStrip entities={entities} sourceLabel="市場レーダー連動" onSelectEntity={handleSelectEntity} />

      {/* メインビュー */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MarketRadarView onSelectEntity={handleSelectEntity} />
      </main>
    </div>
  );
};

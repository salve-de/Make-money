'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';
import { PlaybookIntelligenceView } from '@/platform/components/playbook/PlaybookIntelligenceView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import { FinancialEntity } from '@/platform/types/terminal';

interface PlaybookClientShellProps {
  macroData: MacroIntelligenceData;
  entities: FinancialEntity[];
}

export const PlaybookClientShell: React.FC<PlaybookClientShellProps> = ({ macroData, entities }) => {
  const router = useRouter();

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060709] overflow-hidden">
      {/* 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader currentSection="PLAYBOOK" />

      {/* 最上部 ティッカーストリップ */}
      <MarketTickerStrip entities={entities} sourceLabel="保存済み台帳" onSelectEntity={handleSelectEntity} />

      {/* メインビュー */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PlaybookIntelligenceView
          data={macroData}
          onSelectEntity={handleSelectEntity}
        />
      </main>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RadarItemDetailView } from '@/platform/components/radar/RadarItemDetailView';
import { TerminalSidebar } from '@/platform/components/navigation/TerminalSidebar';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import { WorkspaceMode, GridFilterOption, FinancialEntity } from '@/platform/types/terminal';

interface RadarDetailClientShellProps {
  id: string;
  entities: FinancialEntity[];
}

export const RadarDetailClientShell: React.FC<RadarDetailClientShellProps> = ({ id, entities }) => {
  const router = useRouter();
  const workspaceMode: WorkspaceMode = 'RADAR';
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>('ALL');

  const handleSelectMode = (mode: WorkspaceMode) => {
    if (mode === 'RADAR') {
      router.push('/radar');
    } else if (mode === 'PLAYBOOK') {
      router.push('/playbook');
    } else {
      router.push(`/?mode=${mode}`);
    }
  };

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060709] overflow-hidden">
      {/* 最上部 ティッカーストリップ */}
      <MarketTickerStrip entities={entities} sourceLabel="市場レーダー詳細" onSelectEntity={handleSelectEntity} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左側 固定ナビゲーションサイドバー */}
        <TerminalSidebar
          workspaceMode={workspaceMode}
          onSelectMode={handleSelectMode}
          currentFilter={currentFilter}
          onSelectFilter={setCurrentFilter}
          bookmarkCount={0}
        />

        {/* メインビュー */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <RadarItemDetailView id={id} onSelectEntity={handleSelectEntity} />
        </main>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';
import { PlaybookIntelligenceView } from '@/platform/components/playbook/PlaybookIntelligenceView';
import { TerminalSidebar } from '@/platform/components/navigation/TerminalSidebar';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import { WorkspaceMode, GridFilterOption, FinancialEntity } from '@/platform/types/terminal';

interface PlaybookClientShellProps {
  macroData: MacroIntelligenceData;
  entities: FinancialEntity[];
}

export const PlaybookClientShell: React.FC<PlaybookClientShellProps> = ({ macroData, entities }) => {
  const router = useRouter();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('PLAYBOOK');
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>('ALL');

  const handleSelectMode = (mode: WorkspaceMode) => {
    if (mode === 'PLAYBOOK') {
      setWorkspaceMode('PLAYBOOK');
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
      <MarketTickerStrip entities={entities} sourceLabel="保存済み台帳" onSelectEntity={handleSelectEntity} />

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
          <PlaybookIntelligenceView
            data={macroData}
            onSelectEntity={handleSelectEntity}
          />
        </main>
      </div>
    </div>
  );
};

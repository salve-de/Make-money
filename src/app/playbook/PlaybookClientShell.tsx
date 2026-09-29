'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';
import { PlaybookIntelligenceView } from '@/platform/components/playbook/PlaybookIntelligenceView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';

interface PlaybookClientShellProps {
  macroData: MacroIntelligenceData;
}

export const PlaybookClientShell: React.FC<PlaybookClientShellProps> = ({ macroData }) => {
  const router = useRouter();

  const handleSelectEntity = (entityId: string) => {
    router.push(`/?entity=${entityId}&mode=LEDGER`);
  };

  return (
    <div className="flex term-screen w-full flex-col overflow-hidden bg-background">
      {/* 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader currentSection="PLAYBOOK" />

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

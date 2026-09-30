'use client';

import React from 'react';
import { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';
import { usePlaybookNavigation, PlaybookTabKey } from '../../hooks/usePlaybookNavigation';
import { SquareTabs, type SquareTab } from './SquareTabs';
import { ToolRadarSection } from './ToolRadarSection';
import { DeathTrapsSection } from './DeathTrapsSection';
import { CurrentWavesSection } from './CurrentWavesSection';
import { GenesisSection, GoldenStackSection } from './GenesisAndStackSection';

export type { PlaybookTabKey };

const PLAYBOOK_TABS: ReadonlyArray<SquareTab<PlaybookTabKey>> = [
  { key: 'TOOL_RADAR', label: 'ツール構成' },
  { key: 'SHELF_LIFE_DOWNGRADES', label: '失敗と見直し' },
  { key: 'CURRENT_PLAYS', label: '事業の型' },
  { key: 'DIRTY_GENESIS', label: '初期の顧客獲得' },
  { key: 'GOLDEN_RECIPES', label: '技術構成の参考' },
];

interface PlaybookIntelligenceViewProps {
  data: MacroIntelligenceData;
  onSelectEntity?: (entityId: string) => void;
}

export const PlaybookIntelligenceView: React.FC<PlaybookIntelligenceViewProps> = ({
  data,
  onSelectEntity,
}) => {
  const {
    activeTab,
    setActiveTab,
    selectedToolCategory,
    setSelectedToolCategory,
    selectedTrapId,
    setSelectedTrapId,
    selectedWaveId,
    setSelectedWaveId,
    activeCategoryRadar,
    activeCategoryMeta,
    activeTrap,
    activeWave,
  } = usePlaybookNavigation(data);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-term-bg font-sans text-term-fg">
      <header className="shrink-0 border-b border-term-line bg-term-panel">
        <h1 className="sr-only">手口と道具</h1>
        <div className="term-panel-title max-sm:hidden">
          <span className="term-panel-name max-lg:hidden">手口と道具</span>
          <span className="hidden sm:inline">事業の型・ツール構成・失敗の見直し・初期の顧客獲得</span>
        </div>
        <SquareTabs
          ariaLabel="参考資料の種類"
          tabs={PLAYBOOK_TABS}
          value={activeTab}
          onChange={setActiveTab}
        />
      </header>

      {/* ─── 3. コンテンツ本体 ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'TOOL_RADAR' && (
          <ToolRadarSection
            selectedToolCategory={selectedToolCategory}
            setSelectedToolCategory={setSelectedToolCategory}
            activeCategoryRadar={activeCategoryRadar}
            activeCategoryMeta={activeCategoryMeta}
            onSelectEntity={onSelectEntity}
          />
        )}

        {activeTab === 'SHELF_LIFE_DOWNGRADES' && (
          <DeathTrapsSection
            shelfLifeAlerts={data.shelfLifeAlerts}
            deathTraps={data.deathTraps}
            selectedTrapId={selectedTrapId}
            setSelectedTrapId={setSelectedTrapId}
            activeTrap={activeTrap}
          />
        )}

        {activeTab === 'CURRENT_PLAYS' && (
          <CurrentWavesSection
            currentWaves={data.currentWaves}
            selectedWaveId={selectedWaveId}
            setSelectedWaveId={setSelectedWaveId}
            activeWave={activeWave}
          />
        )}

        {activeTab === 'DIRTY_GENESIS' && (
          <GenesisSection genesisTactics={data.genesisTactics} />
        )}

        {activeTab === 'GOLDEN_RECIPES' && (
          <GoldenStackSection goldenStackRecipes={data.goldenStackRecipes} />
        )}
      </div>
    </div>
  );
};

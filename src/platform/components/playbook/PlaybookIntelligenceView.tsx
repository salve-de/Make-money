'use client';

import React from 'react';
import {
  MacroIntelligenceData,
  TOOL_CATEGORIES,
  ToolCategoryKey,
} from '@/lib/intelligence/macro-aggregator';
import { usePlaybookNavigation, PlaybookTabKey } from '../../hooks/usePlaybookNavigation';
import { ToolRadarSection } from './ToolRadarSection';
import { DeathTrapsSection } from './DeathTrapsSection';
import { CurrentWavesSection } from './CurrentWavesSection';
import { GenesisSection, GoldenStackSection } from './GenesisAndStackSection';

export type { PlaybookTabKey };

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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground font-sans">
      <header className="shrink-0 border-b border-white/[0.14] bg-surface px-3 py-1.5 sm:px-5">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col">
          <h1 className="sr-only">事業・ツールの参考例</h1>

          <div className="flex items-center gap-2 py-1 sm:hidden">
            <select
              aria-label="参考資料の種類"
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as PlaybookTabKey)}
              className="h-9 min-w-0 flex-1 rounded border border-white/[0.16] bg-[#18232d] px-2 text-sm text-zinc-100"
            >
              <option value="TOOL_RADAR">ツール構成</option>
              <option value="SHELF_LIFE_DOWNGRADES">失敗と見直し</option>
              <option value="CURRENT_PLAYS">事業の型</option>
              <option value="DIRTY_GENESIS">初期の顧客獲得</option>
              <option value="GOLDEN_RECIPES">技術構成の参考</option>
            </select>
            {activeTab === 'TOOL_RADAR' && <>
              <label htmlFor="mobile-tool-category" className="sr-only">ツールの用途</label>
              <select
                id="mobile-tool-category"
                value={selectedToolCategory}
                onChange={(event) => setSelectedToolCategory(event.target.value as ToolCategoryKey)}
                className="h-9 min-w-0 flex-1 rounded border border-white/[0.16] bg-[#18232d] px-2 text-sm text-zinc-100"
              >
                {TOOL_CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label
                  .replace('デプロイ・ホスティング', 'ホスティング')
                  .replace('AI・推論エンジン', 'AI・推論')
                  .replace('データベース・基盤', 'データベース')
                  .replace('決済・サブスク課金', '決済・課金')
                  .replace('集客・CRM・配信', '集客・配信')
                  .replace('フロント・ノーコード', 'フロント制作')}</option>)}
              </select>
            </>}
          </div>
          <nav aria-label="参考資料の種類" className="hidden gap-1 sm:flex sm:flex-wrap">
          {/* ツールの構成・乗り換え */}
          <button
            onClick={() => setActiveTab('TOOL_RADAR')}
            type="button"
            aria-pressed={activeTab === 'TOOL_RADAR'}
            className={`flex min-h-10 items-center justify-center border-b-2 px-2.5 text-center text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'TOOL_RADAR'
                ? 'border-sky-300 bg-sky-300/[0.08] text-sky-200'
                : 'border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span>ツール構成</span>
          </button>

          <button
            onClick={() => setActiveTab('SHELF_LIFE_DOWNGRADES')}
            type="button"
            aria-pressed={activeTab === 'SHELF_LIFE_DOWNGRADES'}
            className={`flex min-h-10 items-center justify-center border-b-2 px-2.5 text-center text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'SHELF_LIFE_DOWNGRADES'
                ? 'border-sky-300 bg-sky-300/[0.08] text-sky-200'
                : 'border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span>失敗と見直し</span>
          </button>

          <button
            onClick={() => setActiveTab('CURRENT_PLAYS')}
            type="button"
            aria-pressed={activeTab === 'CURRENT_PLAYS'}
            className={`flex min-h-10 items-center justify-center border-b-2 px-2.5 text-center text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'CURRENT_PLAYS'
                ? 'border-sky-300 bg-sky-300/[0.08] text-sky-200'
                : 'border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span>事業の型</span>
          </button>

          <button
            onClick={() => setActiveTab('DIRTY_GENESIS')}
            type="button"
            aria-pressed={activeTab === 'DIRTY_GENESIS'}
            className={`flex min-h-10 items-center justify-center border-b-2 px-2.5 text-center text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'DIRTY_GENESIS'
                ? 'border-sky-300 bg-sky-300/[0.08] text-sky-200'
                : 'border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span>初期の顧客獲得</span>
          </button>

          <button
            onClick={() => setActiveTab('GOLDEN_RECIPES')}
            type="button"
            aria-pressed={activeTab === 'GOLDEN_RECIPES'}
            className={`flex min-h-10 items-center justify-center border-b-2 px-2.5 text-center text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'GOLDEN_RECIPES'
                ? 'border-sky-300 bg-sky-300/[0.08] text-sky-200'
                : 'border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <span>技術構成の参考</span>
          </button>
          </nav>
        </div>
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

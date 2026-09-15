'use client';

import React from 'react';
import {
  MacroIntelligenceData,
} from '@/lib/intelligence/macro-aggregator';
import {
  Wrench,
  TrendingUp,
  Skull,
  Flame,
  AlertTriangle,
  Zap,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
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
    getCategoryIcon,
  } = usePlaybookNavigation(data);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060709] text-zinc-100 overflow-hidden font-sans select-text">
      {/* ─── 1. 週次資本主義気象レーダーHUD（タイムスタンプ・差分速報） ─── */}
      <header className="border-b border-white/[0.08] bg-[#08090D] px-4 py-2.5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 週次ステータスアンカー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded">
              <Radio className="w-3.5 h-3.5 text-cyan-400 " />
              <span className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider">
                REFERENCE PLAYBOOK / {data.weeklyMeta.weekLabel}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              事業・ツールの参考プレイブック
              <span className="text-xs text-zinc-400 font-normal hidden sm:inline font-mono">
                / {data.weeklyMeta.sampleSizeLabel}
              </span>
            </h1>
          </div>

          {/* 直近差分メトリクスストリップ */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 " />
              <span className="text-emerald-300 font-bold">参考観測例: {data.weeklyMeta.newObservationsCount}件</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-300 font-bold">見直し例: {data.weeklyMeta.downgradeAlertsCount}件</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">乗り換え参考例:</span>
              <span className="text-cyan-400 font-semibold">{data.weeklyMeta.topRisingTool}</span>
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-amber-300" role="note">参考サンプル・一次証跡未確認。数値・費用・企業事例・判定は現在の実測や推奨ではありません。</p>

        {/* ─── 2. 5大ナレッジ切り替えタブ ─── */}
        <div className="flex items-center gap-1.5 mt-3 border-t border-white/[0.06] pt-2.5 overflow-x-auto scrollbar-none">
          {/* タブ1: ツールの勢力図推移＆乗り換え動向 ★核心 */}
          <button
            onClick={() => setActiveTab('TOOL_RADAR')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'TOOL_RADAR'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>ツール勢力図・乗り換え推移 (Stack Migration)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-400/20 text-cyan-300">
              月次推移チャート
            </span>
          </button>

          {/* タブ2: 賞味期限アラート＆即死検死録 */}
          <button
            onClick={() => setActiveTab('SHELF_LIFE_DOWNGRADES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'SHELF_LIFE_DOWNGRADES'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>賞味期限アラート ＆ 即死検死録 (Downgrades)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-400/20 text-rose-300">
              {data.shelfLifeAlerts.length}件警告
            </span>
          </button>

          {/* タブ3: 稼ぎの型の参考例 */}
          <button
            onClick={() => setActiveTab('CURRENT_PLAYS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'CURRENT_PLAYS'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>稼ぎの型の参考例 (Active Plays)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-emerald-400/20 text-emerald-300">
              実践レシピ
            </span>
          </button>

          {/* タブ4: 初動突破ゲリラ戦録 */}
          <button
            onClick={() => setActiveTab('DIRTY_GENESIS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'DIRTY_GENESIS'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>初動突破ゲリラ戦録 (First 100)</span>
          </button>

          {/* タブ5: 黄金スタックレシピ */}
          <button
            onClick={() => setActiveTab('GOLDEN_RECIPES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'GOLDEN_RECIPES'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-purple-400" />
            <span>黄金スタックレシピ (Golden Stack)</span>
          </button>

          <div className="ml-auto shrink-0 pl-2">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition-colors"
            >
              <span>← 個別企業台帳 (Ledger)</span>
            </Link>
          </div>
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
            getCategoryIcon={getCategoryIcon}
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

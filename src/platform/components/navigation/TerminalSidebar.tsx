'use client';

import React from 'react';
import { 
  Database, 
  FileText, 
  Bookmark, 
  Activity,
  Cpu,
  KeyRound
} from 'lucide-react';
import { GridFilterOption, WorkspaceMode, IntelligenceTopicId } from '../../types/terminal';

interface TerminalSidebarProps {
  workspaceMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  activeTopicId: IntelligenceTopicId;
  onSelectTopic: (topicId: IntelligenceTopicId) => void;
  currentFilter: GridFilterOption;
  onSelectFilter: (filter: GridFilterOption) => void;
  bookmarkCount: number;
  onOpenPro?: () => void;
}

export const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
  workspaceMode,
  onSelectMode,
  currentFilter,
  onSelectFilter,
  bookmarkCount,
  onOpenPro,
}) => {
  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-12 bg-[#07080B] border-r border-white/[0.06] py-3 z-20 select-none shrink-0">
      {/* 上部アイコンナビゲーション */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* システムエンブレム */}
        <div className="w-7 h-7 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* 区切り線 */}
        <div className="w-6 border-t border-white/[0.06]" />

        {/* ナビゲーションレールアイテム */}
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {/* 1. 財務台帳 (LEDGER) */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => {
                onSelectMode('LEDGER');
                onSelectFilter(currentFilter === 'BOOKMARKED' ? 'ALL' : currentFilter);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                workspaceMode === 'LEDGER' && currentFilter !== 'BOOKMARKED'
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <Database className="w-4 h-4" />
            </button>
            {/* ツールチップ */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              全銘柄 財務台帳 (Ledger)
            </div>
          </div>

          {/* 2. 特集インテリジェンス (DEEP_DIVE) */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => onSelectMode('DEEP_DIVE')}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                workspaceMode === 'DEEP_DIVE'
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
            {/* ツールチップ */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              特集インテリジェンス (Intelligence)
            </div>
          </div>

          {/* 3. 独自アイデア創出 ＆ 戦略壁打ち (SYNTHESIS) */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => onSelectMode('SYNTHESIS')}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                workspaceMode === 'SYNTHESIS'
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
            </button>
            {/* ツールチップ */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              戦略壁打ち ＆ アイデア合成 (Synthesis)
            </div>
          </div>

          {/* 4. 保存した銘柄 (WATCHLIST) */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => {
                onSelectMode('LEDGER');
                onSelectFilter('BOOKMARKED');
              }}
              className={`relative w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                workspaceMode === 'LEDGER' && currentFilter === 'BOOKMARKED'
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              {bookmarkCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>
            {/* ツールチップ */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              保存した銘柄 ({bookmarkCount})
            </div>
          </div>

          {/* 区切り線 */}
          <div className="w-5 border-t border-white/[0.08] my-1" />

          {/* 5. PROアンロック */}
          {onOpenPro && (
            <div className="relative group w-full flex justify-center">
              <button
                onClick={onOpenPro}
                className="w-9 h-9 flex items-center justify-center rounded-md bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-md cursor-pointer group-hover:scale-105"
                title="PROプランで全裏帳簿を解錠"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              {/* ツールチップ */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                PROプランで全裏帳簿を解錠
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

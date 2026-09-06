'use client';

import React from 'react';
import { 
  Database, 
  FileText, 
  Bookmark, 
  SlidersHorizontal,
  Activity
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
  onOpenScreener?: () => void;
}

export const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
  workspaceMode,
  onSelectMode,
  currentFilter,
  onSelectFilter,
  bookmarkCount,
  onOpenScreener,
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

          {/* 3. 保存した銘柄 (WATCHLIST) */}
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
          <div className="w-6 border-t border-white/[0.06] my-1" />

          {/* 4. 50軸スクリーナー */}
          {onOpenScreener && (
            <div className="relative group w-full flex justify-center">
              <button
                onClick={onOpenScreener}
                className="w-9 h-9 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {/* ツールチップ */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-1 px-2.5 py-1 bg-[#0E1015] border border-white/[0.1] rounded text-[11px] font-mono text-zinc-200 shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                50軸詳細スクリーナー
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 下部ステータス */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[9px] font-mono text-zinc-600 tracking-tighter">
          v2.5
        </span>
      </div>
    </aside>
  );
};



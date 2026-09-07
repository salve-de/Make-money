'use client';

import React from 'react';
import { 
  Database, 
  FileText, 
  Bookmark, 
  Activity,
  Hash,
  X
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
  availableTags?: string[];
  tagCounts?: Record<string, number>;
  activeTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
  workspaceMode,
  onSelectMode,
  currentFilter,
  onSelectFilter,
  bookmarkCount,
  availableTags = [],
  tagCounts = {},
  activeTag,
  onSelectTag,
}) => {
  return (
    <aside className="hidden md:flex flex-row bg-[#07080B] border-r border-white/[0.06] z-20 select-none shrink-0">
      {/* 1. 極薄アイコンナビレール (w-12 / 48px) */}
      <div className="flex flex-col items-center justify-between w-12 py-3 border-r border-white/[0.04]">
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
          </div>
        </div>

        {/* 下部ステータス */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono text-zinc-600 tracking-tighter">
            v2.5
          </span>
        </div>
      </div>

      {/* 2. 左側タグ探索カラム (w-40 / 縦スクロール対応) */}
      {availableTags.length > 0 && onSelectTag && (
        <div className="w-40 flex flex-col h-full bg-[#060709]/80 py-2.5">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-2.5 pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              <Hash className="w-3 h-3 text-emerald-400" />
              <span>TAGS</span>
            </div>
            {activeTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[9px] font-mono text-zinc-500 hover:text-white flex items-center gap-0.5 transition-colors"
                title="タグ解除"
              >
                <span>解除</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* タグリスト (縦スクロール可能) */}
          <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5 scrollbar-thin">
            <button
              onClick={() => onSelectTag(null)}
              className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono flex items-center justify-between transition-colors ${
                !activeTag
                  ? 'bg-white/[0.08] text-white font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              <span>すべて</span>
              <span className="text-[9px] opacity-60">ALL</span>
            </button>

            {availableTags.map((tag) => {
              const isActive = activeTag === tag;
              const count = tagCounts[tag] || 0;
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (workspaceMode !== 'LEDGER') {
                      onSelectMode('LEDGER');
                    }
                    onSelectTag(isActive ? null : tag);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono flex items-center justify-between group transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
                  }`}
                  title={`#${tag} (${count}件)`}
                >
                  <span className="truncate pr-1">#{tag}</span>
                  <span className={`text-[10px] tabular-nums shrink-0 font-mono ${
                    isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

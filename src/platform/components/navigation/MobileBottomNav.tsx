'use client';

import React from 'react';
import { Database, SlidersHorizontal, Bookmark, Layers, Cpu } from 'lucide-react';
import { GridFilterOption, WorkspaceMode } from '../../types/terminal';

interface MobileBottomNavProps {
  workspaceMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  currentFilter: GridFilterOption;
  onSelectFilter: (f: GridFilterOption) => void;
  onOpenScreener: () => void;
  bookmarkCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  workspaceMode,
  onSelectMode,
  currentFilter,
  onSelectFilter,
  onOpenScreener,
  bookmarkCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-13 bg-[#07080B]/95 backdrop-blur-md border-t border-white/[0.06] z-30 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] select-none">
      {/* 全件台帳 */}
      <button
        onClick={() => {
          onSelectMode('LEDGER');
          onSelectFilter('ALL');
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
          workspaceMode === 'LEDGER' && currentFilter === 'ALL' ? 'text-white font-medium' : 'text-zinc-500'
        }`}
      >
        <Database className="w-3.5 h-3.5 mb-0.5" />
        <span>全台帳</span>
      </button>

      {/* 稼ぎの型 */}
      <button
        onClick={() => onSelectMode('ARCHETYPES')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
          workspaceMode === 'ARCHETYPES' ? 'text-white font-medium' : 'text-zinc-500'
        }`}
      >
        <Layers className="w-3.5 h-3.5 mb-0.5" />
        <span>稼ぎの型</span>
      </button>

      {/* 独自アイデア合成・壁打ち */}
      <button
        onClick={() => onSelectMode('SYNTHESIS')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
          workspaceMode === 'SYNTHESIS' ? 'text-emerald-400 font-medium' : 'text-zinc-500'
        }`}
      >
        <Cpu className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
        <span>壁打ち</span>
      </button>

      {/* 50軸スクリーナー */}
      <button
        onClick={onOpenScreener}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 mb-0.5" />
        <span>50軸</span>
      </button>

      {/* 保存した台帳 */}
      <button
        onClick={() => {
          onSelectMode('LEDGER');
          onSelectFilter('BOOKMARKED');
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors relative ${
          workspaceMode === 'LEDGER' && currentFilter === 'BOOKMARKED' ? 'text-white font-medium' : 'text-zinc-500'
        }`}
      >
        <Bookmark className="w-3.5 h-3.5 mb-0.5" />
        <span>保存</span>
        {bookmarkCount > 0 && (
          <span className="absolute top-1 right-5 w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </button>
    </nav>
  );
};


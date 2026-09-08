'use client';

import React from 'react';
import { Database, LayoutDashboard, SlidersHorizontal, Bookmark } from 'lucide-react';

interface MobileBottomNavBarProps {
  mainView: 'TERMINAL' | 'PORTAL';
  onChangeMainView: (view: 'TERMINAL' | 'PORTAL') => void;
  onOpenScreener: () => void;
  bookmarkCount: number;
  activeFilterCount: number;
  onSelectBookmarkFilter: () => void;
  isBookmarkActive: boolean;
}

export const MobileBottomNavBar: React.FC<MobileBottomNavBarProps> = ({
  mainView,
  onChangeMainView,
  onOpenScreener,
  bookmarkCount,
  activeFilterCount,
  onSelectBookmarkFilter,
  isBookmarkActive
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080B10]/95 backdrop-blur-md border-t border-white/[0.08] px-2 py-1 flex items-center justify-around select-none text-[10px] font-sans pb-[calc(4px+env(safe-area-inset-bottom,0px))]">
      {/* 1. 台帳 */}
      <button
        onClick={() => onChangeMainView('TERMINAL')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded cursor-pointer transition-colors ${
          mainView === 'TERMINAL' && !isBookmarkActive
            ? 'text-emerald-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Database size={16} />
        <span>全頭台帳</span>
      </button>

      {/* 2. シグナル */}
      <button
        onClick={() => onChangeMainView('PORTAL')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded cursor-pointer transition-colors ${
          mainView === 'PORTAL'
            ? 'text-emerald-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <LayoutDashboard size={16} />
        <span>市場シグナル</span>
      </button>

      {/* 3. 50軸スクリーナー */}
      <button
        onClick={onOpenScreener}
        className="flex flex-col items-center gap-0.5 py-1 px-3 rounded cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors relative"
      >
        <div className="relative">
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        <span>50軸絞込</span>
      </button>

      {/* 4. ブックマーク */}
      <button
        onClick={onSelectBookmarkFilter}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded cursor-pointer transition-colors relative ${
          isBookmarkActive
            ? 'text-amber-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          <Bookmark size={16} className={isBookmarkActive ? 'fill-amber-400' : ''} />
          {bookmarkCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-zinc-950 font-mono text-[9px] font-bold flex items-center justify-center">
              {bookmarkCount}
            </span>
          )}
        </div>
        <span>保存台帳</span>
      </button>
    </nav>
  );
};

'use client';

import React from 'react';
import { Database, UserCheck, SlidersHorizontal, Bookmark } from 'lucide-react';
import { GridFilterOption } from '../../types/terminal';

interface MobileBottomNavProps {
  currentFilter: GridFilterOption;
  onSelectFilter: (f: GridFilterOption) => void;
  onOpenScreener: () => void;
  bookmarkCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentFilter,
  onSelectFilter,
  onOpenScreener,
  bookmarkCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-[#080C14]/95 backdrop-blur-md border-t border-white/[0.1] z-30 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] select-none">
      {/* 全件台帳 */}
      <button
        onClick={() => onSelectFilter('ALL')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
          currentFilter === 'ALL' ? 'text-emerald-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Database className="w-4 h-4 mb-0.5" />
        <span>全台帳</span>
      </button>

      {/* 完全1人 */}
      <button
        onClick={() => onSelectFilter('SOLO')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors ${
          currentFilter === 'SOLO' ? 'text-emerald-400 font-bold' : 'text-slate-400'
        }`}
      >
        <UserCheck className="w-4 h-4 mb-0.5" />
        <span>ソロ</span>
      </button>

      {/* 50軸スクリーナー */}
      <button
        onClick={onOpenScreener}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4 mb-0.5 text-emerald-400" />
        <span>50軸</span>
      </button>

      {/* 保存した台帳 */}
      <button
        onClick={() => onSelectFilter('BOOKMARKED')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-mono transition-colors relative ${
          currentFilter === 'BOOKMARKED' ? 'text-emerald-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Bookmark className="w-4 h-4 mb-0.5" />
        <span>保存</span>
        {bookmarkCount > 0 && (
          <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-amber-400" />
        )}
      </button>
    </nav>
  );
};

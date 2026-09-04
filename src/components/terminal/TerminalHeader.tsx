'use client';

import React from 'react';

interface TerminalHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenExport: () => void;
  onOpenProModal: () => void;
  totalCompaniesCount: number;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenExport,
  onOpenProModal,
  totalCompaniesCount
}) => {
  return (
    <header className="h-12 bg-[#16181D] border-b border-white/[0.08] flex items-center justify-between px-4 shrink-0 select-none">
      {/* 左ロゴ・タイトル */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-zinc-800 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-zinc-100">
            K
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">金鉱録</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-white/5 text-zinc-400">
            TERMINAL v2.4
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 pl-3 border-l border-white/[0.08]">
          <span>全{totalCompaniesCount}件 収益台帳</span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400">監査・推計照合済</span>
        </div>
      </div>

      {/* 中央検索バー */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、銘柄コード、ビジネスモデル、参入障壁で検索..."
            className="w-full h-8 pl-8 pr-12 bg-[#0E1013] border border-white/[0.08] rounded-md text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-colors font-sans"
          />
          <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <kbd className="hidden sm:inline-block absolute right-2 top-2 text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 rounded border border-white/5">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 右アクション群 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenExport}
          className="h-7 px-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-white/[0.08] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">台帳出力</span>
        </button>

        <button
          onClick={onOpenProModal}
          className="h-7 px-3 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
          <span>機関PRO</span>
        </button>
      </div>
    </header>
  );
};

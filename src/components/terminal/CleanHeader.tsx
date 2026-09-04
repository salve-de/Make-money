'use client';

import React from 'react';

interface CleanHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  mainView: string;
  onChangeMainView: (view: any) => void;
}

export const CleanHeader: React.FC<CleanHeaderProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  mainView,
  onChangeMainView
}) => {
  return (
    <header className="h-12 bg-[#0C0D10] border-b border-white/[0.08] flex items-center justify-between px-5 shrink-0 select-none font-sans">
      {/* 左ブランド ＆ メインナビ */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => onChangeMainView('PORTAL')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <span className="font-mono font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors tracking-wider uppercase">
            KIN-ROKOKU
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
            PLATFORM
          </span>
        </div>

        {/* メインビュー切替ナビゲーション */}
        <div className="flex items-center gap-1 bg-[#14161C] p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              mainView !== 'TERMINAL'
                ? 'bg-zinc-200 text-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ポータル・特集
          </button>
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              mainView === 'TERMINAL'
                ? 'bg-zinc-200 text-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            分析台帳 (DB)
          </button>
        </div>
      </div>

      {/* 中央〜右側検索バー ＆ 収録件数 */}
      <div className="flex items-center gap-4 flex-1 max-w-xl justify-end ml-4">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、業界、ビジネスモデル、参入障壁で検索..."
            className="w-full h-8 pl-8 pr-4 bg-[#14161B] border border-white/10 rounded text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors font-sans"
          />
          <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-zinc-400 shrink-0 bg-[#14161C] px-2.5 py-1 rounded border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>収録 {totalCount}社</span>
        </div>
      </div>
    </header>
  );
};

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
    <header className="h-13 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 select-none font-sans shadow-2xs">
      {/* 左ブランド ＆ メインナビ */}
      <div className="flex items-center gap-5">
        <div 
          onClick={() => onChangeMainView('PORTAL')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            収
          </div>
          <span className="font-bold text-sm text-slate-900 group-hover:text-slate-700 transition-colors tracking-tight font-sans">
            収益情報台帳
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
            PRO
          </span>
        </div>

        {/* メインビュー切替ナビゲーション */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs font-sans">
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
              mainView !== 'TERMINAL' && mainView !== 'IDEAS_VAULT'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            市場インテリジェンス
          </button>
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
              mainView === 'TERMINAL'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            企業財務データベース
          </button>
          <button
            onClick={() => onChangeMainView('IDEAS_VAULT')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              mainView === 'IDEAS_VAULT'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>実践機会台帳</span>
          </button>
        </div>
      </div>

      {/* 中央〜右側検索バー ＆ 収録件数 */}
      <div className="flex items-center gap-3.5 flex-1 max-w-xl justify-end ml-4">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、モデル、ツール、参入手順を検索..."
            className="w-full h-8.5 pl-8.5 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all font-sans"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-700 shrink-0 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="tabular-nums font-semibold">台帳収録: {totalCount}社</span>
        </div>
      </div>
    </header>
  );
};

'use client';

import React from 'react';

interface CleanHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenExport: () => void;
  onOpenProModal: () => void;
  onOpenInfrastructure: () => void;
  onOpenSubmission: () => void;
  totalCount: number;
  mainView: string;
  onChangeMainView: (view: any) => void;
}

export const CleanHeader: React.FC<CleanHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenExport,
  onOpenProModal,
  onOpenInfrastructure,
  onOpenSubmission,
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
            分析台帳
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs text-zinc-500 pl-3 border-l border-white/[0.08]">
          <span>高収益事業・財務分析台帳</span>
          <span>(収録: {totalCount}社)</span>
        </div>
      </div>

      {/* 中央検索バー */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
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
      </div>

      {/* 右アクション */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenInfrastructure}
          className="h-7 px-2.5 bg-[#14161E] hover:bg-zinc-800 text-zinc-300 rounded text-xs font-sans border border-white/10 flex items-center gap-1.5 transition-colors"
          title="会社設立・法人口座・会計インフラ"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>創業インフラ</span>
        </button>

        <button
          onClick={onOpenSubmission}
          className="h-7 px-2.5 bg-[#14161E] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-xs font-sans border border-white/10 hidden lg:flex items-center gap-1.5 transition-colors"
          title="ビジネス掲載申請（自薦・審査制）"
        >
          <span>掲載申請</span>
        </button>

        <button
          onClick={onOpenExport}
          className="h-7 px-3 bg-[#17191E] hover:bg-zinc-800 text-zinc-300 rounded text-xs font-mono border border-white/10 flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>データ出力</span>
        </button>

        <button
          onClick={onOpenProModal}
          className="h-7 px-3 bg-zinc-200 hover:bg-white text-zinc-900 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm font-sans"
        >
          <span>特別会員</span>
        </button>
      </div>
    </header>
  );
};

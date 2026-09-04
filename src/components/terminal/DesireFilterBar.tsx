'use client';

import React from 'react';

export type DesirePreset = 
  | 'ALL'
  | 'SOLO_MILLION'      // 個人・一人起業
  | 'ZERO_INVESTMENT'   // 初期費用ゼロ
  | 'AI_SAAS'           // 知能技術・小型SaaS
  | 'LOCAL_DX'          // 地方実業・非IT
  | 'MEDIA_LETTER'      // 広告費ゼロ・手紙
  | 'MEGA_MONOPOLY'     // 巨大独占・高利益
  | 'FOR_SALE';         // 事業売却中案件

export type SortOrder = 
  | 'MARGIN_DESC'       // 利益率が高い順
  | 'REVENUE_DESC'      // 売上が大きい順
  | 'TEAM_ASC'          // 人数が少ない順
  | 'INVEST_ASC';       // 初期費用が安い順

interface DesireFilterBarProps {
  activePreset: DesirePreset;
  onSelectPreset: (preset: DesirePreset) => void;
  activeSort: SortOrder;
  onSelectSort: (sort: SortOrder) => void;
  matchedCount: number;
  onOpenScreener: () => void;
  hasActiveFilters: boolean;
}

export const DesireFilterBar: React.FC<DesireFilterBarProps> = ({
  activePreset,
  onSelectPreset,
  activeSort,
  onSelectSort,
  matchedCount,
  onOpenScreener,
  hasActiveFilters
}) => {
  const presets: { id: DesirePreset; label: string }[] = [
    { id: 'ALL', label: 'すべて' },
    { id: 'SOLO_MILLION', label: '個人・一人起業' },
    { id: 'ZERO_INVESTMENT', label: '初期費用ゼロ' },
    { id: 'AI_SAAS', label: '知能技術・小型ツール' },
    { id: 'LOCAL_DX', label: '地方実業・非IT' },
    { id: 'MEDIA_LETTER', label: '広告費ゼロ・手紙' },
    { id: 'MEGA_MONOPOLY', label: '巨大独占・高利益' },
    { id: 'FOR_SALE', label: '事業売却案件' },
  ];

  return (
    <div className="bg-[#101115] border-b border-white/[0.08] px-5 py-2 select-none shrink-0 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* 左: 無機質で洗練されたセグメント風フィルターボタン（絵文字ゼロ） */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-mono text-zinc-500 shrink-0 mr-2">
            絞り込み:
          </span>
          {presets.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`h-6 px-2.5 rounded text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border-white/20 shadow-sm font-semibold'
                    : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-850 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* 右: 並び替えセレクタ ＆ 件数 */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 font-mono text-xs">
          <span className="text-zinc-500">
            該当 <span className="text-zinc-200 font-semibold">{matchedCount}</span> 件
          </span>

          <div className="h-6 bg-[#17191E] border border-white/10 rounded px-2 flex items-center gap-1 text-zinc-400">
            <span className="text-[11px] text-zinc-500">並び替え:</span>
            <select
              value={activeSort}
              onChange={(e) => onSelectSort(e.target.value as SortOrder)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-xs font-sans"
            >
              <option value="MARGIN_DESC" className="bg-zinc-900 text-zinc-100">利益率が高い順</option>
              <option value="REVENUE_DESC" className="bg-zinc-900 text-zinc-100">売上が大きい順</option>
              <option value="TEAM_ASC" className="bg-zinc-900 text-zinc-100">少人数順 (1人〜)</option>
              <option value="INVEST_ASC" className="bg-zinc-900 text-zinc-100">初期費用が安い順 (0円〜)</option>
            </select>
          </div>

          {/* ポップアップで開く多次元スクリーナーボタン */}
          <button
            onClick={onOpenScreener}
            className={`h-6 px-2.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 border ${
              hasActiveFilters
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                : 'bg-[#17191E] text-zinc-300 border-white/10 hover:bg-zinc-800'
            }`}
          >
            <span>多次元スクリーナー</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

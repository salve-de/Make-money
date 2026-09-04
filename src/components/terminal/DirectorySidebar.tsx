'use client';

import React from 'react';
import { CompanyRecord, ScaleTier, MoatPower } from '../../types/terminal';
import { RailNavView } from './LeftRail';

interface DirectorySidebarProps {
  companies: CompanyRecord[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  activeRailView: RailNavView;
  selectedMoatFilter: string;
  onSelectMoatFilter: (moat: string) => void;
  minMarginFilter: number;
  onSelectMinMarginFilter: (margin: number) => void;
}

export const DirectorySidebar: React.FC<DirectorySidebarProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  activeRailView,
  selectedMoatFilter,
  onSelectMoatFilter,
  minMarginFilter,
  onSelectMinMarginFilter
}) => {
  const getScaleTierLabel = (tier: ScaleTier) => {
    switch (tier) {
      case 'MEGA_CORP': return '巨大企業';
      case 'SCALE_UP': return '急成長新興';
      case 'NICHE_LEADER': return '中堅ニッチ';
      case 'SOLO_MICRO': return '個人1〜3名';
    }
  };

  const getScaleTierColor = (tier: ScaleTier) => {
    switch (tier) {
      case 'MEGA_CORP': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'SCALE_UP': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'NICHE_LEADER': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'SOLO_MICRO': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    }
    if (valJpy >= 100000000) {
      return `¥${(valJpy / 100000000).toFixed(0)}億`;
    }
    return `¥${(valJpy / 10000).toFixed(0)}万`;
  };

  const moatFilterOptions: { id: string; label: string }[] = [
    { id: 'ALL', label: '全堀' },
    { id: 'PROCESS_POWER', label: '組織プロセス' },
    { id: 'NETWORK_EFFECTS', label: 'ネットワーク' },
    { id: 'COUNTER_POSITIONING', label: '逆張り対抗' },
    { id: 'SWITCHING_COSTS', label: 'スイッチング' },
    { id: 'CORNERED_RESOURCE', label: '独占資源' },
    { id: 'BRANDING', label: 'ブランド' }
  ];

  return (
    <div className="w-64 bg-[#14161B] border-r border-white/[0.08] flex flex-col shrink-0 select-none overflow-hidden">
      {/* サイドバーヘッダー */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
            {activeRailView === 'ALL' && '全銘柄台帳'}
            {activeRailView === 'ENTERPRISE' && '大企業・覇者'}
            {activeRailView === 'SOLO' && '個人・少数精鋭'}
            {activeRailView === 'MOMENTUM' && '急成長モメンタム'}
            {activeRailView === 'FOR_SALE' && '買収・出資可能案件'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {companies.length}件
          </span>
        </div>

        {/* フィルタータグ */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {moatFilterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectMoatFilter(opt.id)}
              className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition-colors ${
                selectedMoatFilter === opt.id
                  ? 'bg-zinc-700 text-zinc-100 border-white/20'
                  : 'bg-zinc-850 text-zinc-400 border-white/5 hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* リスト一覧 */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {companies.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            該当する企業データがありません
          </div>
        ) : (
          companies.map((company) => {
            const isSelected = company.id === selectedCompanyId;
            const latestFin = company.financials[company.financials.length - 1];

            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany(company.id)}
                className={`p-3 cursor-pointer transition-all border-l-2 ${
                  isSelected
                    ? 'bg-[#1C1F26] border-indigo-500 text-zinc-100'
                    : 'hover:bg-zinc-850/50 border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {company.japaneseName}
                    </span>
                  </div>
                  {company.isForSale && (
                    <span className="shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      売却可
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {company.ticker}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${getScaleTierColor(company.scaleTier)}`}>
                    {getScaleTierLabel(company.scaleTier)}
                  </span>
                </div>

                {/* 財務サマリー（等幅数字） */}
                {latestFin && (
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-white/[0.04]">
                    <span className="text-zinc-500">売上:</span>
                    <span className="text-zinc-300">{formatShortAmount(latestFin.revenueJpy)}</span>
                    <span className="text-zinc-500 ml-1">営利:</span>
                    <span className={`font-semibold ${latestFin.operatingMarginPercent >= 40 ? 'text-emerald-400' : latestFin.operatingMarginPercent >= 20 ? 'text-zinc-200' : 'text-zinc-400'}`}>
                      {latestFin.operatingMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* フッター情報 */}
      <div className="p-2 border-t border-white/[0.06] bg-[#101216] text-[10px] text-zinc-500 flex items-center justify-between font-mono">
        <span>ステータス: リアルタイム同期</span>
        <span className="text-emerald-400">● 正常</span>
      </div>
    </div>
  );
};

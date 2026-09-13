'use client';

import React from 'react';
import { ChevronRight, ArrowUpDown } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '../terminal/CompanyLogo';

interface DesktopTableViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
  selectedCompanyId?: string | null;
  bookmarkedIds: string[];
  onToggleBookmark: (companyId: string) => void;
  onSortByRevenue: () => void;
  onSortByMargin: () => void;
}

export const DesktopTableView: React.FC<DesktopTableViewProps> = ({
  companies,
  onSelectCompany,
  selectedCompanyId,
  onSortByRevenue,
  onSortByMargin
}) => {
  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000)}億`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000)}万`;
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <table className="hidden xl:table table-fixed w-full text-left border-collapse font-sans text-xs select-none">
      {/* 9カラム固定幅ヘッダー */}
      <thead className="bg-[#0F131C] text-[10px] font-mono text-zinc-400 uppercase tracking-wider sticky top-0 z-10 border-b border-white/[0.08]">
        <tr>
          <th className="w-8 py-2.5 px-2 text-center">#</th>
          <th className="w-[23%] py-2.5 px-3">企業名 / 創業者 / モデル</th>
          <th 
            onClick={onSortByRevenue}
            className="w-[12%] py-2.5 px-3 text-right cursor-pointer hover:text-white"
          >
            <div className="flex items-center justify-end gap-1">
              <span>直近月商 (年商)</span>
              <ArrowUpDown size={10} className="text-zinc-500" />
            </div>
          </th>
          <th className="w-[15%] py-2.5 px-3 text-right">実効手残り純利</th>
          <th 
            onClick={onSortByMargin}
            className="w-[8%] py-2.5 px-3 text-right cursor-pointer hover:text-white"
          >
            <div className="flex items-center justify-end gap-1">
              <span>利益率</span>
              <ArrowUpDown size={10} className="text-zinc-500" />
            </div>
          </th>
          <th className="w-[9%] py-2.5 px-3 text-right">初期投下資本</th>
          <th className="w-[7%] py-2.5 px-2 text-center">体制</th>
          <th className="w-[18%] py-2.5 px-3">突いた業界の盲点・バグ</th>
          <th className="w-[8%] py-2.5 px-3 text-center">詳細</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-white/[0.05] bg-[#080B10] font-sans">
        {companies.map((company, index) => {
          const latestFin = company.financials?.[company.financials.length - 1];
          const rev = latestFin?.revenueJpy || 0;
          const margin = latestFin?.operatingMarginPercent || 0;
          const profit = latestFin?.netIncomeJpy || latestFin?.operatingProfitJpy || 0;
          const isSelected = selectedCompanyId === company.id;

          const glitch = company.successStory?.marketGlitch ||
            company.entryStrategy?.whyIncumbentCantWin ||
            company.tagline;

          return (
            <tr
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                isSelected ? 'bg-white/[0.07] border-l-2 border-l-emerald-400' : ''
              }`}
            >
              {/* # */}
              <td className="py-2.5 px-2 text-center font-mono text-[11px] text-zinc-400 font-bold">
                {index + 1}
              </td>

              {/* 企業名 / 創業者 / モデル */}
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanyLogo company={company} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
                        {company.japaneseName}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        company.verifiedStatus === 'AUDITED_PUBLIC'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : company.verifiedStatus === 'VERIFIED_STRIPE'
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                          : 'bg-zinc-850 text-zinc-400 border border-white/[0.06]'
                      }`}>
                        {company.verifiedStatus === 'AUDITED_PUBLIC' ? '有報' : company.verifiedStatus === 'VERIFIED_STRIPE' ? '決済' : '推計'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {company.tagline}
                    </div>
                  </div>
                </div>
              </td>

              {/* 直近月商 (年商) */}
              <td className="py-2.5 px-3 text-right font-mono">
                <div className="text-xs font-black text-zinc-100 tabular-nums">
                  {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">
                  年 {rev > 0 ? formatShortAmount(rev) : '非公開'}
                </div>
              </td>

              {/* 実効手残り純利 */}
              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                <span className={`text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded inline-block max-w-[170px] truncate ${
                  profit < 0
                    ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                    : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                }`}>
                  {profit < 0
                    ? `純利 ▲${formatShortAmount(Math.abs(profit))}/年`
                    : company.scaleTier === 'MEGA_CORP' || company.teamSize > 50
                    ? `純利 ${formatShortAmount(profit)}/年`
                    : `手残り ${formatShortAmount(profit)}`}
                </span>
              </td>

              {/* 営業利益率 */}
              <td className="py-2.5 px-3 text-right font-mono">
                <span className={`text-xs font-bold tabular-nums ${
                  margin >= 50 ? 'text-emerald-400' : margin < 0 ? 'text-rose-400' : 'text-zinc-200'
                }`}>
                  {margin}%
                </span>
              </td>

              {/* 初期投下資本 */}
              <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                {company.initialInvestmentJpy === 0 ? '¥0 (不要)' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
              </td>

              {/* 体制 */}
              <td className="py-2.5 px-2 text-center">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  company.teamSize === 1
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                    : company.scaleTier === 'MEGA_CORP'
                    ? 'bg-blue-950/70 text-blue-400 border-blue-800/60'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                }`}>
                  {company.teamSize === 1 ? '完全1人' : company.scaleTier === 'MEGA_CORP' ? '巨大独占' : `${company.teamSize}名`}
                </span>
              </td>

              {/* 突いた業界の盲点・バグ */}
              <td className="py-2.5 px-3">
                <p className="text-[11px] text-zinc-400 line-clamp-1">
                  {glitch}
                </p>
              </td>

              {/* 解剖ボタン */}
              <td className="py-2.5 px-3 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCompany(company.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white/[0.06] hover:bg-emerald-500/20 text-zinc-200 hover:text-emerald-300 border border-white/[0.1] hover:border-emerald-500/40 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <span>解剖</span>
                  <ChevronRight size={11} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

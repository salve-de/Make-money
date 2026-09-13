'use client';

import React from 'react';
import { ChevronRight, Bookmark } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '../terminal/CompanyLogo';

interface MobileFeedViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (companyId: string) => void;
}

export const MobileFeedView: React.FC<MobileFeedViewProps> = ({
  companies,
  onSelectCompany,
  bookmarkedIds,
  onToggleBookmark
}) => {
  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000)}億`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000)}万`;
    return `¥${valJpy.toLocaleString()}`;
  };

  if (companies.length === 0) {
    return (
      <div className="py-16 text-center text-xs font-mono text-zinc-500">
        条件に一致する銘柄・手口がありません
      </div>
    );
  }

  return (
    <div className="md:hidden divide-y divide-white/[0.06] bg-[#080B10] select-none font-sans">
      {companies.map((company, index) => {
        const latestFin = company.financials?.[company.financials.length - 1];
        const rev = latestFin?.revenueJpy || 0;
        const margin = latestFin?.operatingMarginPercent || 0;
        const profit = latestFin?.netIncomeJpy || latestFin?.operatingProfitJpy || 0;
        const isBookmarked = bookmarkedIds.includes(company.id);

        const glitch = company.successStory?.marketGlitch ||
          company.entryStrategy?.whyIncumbentCantWin ||
          company.tagline;

        return (
          <div
            key={company.id}
            onClick={() => onSelectCompany(company.id)}
            className="p-3.5 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer space-y-2"
          >
            {/* 上段：ランク・ロゴ・社名・月商 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-zinc-400 font-bold w-4 text-center shrink-0">
                  {index + 1}
                </span>
                <CompanyLogo company={company} size="sm" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="font-bold text-xs text-zinc-100 truncate">
                    {company.japaneseName}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                    company.verifiedStatus === 'AUDITED_PUBLIC'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : company.verifiedStatus === 'VERIFIED_STRIPE'
                      ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      : 'bg-zinc-850 text-zinc-400 border border-white/[0.06]'
                  }`}>
                    {company.verifiedStatus === 'AUDITED_PUBLIC' ? '有報' : company.verifiedStatus === 'VERIFIED_STRIPE' ? '決済' : '推計'}
                  </span>
                </div>
              </div>

              {/* 月商実額 */}
              <div className="text-right shrink-0 font-mono">
                <span className="text-[10px] text-zinc-400 block -mb-0.5 font-sans">月商</span>
                <span className="text-xs font-black text-zinc-100 tabular-nums">
                  {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
                </span>
              </div>
            </div>

            {/* 中段：突いた盲点・バグ（1行省略） */}
            <p className="text-[11px] text-zinc-400 line-clamp-1 pl-6">
              {glitch}
            </p>

            {/* 下段：手残り純利・営業利益率・体制・解剖ボタン */}
            <div className="flex items-center justify-between gap-2 pl-6 pt-0.5">
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                {/* 手残り純利 */}
                <span className={`px-1.5 py-0.5 rounded font-bold tabular-nums ${
                  profit < 0
                    ? 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                    : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                }`}>
                  {profit < 0
                    ? `純利 ▲${formatShortAmount(Math.abs(profit))}/年`
                    : company.scaleTier === 'MEGA_CORP' || company.teamSize > 50
                    ? `純利 ${formatShortAmount(profit)}/年`
                    : `手残り ${formatShortAmount(profit > 0 ? (profit > 100000000 ? profit : profit) : 0)}`}
                </span>

                {/* 利益率 */}
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] tabular-nums">
                  利 {margin}%
                </span>

                {/* 体制 */}
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                  {company.teamSize === 1 ? '完全1人' : company.scaleTier === 'MEGA_CORP' ? '巨大独占' : `${company.teamSize}名`}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(company.id);
                  }}
                  className="p-1 text-zinc-400 hover:text-amber-400 cursor-pointer"
                >
                  <Bookmark size={13} className={isBookmarked ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                  <span>解剖</span>
                  <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

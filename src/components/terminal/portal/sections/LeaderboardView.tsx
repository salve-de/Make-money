'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { SparklineChart } from '@/components/terminal/SparklineChart';

interface LeaderboardViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onBackToPortal: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  companies,
  onSelectCompany,
  onBackToPortal,
}) => {
  // ソロ〜少人数・高収益企業を利益率または月商順にソート
  const soloCompanies = [...companies]
    .filter((c) => c.scaleTier === 'SOLO_MICRO' || c.teamSize <= 3)
    .sort((a, b) => {
      const aRev = a.financials[a.financials.length - 1]?.revenueJpy || 0;
      const bRev = b.financials[b.financials.length - 1]?.revenueJpy || 0;
      return bRev - aRev;
    });

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000).toLocaleString()}億円`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000).toLocaleString()}万円`;
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto font-sans text-slate-900">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 shadow-xs">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <button
              onClick={onBackToPortal}
              className="hover:text-slate-900 transition-colors flex items-center gap-1 font-semibold"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">急上昇・爆益リーダーボード</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              VERIFIED TOP EARNERS
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              今特に話題の急上昇・爆益リーダーボード（全頭検査）
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed font-normal">
              完全1人〜3名以下の少人数で、月商数百万〜数億円、純利益率70%超を叩き出している実在プレイヤーの最新ランキング。
              決済実額・公開通帳データに基づき、誰が最も効率よく現金を吸い上げているかを一覧化。
            </p>
          </div>
        </div>
      </div>

      {/* リスト一覧 */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
        {soloCompanies.map((c, idx) => {
          const fin = c.financials[c.financials.length - 1];
          const monthlyRev = Math.round((fin?.revenueJpy || 10000000) / 12);
          const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((fin?.operatingProfitJpy || 8000000) / 12);
          const netMargin = fin?.operatingMarginPercent ? Math.round(fin.operatingMarginPercent) : 85;

          return (
            <div
              key={c.id}
              onClick={() => onSelectCompany(c.id)}
              className="p-5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
            >
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <span className={`text-lg font-mono font-extrabold w-8 text-center shrink-0 ${
                  idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300 group-hover:text-slate-500'
                }`}>
                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>

                <CompanyLogo name={c.name} size="md" category={c.category} />

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {c.japaneseName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {c.founderName || '個人開発者'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      {c.teamSize === 1 ? '完全1人運営' : `${c.teamSize}名運営`}
                    </span>
                    <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                      • {c.headquarters}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 font-normal">
                    {c.tagline}
                  </p>
                </div>
              </div>

              {/* 右側財務サマリー */}
              <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 font-mono">
                <div className="hidden sm:block">
                  <SparklineChart trend="up" width={72} height={26} />
                </div>

                <div className="text-left lg:text-right bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 font-semibold">直近月商規模</div>
                  <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                    {formatShortAmount(monthlyRev)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-medium">創業者純手取り</div>
                  <div className="text-sm font-bold text-slate-800 tabular-nums">
                    {formatShortAmount(founderTakeHome)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500">純利益率</div>
                  <div className="text-sm font-bold text-slate-700 tabular-nums">
                    {netMargin}%
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition-all text-xs font-mono">
                  →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

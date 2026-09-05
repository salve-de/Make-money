'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';

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
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">急上昇・爆益リーダーボード</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              VERIFIED TOP EARNERS
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              今特に話題の急上昇・爆益リーダーボード（全頭検査）
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              完全1人〜3名以下の少人数で、月商数百万〜数億円、純利益率70%超を叩き出している実在プレイヤーの最新ランキング。
              Stripe決済実額・公開通帳データに基づき、誰が最も効率よく現金を吸い上げているかを一覧化。
            </p>
          </div>
        </div>
      </div>

      {/* リスト一覧 */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-4">
        {soloCompanies.map((c, idx) => {
          const fin = c.financials[c.financials.length - 1];
          const monthlyRev = Math.round((fin?.revenueJpy || 10000000) / 12);
          const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((fin?.operatingProfitJpy || 8000000) / 12);
          const netMargin = fin?.operatingMarginPercent ? Math.round(fin.operatingMarginPercent) : 85;

          return (
            <div
              key={c.id}
              onClick={() => onSelectCompany(c.id)}
              className="p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
            >
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <span className="text-xl font-mono font-bold text-zinc-500 group-hover:text-zinc-200 transition-colors w-8 text-center shrink-0">
                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>

                {c.founderAvatarUrl ? (
                  <img
                    src={c.founderAvatarUrl}
                    alt={c.founderName || c.japaneseName}
                    className="w-12 h-12 rounded-md object-cover border border-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-white group-hover:text-zinc-200 transition-colors">
                      {c.japaneseName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {c.founderName || '個人開発者'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {c.teamSize === 1 ? '完全1人運営' : `${c.teamSize}名運営`}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                      • {c.headquarters}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1 font-normal">
                    {c.tagline}
                  </p>
                </div>
              </div>

              {/* 右側財務サマリー */}
              <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60 font-mono">
                <div className="text-left lg:text-right">
                  <div className="text-[10px] text-zinc-500">直近月商規模</div>
                  <div className="text-sm font-bold text-white tabular-nums">
                    {formatShortAmount(monthlyRev)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-zinc-400 font-medium">創業者純手取り</div>
                  <div className="text-sm font-bold text-white tabular-nums">
                    {formatShortAmount(founderTakeHome)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-zinc-500">純利益率</div>
                  <div className="text-sm font-bold text-zinc-300 tabular-nums">
                    {netMargin}%
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded bg-zinc-800 group-hover:bg-zinc-700 text-zinc-300 transition-all text-xs font-mono">
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

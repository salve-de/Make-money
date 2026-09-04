'use client';

import React from 'react';
import { PORTAL_SIGNALS, SignalDetailItem } from '@/data/portalSignals';
import { CompanyRecord } from '@/types/terminal';

interface MarketSignalsViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onSelectSignal: (signalId: string) => void;
  onBackToPortal: () => void;
}

export const MarketSignalsView: React.FC<MarketSignalsViewProps> = ({
  companies,
  onSelectCompany,
  onSelectSignal,
  onBackToPortal,
}) => {
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
            <span className="text-zinc-300 font-medium">市場シグナル・歪み速報</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              MARKET SIGNALS & GLITCHES
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              今週検知された「未開拓の市場シグナル・歪み」一覧
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              先行プレイヤーが独占的に利益を吸い上げている最前線の歪みを検知。
              「まだ誰も手をつけていない参入余地」と「明日から実行できる収益化手順」を収録。
            </p>
          </div>
        </div>
      </div>

      {/* シグナル一覧 */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {PORTAL_SIGNALS.map((sig, idx) => {
            const related = companies.filter((c) => sig.relatedCompanyIds.includes(c.id));

            return (
              <div
                key={sig.id}
                className="p-6 sm:p-7 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {sig.badge}
                      </span>
                      <span className="text-xs font-mono text-zinc-300 font-medium">
                        {sig.demandMetric}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">
                        {sig.competitionMetric}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                      {sig.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                      {sig.catchphrase}
                    </p>
                    <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                      {sig.summary}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectSignal(sig.id)}
                    className="h-9 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
                  >
                    <span>個別解剖ページを見る</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 基礎指標バッジ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-500 block">想定元手:</span>
                    <span className="text-zinc-200 font-bold">{sig.estimatedCapital}</span>
                  </div>
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-500 block">推定月利:</span>
                    <span className="text-emerald-400 font-bold">{sig.estimatedMonthlyProfit}</span>
                  </div>
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-500 block">粗利率:</span>
                    <span className="text-zinc-200 font-bold">{sig.grossMargin}</span>
                  </div>
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-[10px] text-zinc-500 block">初動回収:</span>
                    <span className="text-zinc-200 font-bold">{sig.paybackDays}</span>
                  </div>
                </div>

                {/* 関連企業 */}
                {related.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-zinc-500 font-mono text-[11px]">関連する実在台帳:</span>
                    {related.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onSelectCompany(c.id)}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1 transition-colors"
                      >
                        <span>{c.japaneseName}</span>
                        <span className="text-zinc-500 font-mono text-[10px]">台帳 →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import { PORTAL_SIGNALS, SignalDetailItem } from '@/data/portalSignals';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { SparklineChart } from '@/components/terminal/SparklineChart';

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
    <div className="flex-1 bg-[#0B0E14] overflow-y-auto font-sans text-zinc-100 select-none">
      {/* ヘッダー */}
      <div className="border-b border-white/[0.08] bg-[#0D1117] px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-semibold">市場シグナル・歪み速報</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.1] text-zinc-200 border border-white/[0.15]">
              MARKET SIGNALS & GLITCHES
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              今週検知された「未開拓の市場シグナル・歪み」一覧
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-normal">
              先行プレイヤーが独占的に利益を吸い上げている最前線の歪みを検知。
              「まだ誰も手をつけていない参入余地」と「明日から実行できる収益化手順」を収録。
            </p>
          </div>
        </div>
      </div>

      {/* シグナル一覧 */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {PORTAL_SIGNALS.map((sig) => {
            const related = companies.filter((c) => sig.relatedCompanyIds.includes(c.id));

            return (
              <div
                key={sig.id}
                className="p-6 sm:p-7 rounded bg-[#0F131C] border border-white/[0.08] space-y-5 hover:border-white/[0.15] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="flex items-start gap-4">
                    <CompanyLogo name={sig.title} size="md" category={sig.badge} />
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.1] text-zinc-200 border border-white/[0.15]">
                          {sig.badge}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
                          {sig.demandMetric}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {sig.competitionMetric}
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                        {sig.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">
                        {sig.catchphrase}
                      </p>
                      <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                        {sig.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                    <SparklineChart trend="up" width={80} height={28} />
                    <button
                      onClick={() => onSelectSignal(sig.id)}
                      className="h-9 px-4 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/[0.12] cursor-pointer"
                    >
                      <span>個別解剖ページを見る</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* 基礎指標スペックバー */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-[#090C10] border border-white/[0.08] font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">想定元手:</span>
                    <span className="text-zinc-100 font-bold">{sig.estimatedCapital}</span>
                  </div>
                  <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-semibold">推定月利:</span>
                    <span className="text-emerald-400 font-bold text-sm tabular-nums">{sig.estimatedMonthlyProfit}</span>
                  </div>
                  <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">粗利率:</span>
                    <span className="text-zinc-100 font-bold">{sig.grossMargin}</span>
                  </div>
                  <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">初動回収:</span>
                    <span className="text-zinc-100 font-bold">{sig.paybackDays}</span>
                  </div>
                </div>

                {/* 関連企業 */}
                {related.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-zinc-400 font-mono text-[11px] font-medium">関連する実在台帳:</span>
                    {related.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onSelectCompany(c.id)}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CompanyLogo name={c.name} size="sm" category={c.category} />
                        <span>{c.japaneseName}</span>
                        <span className="text-zinc-400 font-mono text-[10px]">台帳 →</span>
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

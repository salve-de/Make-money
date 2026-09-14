import React from 'react';
import {
  Users,
  AlertTriangle,
  ArrowRight,
  Zap,
  Building,
  Lock,
  Wallet,
  Coins,
  TrendingUp,
  Flame,
  Skull
} from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function VisualPipelineSection({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const rev = entity.pnl?.monthlyRevenue || 0;
  const profit = entity.pnl?.operatingProfit || 0;
  const margin = rev > 0 ? Math.round((profit / rev) * 100) : (entity.pnl?.operatingMargin || 0);
  const cogs = entity.pnl?.cogs || 0;
  const cogsPct = rev > 0 ? Math.round((cogs / rev) * 100) : 0;

  const targetCustomer = entity.essence?.targetCustomer || 'ターゲット顧客・特定産業の現場';
  const painRelief = entity.essence?.painRelief || '現場の停止リスク・面倒な手作業・強烈な保身恐怖';
  const moat = entity.strategy?.moatDescription?.replace(/^【.*?】/, '') || '他社が真似できない現場直販と相見積もり排除の仕組み';

  return (
    <div id="section-pipeline" className={`rounded-xl border p-4.5 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0D111A] border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.05)]'
        : 'bg-[#0D111A] border-white/[0.12] shadow-[0_0_30px_rgba(0,0,0,0.4)]'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {isHazardMode ? (
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '資本出血構造：ユニットエコノミクスの崩壊要因' : 'キャッシュ創出構造：顧客ペインの解決から営業利益の創出まで'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          キャッシュフロー構造
        </span>
      </div>

      {/* 3ブロックの配管フロー（左 ➔ 中央 ➔ 右） */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-stretch relative">

        {/* ---------------------------------------------------- */}
        {/* ブロック1: 対象市場と顧客の構造的ペイン */}
        {/* ---------------------------------------------------- */}
        <div className={`lg:col-span-3 rounded-lg p-3.5 border flex flex-col justify-between transition-all ${
          isHazardMode
            ? 'bg-red-950/20 border-red-500/20'
            : 'bg-[#121826] border-white/[0.08] hover:border-amber-500/40'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                ① 対象市場と顧客ペイン
              </span>
              <AlertTriangle className="w-3 h-3 text-amber-400/70" />
            </div>
            <p className="text-zinc-200 text-xs font-bold mb-1.5 line-clamp-2">
              {targetCustomer}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] bg-black/20 -mx-3.5 -mb-3.5 p-3 rounded-b-lg">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block mb-0.5">
              支払いを決定づける要因（WTP）:
            </span>
            <p className="text-zinc-300 text-[11px] leading-snug line-clamp-3">
              {painRelief}
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 矢印コネクタ 1 */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center py-1 lg:py-0 text-zinc-500">
          <div className="flex items-center lg:flex-col gap-1 text-[9px] font-mono text-zinc-400 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.06]">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span className="whitespace-nowrap font-bold text-amber-300/90">価値提供</span>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 hidden lg:block my-1 animate-pulse" />
        </div>

        {/* ---------------------------------------------------- */}
        {/* ブロック2: 価格決定力と参入障壁 */}
        {/* ---------------------------------------------------- */}
        <div className={`lg:col-span-3 rounded-lg p-3.5 border flex flex-col justify-between transition-all ${
          isHazardMode
            ? 'bg-red-950/30 border-red-500/30'
            : 'bg-[#121826] border-white/[0.08] hover:border-emerald-500/40'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                isHazardMode ? 'text-red-400' : 'text-emerald-400'
              }`}>
                <Building className="w-3 h-3" />
                ② 価格決定力 ＆ 参入障壁
              </span>
              <Lock className="w-3 h-3 text-zinc-400" />
            </div>
            <p className="text-zinc-100 text-xs font-bold mb-1.5 line-clamp-2">
              {isHazardMode ? '破綻に至ったビジネスモデル' : '競争回避を可能にする独自ポジショニング'}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] bg-black/20 -mx-3.5 -mb-3.5 p-3 rounded-b-lg">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block mb-0.5">
              {isHazardMode ? '破綻原因の構造:' : '競合を無力化する独自ケイパビリティ:'}
            </span>
            <p className="text-zinc-300 text-[11px] leading-snug line-clamp-3">
              {moat}
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 矢印コネクタ 2 */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center py-1 lg:py-0 text-zinc-500">
          <div className="flex items-center lg:flex-col gap-1 text-[9px] font-mono text-zinc-400 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.06]">
            <Coins className="w-2.5 h-2.5 text-emerald-400" />
            <span className="whitespace-nowrap font-bold text-emerald-300/90">利益創出</span>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 hidden lg:block my-1 animate-pulse" />
        </div>

        {/* ---------------------------------------------------- */}
        {/* ブロック3: 営業利益とキャッシュ創出能 */}
        {/* ---------------------------------------------------- */}
        <div className={`lg:col-span-3 rounded-lg p-3.5 border flex flex-col justify-between transition-all ${
          isHazardMode
            ? 'bg-red-950/40 border-red-500/40'
            : 'bg-[#121826] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                isHazardMode ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {isHazardMode ? (
                  <Skull className="w-3 h-3 text-red-400" />
                ) : (
                  <Wallet className="w-3 h-3 text-emerald-400" />
                )}
                ③ 営業利益 ＆ キャッシュ創出能
              </span>
              <TrendingUp className={`w-3 h-3 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>

            <div className="space-y-1 mb-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">月商:</span>
                <span className="text-sm font-mono font-extrabold text-white">
                  {formatMoney(rev)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {isHazardMode ? '出血・赤字率:' : '営業利益率:'}
                </span>
                <span className={`text-sm font-mono font-extrabold ${
                  isHazardMode ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {margin > 0 ? `+${margin}%` : `${margin}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-white/[0.06] bg-black/30 -mx-3.5 -mb-3.5 p-2.5 rounded-b-lg flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400">
              {cogsPct > 0 ? `原価率: 約${cogsPct}%` : '高付加価値構造'}
            </span>
            <span className={`text-xs font-mono font-bold ${
              isHazardMode ? 'text-red-400' : 'text-emerald-300'
            }`}>
              {isHazardMode ? 'キャッシュ枯渇・破綻' : `月間営業利益 ${formatMoney(profit)}`}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

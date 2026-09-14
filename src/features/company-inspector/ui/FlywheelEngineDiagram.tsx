import React from 'react';
import {
  RotateCw,
  Zap,
  Lock,
  Coins,
  ShieldCheck,
  Flame,
  AlertTriangle
} from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function cleanNodeTitle(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const res = text
    .replace(/^【.*?】/, '')
    .replace(/^【.*?】/, '')
    .replace(/^#\d+\s*/, '')
    .replace(/^キレイゴト抜きの.*?構造/u, '')
    .replace(/^大企業が.*?死角/u, '')
    .trim();
  return res.length >= 4 ? res : fallback;
}

export function FlywheelEngineDiagram({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const cards = entity.evidenceCards || [];

  const opMargin = entity.pnl?.operatingProfit && entity.pnl?.monthlyRevenue
    ? Math.round((entity.pnl.operatingProfit / entity.pnl.monthlyRevenue) * 100)
    : 0;

  const node1 = isHazardMode
    ? cleanNodeTitle(cards[0]?.title || entity.architecturePattern, '巨額資本調達による急拡大')
    : cleanNodeTitle(cards[0]?.title || entity.architecturePattern, 'コア提供価値の確立と初期顧客獲得');

  const node2 = isHazardMode
    ? cleanNodeTitle(cards[1]?.title || entity.targetPainWallet, '逆ザヤ・値引き施策による顧客維持難')
    : cleanNodeTitle(cards[1]?.title || entity.targetPainWallet, 'スイッチングコストと顧客囲い込み');

  const node3 = isHazardMode
    ? cleanNodeTitle(cards[2]?.title, '固定費膨張とキャッシュバーン加速')
    : cleanNodeTitle(cards[2]?.title, opMargin > 0 ? `営業利益率 ${opMargin}% の超過利潤創出` : '価格決定力による超過利潤創出');

  const node4 = isHazardMode
    ? cleanNodeTitle(cards[3]?.title, '追加調達環境悪化による資金枯渇')
    : cleanNodeTitle(cards[3]?.title || entity.strategy?.moat, '独自アセットへの再投資とモート強化');

  return (
    <div id="section-flywheel" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景の微細なアンビエント光 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[110px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/10' : 'bg-cyan-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          {isHazardMode ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0 animate-[spin_10s_linear_infinite]" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '資本効率の崩壊サイクル (DEATH SPIRAL ANALYSIS)' : '自己強化型成長サイクル：構造的モートのフライホイール (GROWTH FLYWHEEL)'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
          <span className={`w-1.5 h-1.5 rounded-full ${isHazardMode ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
          <span>360° 自己加速ループ</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 絶対に重ならないプロ用マトリクス ＋ オービット（DESKTOP & MOBILE） */}
      {/* ==================================================================== */}
      <div className="relative z-10 my-2">
        {/* PC表示: 4隅カード ＋ 中央オービット・コネクター */}
        <div className="hidden md:grid grid-cols-2 gap-x-20 gap-y-20 relative py-6 items-stretch">

          {/* 中央の回転オービット ＆ 重力場コア（カード間中央に絶対配置） */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10">
            {/* SVG 循環リング */}
            <svg viewBox="0 0 240 240" className="w-60 h-60 select-none">
              <defs>
                <linearGradient id="orbitGradMatrix" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isHazardMode ? '#ef4444' : '#06b6d4'} stopOpacity="0.9" />
                  <stop offset="50%" stopColor={isHazardMode ? '#f97316' : '#10b981'} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={isHazardMode ? '#dc2626' : '#3b82f6'} stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <circle
                cx="120"
                cy="120"
                r="95"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <circle
                cx="120"
                cy="120"
                r="95"
                fill="none"
                stroke="url(#orbitGradMatrix)"
                strokeWidth="2.5"
                strokeDasharray="70 110"
                className="animate-[spin_20s_linear_infinite] origin-center"
              />
            </svg>

            {/* 中央コア */}
            <div className={`absolute w-28 h-28 rounded-full flex flex-col items-center justify-center p-2 text-center border shadow-2xl transition-all ${
              isHazardMode
                ? 'bg-[#140808]/95 border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.3)]'
                : 'bg-[#09101C]/95 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${
                isHazardMode ? 'bg-red-900/60 text-red-400' : 'bg-cyan-950/70 text-cyan-300'
              }`}>
                {isHazardMode ? (
                  <Flame className="w-3 h-3 animate-pulse" />
                ) : (
                  <Zap className="w-3 h-3 animate-pulse" />
                )}
              </div>
              <span className={`text-[9px] font-mono font-black tracking-wider uppercase block ${
                isHazardMode ? 'text-red-200' : 'text-cyan-200'
              }`}>
                {isHazardMode ? '資本効率の破綻' : 'モートの自己強化'}
              </span>
              <span className="text-[7.5px] font-sans text-zinc-400 mt-0.5 leading-tight">
                {isHazardMode ? '規模拡大で赤字倍増' : '規模拡大で参入障壁強化'}
              </span>
            </div>
          </div>

          {/* ① 左上カード: コア価値の確立 */}
          <div className="bg-[#0E1524]/90 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.12] hover:border-cyan-400/50 transition-all shadow-xl flex flex-col justify-between min-h-[96px] z-20">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                ① コア価値の確立
              </span>
              <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">STEP 1</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-snug">
              {node1}
            </p>
          </div>

          {/* ② 右上カード: スイッチングコスト */}
          <div className="bg-[#0E1524]/90 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.12] hover:border-amber-400/50 transition-all shadow-xl flex flex-col justify-between min-h-[96px] z-20">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                ② スイッチングコスト
              </span>
              <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">STEP 2</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-snug">
              {node2}
            </p>
          </div>

          {/* ④ 左下カード: 独自資産への再投資 */}
          <div className="bg-[#0E1524]/90 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.12] hover:border-purple-400/50 transition-all shadow-xl flex flex-col justify-between min-h-[96px] z-20">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                ④ 独自資産への再投資
              </span>
              <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">STEP 4</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-snug">
              {node4}
            </p>
          </div>

          {/* ③ 右下カード: 超過利潤の創出 */}
          <div className="bg-[#0E1524]/90 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.12] hover:border-emerald-400/50 transition-all shadow-xl flex flex-col justify-between min-h-[96px] z-20">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Coins className="w-3 h-3" />
                ③ 超過利潤の創出
              </span>
              <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">STEP 3</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-snug">
              {node3}
            </p>
          </div>
        </div>

        {/* モバイル表示: 縦並びの自己強化ステッパー */}
        <div className="md:hidden space-y-2.5">
          <div className="bg-[#0E1524] p-3 rounded-lg border border-white/[0.08]">
            <span className="text-[9px] font-mono font-bold text-cyan-400 flex items-center gap-1 mb-1">
              <Zap className="w-2.5 h-2.5" /> ① コア価値の確立
            </span>
            <p className="text-zinc-100 text-xs font-bold">{node1}</p>
          </div>
          <div className="bg-[#0E1524] p-3 rounded-lg border border-white/[0.08]">
            <span className="text-[9px] font-mono font-bold text-amber-400 flex items-center gap-1 mb-1">
              <Lock className="w-2.5 h-2.5" /> ② スイッチングコスト
            </span>
            <p className="text-zinc-100 text-xs font-bold">{node2}</p>
          </div>
          <div className="bg-[#0E1524] p-3 rounded-lg border border-white/[0.08]">
            <span className="text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1 mb-1">
              <Coins className="w-2.5 h-2.5" /> ③ 超過利潤の創出
            </span>
            <p className="text-zinc-100 text-xs font-bold">{node3}</p>
          </div>
          <div className="bg-[#0E1524] p-3 rounded-lg border border-white/[0.08]">
            <span className="text-[9px] font-mono font-bold text-purple-400 flex items-center gap-1 mb-1">
              <ShieldCheck className="w-2.5 h-2.5" /> ④ 独自資産への再投資
            </span>
            <p className="text-zinc-100 text-xs font-bold">{node4}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

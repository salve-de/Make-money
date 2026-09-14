import React from 'react';
import {
  RotateCw,
  Zap,
  Lock,
  Coins,
  ShieldCheck,
  Flame,
  Skull
} from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function cleanNodeTitle(text: string): string {
  if (!text) return '';
  return text
    .replace(/^【.*?】/, '')
    .replace(/^#\d+\s*/, '')
    .replace(/^.*?の/u, '')
    .trim();
}

export function FlywheelEngineDiagram({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const cards = entity.evidenceCards || [];

  // 4つのノード用テキスト（全332社で100%動的フォールバック）
  const node1 = cleanNodeTitle(cards[0]?.title || entity.essence?.whatItDoes || '独自の提供価値・初動の突破口');
  const node2 = cleanNodeTitle(cards[1]?.title || entity.essence?.painRelief || '顧客の弱みロック・解約不能の監禁');
  const node3 = cleanNodeTitle(cards[2]?.title || entity.strategy?.moatDescription || '相見積もり拒否・高粗利の現金回収');
  const node4 = cleanNodeTitle(cards[3]?.title || entity.strategy?.blindspot || '真似できないインフラ・再投資による堀');

  return (
    <div id="section-flywheel" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景の微細なアンビエント光 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/10' : 'bg-cyan-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          {isHazardMode ? (
            <Skull className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0 animate-[spin_10s_linear_infinite]" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '死神のデススパイラル (DEATH SPIRAL ENGINE)' : '独占の自走増殖フライホイール (MONOPOLY FLYWHEEL)'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
          <span className={`w-1.5 h-1.5 rounded-full ${isHazardMode ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
          <span>360° 自己加速ループ</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 360度 真円フライホイール（SVG Orbit ＋ 4つのグラスノード） */}
      {/* ==================================================================== */}
      <div className="relative w-full max-w-[620px] mx-auto my-2 aspect-[1/1] sm:aspect-[1.15/1] flex items-center justify-center select-none">

        {/* 1. SVGオービットリング（円周、循環矢印、光彩パルス） */}
        <svg
          viewBox="0 0 500 500"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            {/* ループグラデーション */}
            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isHazardMode ? '#ef4444' : '#06b6d4'} stopOpacity="0.8" />
              <stop offset="50%" stopColor={isHazardMode ? '#f97316' : '#10b981'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isHazardMode ? '#991b1b' : '#3b82f6'} stopOpacity="0.8" />
            </linearGradient>

            {/* 矢印マーカー */}
            <marker
              id="arrowHead"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={isHazardMode ? '#ef4444' : '#06b6d4'} />
            </marker>
          </defs>

          {/* 背景の軌道円（破線） */}
          <circle
            cx="250"
            cy="250"
            r="165"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />

          {/* 光る主軌道リング */}
          <circle
            cx="250"
            cy="250"
            r="165"
            fill="none"
            stroke="url(#orbitGrad)"
            strokeWidth="2.5"
            strokeDasharray="100 160"
            className="animate-[spin_24s_linear_infinite] origin-center"
          />

          {/* 4本の円弧矢印（時計回りの循環力学） */}
          {/* 上 ➔ 右 (北から東) */}
          <path
            d="M 270 86 A 165 165 0 0 1 414 230"
            fill="none"
            stroke={isHazardMode ? '#ef4444' : '#06b6d4'}
            strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrowHead)"
            className="opacity-70"
          />
          {/* 右 ➔ 下 (東から南) */}
          <path
            d="M 414 270 A 165 165 0 0 1 270 414"
            fill="none"
            stroke={isHazardMode ? '#f97316' : '#10b981'}
            strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrowHead)"
            className="opacity-70"
          />
          {/* 下 ➔ 左 (南から西) */}
          <path
            d="M 230 414 A 165 165 0 0 1 86 270"
            fill="none"
            stroke={isHazardMode ? '#dc2626' : '#3b82f6'}
            strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrowHead)"
            className="opacity-70"
          />
          {/* 左 ➔ 上 (西から北) */}
          <path
            d="M 86 230 A 165 165 0 0 1 230 86"
            fill="none"
            stroke={isHazardMode ? '#b91c1c' : '#8b5cf6'}
            strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrowHead)"
            className="opacity-70"
          />
        </svg>

        {/* 2. 中央の巨大重力場コア (CENTRAL GRAVITATIONAL CORE) */}
        <div className={`relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center p-3 text-center border shadow-2xl transition-all ${
          isHazardMode
            ? 'bg-gradient-to-b from-red-950/80 to-[#120606] border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.25)]'
            : 'bg-gradient-to-b from-[#111827]/90 to-[#070B12] border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.2)]'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
            isHazardMode ? 'bg-red-900/50 text-red-400' : 'bg-cyan-950/60 text-cyan-300'
          }`}>
            {isHazardMode ? (
              <Flame className="w-4 h-4 animate-pulse" />
            ) : (
              <Zap className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <span className={`text-[11px] font-mono font-black tracking-wider uppercase block ${
            isHazardMode ? 'text-red-200' : 'text-cyan-200'
          }`}>
            {isHazardMode ? '死の重力場' : '独占の重力場'}
          </span>
          <span className="text-[9px] font-sans text-zinc-400 mt-0.5 leading-tight line-clamp-2">
            {isHazardMode ? '回るほど赤字拡大' : '回るほど競合を無力化'}
          </span>
        </div>

        {/* 3. 円周上の4つのグラスノード（上、右、下、左） */}

        {/* --- ノード1: 真上 (12時) --- */}
        <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 z-30 w-52 sm:w-60">
          <div className="bg-[#121826]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-lg border border-white/[0.12] hover:border-cyan-400/50 transition-all shadow-xl">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                ① 突破口（初期ゲリラ）
              </span>
              <span className="text-[8px] font-mono text-zinc-500">NORTH</span>
            </div>
            <p className="text-zinc-100 text-[11px] font-bold leading-tight line-clamp-2">
              {node1}
            </p>
          </div>
        </div>

        {/* --- ノード2: 真右 (3時) --- */}
        <div className="absolute right-0 sm:-right-2 top-1/2 -translate-y-1/2 z-30 w-48 sm:w-56">
          <div className="bg-[#121826]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-lg border border-white/[0.12] hover:border-amber-400/50 transition-all shadow-xl">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                ② 顧客の監禁（弱み）
              </span>
              <span className="text-[8px] font-mono text-zinc-500">EAST</span>
            </div>
            <p className="text-zinc-100 text-[11px] font-bold leading-tight line-clamp-2">
              {node2}
            </p>
          </div>
        </div>

        {/* --- ノード3: 真下 (6時) --- */}
        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-30 w-52 sm:w-60">
          <div className="bg-[#121826]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-lg border border-white/[0.12] hover:border-emerald-400/50 transition-all shadow-xl">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Coins className="w-2.5 h-2.5" />
                ③ 現金関所（高粗利回収）
              </span>
              <span className="text-[8px] font-mono text-zinc-500">SOUTH</span>
            </div>
            <p className="text-zinc-100 text-[11px] font-bold leading-tight line-clamp-2">
              {node3}
            </p>
          </div>
        </div>

        {/* --- ノード4: 真左 (9時) --- */}
        <div className="absolute left-0 sm:-left-2 top-1/2 -translate-y-1/2 z-30 w-48 sm:w-56">
          <div className="bg-[#121826]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-lg border border-white/[0.12] hover:border-purple-400/50 transition-all shadow-xl">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                ④ 不可逆な堀（再投資）
              </span>
              <span className="text-[8px] font-mono text-zinc-500">WEST</span>
            </div>
            <p className="text-zinc-100 text-[11px] font-bold leading-tight line-clamp-2">
              {node4}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

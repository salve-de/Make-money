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
  return text.replace(/^【.*?】/, '').replace(/^#\d+\s*/, '').trim();
}

export function FlywheelEngineDiagram({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  // 4つのノードコンテンツを動的生成（全332社で100%成立）
  const cards = entity.evidenceCards || [];

  const node1Title = cleanNodeTitle(cards[0]?.title || entity.essence?.whatItDoes || '独自の提供価値・初期ゲリラ戦術');
  const node2Title = cleanNodeTitle(cards[1]?.title || entity.essence?.painRelief || '顧客の弱みロック・解約不能の監禁');
  const node3Title = cleanNodeTitle(cards[2]?.title || entity.strategy?.moatDescription || '相見積もり拒否・高粗利の現金回収');
  const node4Title = cleanNodeTitle(cards[3]?.title || entity.strategy?.blindspot || '真似できないインフラ・再投資による堀');

  return (
    <div id="section-flywheel" className={`rounded-xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0E121B] border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.06)]'
        : 'bg-[#0E121B] border-white/[0.12] shadow-[0_0_30px_rgba(0,0,0,0.5)]'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {isHazardMode ? (
            <Skull className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0 animate-[spin_12s_linear_infinite]" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '破綻の悪循環：死神のデススパイラル (DEATH SPIRAL)' : '自走増殖エンジン：独占のフライホイール (MONOPOLY FLYWHEEL)'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          なぜ勝手に加速するのか（円環図）
        </span>
      </div>

      {/* フライホイール循環図 (4ノード ＋ 中央コア) */}
      <div className="relative py-2 px-1">
        {/* 中央コア */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className={`w-full max-w-xs text-center p-3 rounded-xl border relative z-10 shadow-lg ${
            isHazardMode
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-[#121827] border-cyan-500/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {isHazardMode ? (
                <Flame className="w-4 h-4 text-red-400 animate-pulse" />
              ) : (
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              )}
              <span className="text-[11px] font-mono font-black uppercase tracking-wider">
                {isHazardMode ? '止まらない即死の重力場' : '他社を寄せ付けない独占の重力場'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-300 font-sans line-clamp-1">
              {isHazardMode ? '資金流出 ➔ 赤字拡大 ➔ 破滅' : '回れば回るほど競合との差が無限に拡大する'}
            </p>
          </div>
        </div>

        {/* 4つの循環ノード（グリッド ＋ 矢印コネクタ） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3">

          {/* ノード1: 武器・突破口 */}
          <div className="rounded-lg p-3.5 bg-[#121826] border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ① 初動の突破口（独自の提供価値）
              </span>
              <span className="text-[9px] font-mono text-zinc-500">START</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-relaxed line-clamp-2">
              {node1Title}
            </p>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>次の段階へ加速 ➔</span>
              <span className="text-cyan-300 font-bold">顧客の弱みへ直撃</span>
            </div>
          </div>

          {/* ノード2: 顧客の監禁 */}
          <div className="rounded-lg p-3.5 bg-[#121826] border border-white/[0.08] hover:border-amber-500/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                ② 顧客の監禁（弱みロック）
              </span>
              <span className="text-[9px] font-mono text-zinc-500">LOCK-IN</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-relaxed line-clamp-2">
              {node2Title}
            </p>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>次の段階へ加速 ➔</span>
              <span className="text-amber-300 font-bold">相見積もりを即死</span>
            </div>
          </div>

          {/* ノード3: 現金の回収 */}
          <div className="rounded-lg p-3.5 bg-[#121826] border border-white/[0.08] hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                ③ 現金の関所（高粗利の回収）
              </span>
              <span className="text-[9px] font-mono text-zinc-500">PROFIT</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-relaxed line-clamp-2">
              {node3Title}
            </p>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>次の段階へ加速 ➔</span>
              <span className="text-emerald-300 font-bold">巨額の再投資へ</span>
            </div>
          </div>

          {/* ノード4: 不可逆な堀 */}
          <div className="rounded-lg p-3.5 bg-[#121826] border border-white/[0.08] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ④ 不可逆な堀（真似できない再投資）
              </span>
              <span className="text-[9px] font-mono text-zinc-500">MOAT</span>
            </div>
            <p className="text-zinc-100 text-xs font-bold leading-relaxed line-clamp-2">
              {node4Title}
            </p>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>最初に戻りさらに加速 ➔</span>
              <span className="text-purple-300 font-bold">①の価値が強化</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

'use client';

import React from 'react';

export const MarketTickerStrip: React.FC = () => {
  return (
    <aside aria-label="リアルタイム市場指標" className="h-6 w-full bg-[#05070A] border-b border-white/[0.05] flex items-center overflow-x-auto scrollbar-none px-3 text-[11px] font-mono text-zinc-500 select-none whitespace-nowrap">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span className="text-[10px] tracking-wider uppercase text-zinc-400 font-medium">MARKET LIVE</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">AVG SAAS MULTIPLE:</span>
          <span className="text-zinc-200 tabular-nums">4.82x ARR</span>
          <span className="text-zinc-400 text-[10px] tabular-nums">(+0.4x)</span>
        </div>

        <span className="text-zinc-800">/</span>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">AI INFERENCE COST:</span>
          <span className="text-zinc-200 tabular-nums">-38.5% YoY</span>
          <span className="text-zinc-500 text-[10px]">[MARGIN BOOSTER]</span>
        </div>

        <span className="text-zinc-800">/</span>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">TOP SOLOPRENEUR MARGIN:</span>
          <span className="text-emerald-400/90 tabular-nums">98.6%</span>
          <span className="text-zinc-500 text-[10px]">EASLO (NOTION OS)</span>
        </div>

        <span className="text-zinc-800">/</span>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">MONOPOLY OP MARGIN:</span>
          <span className="text-zinc-300">KEYENCE</span>
          <span className="text-emerald-400/90 tabular-nums">54.0%</span>
        </div>
      </div>
    </aside>
  );
};

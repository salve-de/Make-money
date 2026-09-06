'use client';

import React from 'react';
import { Activity, TrendingUp, DollarSign, ShieldAlert, Cpu } from 'lucide-react';

export const MarketTickerStrip: React.FC = () => {
  return (
    <aside aria-label="リアルタイム市場指標" className="h-7 w-full bg-[#070A0F] border-b border-white/[0.08] flex items-center overflow-x-auto scrollbar-none px-3 text-[11px] font-mono text-slate-400 select-none whitespace-nowrap">
      <div className="flex items-center gap-6 animate-pulse-subtle">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>MARKET TICKER: LIVE</span>
        </div>

        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-500">AVG MICRO-SAAS MULTIPLE:</span>
          <span className="text-slate-200 font-semibold tabular-nums">4.82x ARR</span>
          <span className="text-emerald-400 text-[10px] tabular-nums">(+0.4x WoW)</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-indigo-400" />
          <span className="text-slate-500">AI INFERENCE COST TREND:</span>
          <span className="text-slate-200 font-semibold tabular-nums">-38.5% YoY</span>
          <span className="text-emerald-400 text-[10px]">(PROFIT BOOSTER)</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-amber-400" />
          <span className="text-slate-500">SOLOPRENEUR TOP MARGIN:</span>
          <span className="text-emerald-400 font-semibold tabular-nums">98.6%</span>
          <span className="text-slate-400 text-[10px]">[EASLO / NOTION OS]</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span className="text-slate-500">MONOPOLY RADAR:</span>
          <span className="text-slate-200 font-semibold">KEYENCE OP MARGIN</span>
          <span className="text-emerald-400 font-semibold tabular-nums">54.0%</span>
        </div>
      </div>
    </aside>
  );
};

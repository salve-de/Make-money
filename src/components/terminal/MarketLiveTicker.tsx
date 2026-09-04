'use client';

import React from 'react';

interface TickerItem {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

const TICKER_ITEMS: TickerItem[] = [
  { label: '検証済み最高月商 (1人)', value: '¥4,500万円', change: '+12%', isPositive: true },
  { label: 'ソロプレナー平均純手取り率', value: '84.2%', change: '+3.1%', isPositive: true },
  { label: '今週の未開拓シグナル', value: '3件検知', change: 'NEW', isPositive: true },
  { label: '直近事業売買成約マルチプル', value: '6.8x (年利換算14.7%)' },
  { label: '最短初収益化記録', value: '3時間 (outbid.lol)', change: 'RECORD', isPositive: true },
  { label: '収録ビジネス解剖数', value: '22社 (Stripe実額検証済)' },
];

export const MarketLiveTicker: React.FC = () => {
  return (
    <div className="h-7 bg-[#08090C] border-b border-white/[0.06] flex items-center px-4 overflow-x-auto no-scrollbar font-mono text-[11px] select-none shrink-0">
      <div className="flex items-center gap-2 text-zinc-500 shrink-0 pr-3 border-r border-white/[0.08]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-[10px] tracking-wider text-zinc-400 uppercase">MARKET METRICS</span>
      </div>

      <div className="flex items-center gap-6 px-4 whitespace-nowrap overflow-x-auto no-scrollbar">
        {TICKER_ITEMS.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 shrink-0">
            <span className="text-zinc-500 text-[10px]">{item.label}:</span>
            <span className="font-bold text-zinc-200 tabular-nums">{item.value}</span>
            {item.change && (
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                item.isPositive ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {item.change}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

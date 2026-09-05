'use client';

import React from 'react';

export const MarketTicker: React.FC = () => {
  const tickerItems = [
    { label: 'SaaS平均売上倍率', val: '6.8x', change: '+0.4x', isUp: true },
    { label: 'スモール事業買収成約中央値', val: '3.2x', change: '-0.1x', isUp: false },
    { label: '急上昇セクター: 業務自動化', val: '粗利82%', change: '+14%', isUp: true },
    { label: 'キーエンス営業利益率', val: '51.0%', change: '過去最高圏', isUp: true },
    { label: 'AI学習データ市場', val: 'ARR +42%', change: '国防需要増', isUp: true },
    { label: '地方DX無人化モデル', val: '純利55%', change: '成約急増中', isUp: true }
  ];

  return (
    <div className="h-9 bg-[#121418] border-b border-white/[0.06] flex items-center px-3 overflow-x-auto text-[11px] select-none text-zinc-400 no-scrollbar whitespace-nowrap">
      <div className="flex items-center gap-2 pr-4 font-mono font-medium text-zinc-300 border-r border-white/[0.08] mr-3 shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-white"></span>
        <span>MARKET FEED</span>
      </div>
      <div className="flex items-center gap-6">
        {tickerItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-400">{item.label}:</span>
            <span className="font-mono text-zinc-200 font-semibold">{item.val}</span>
            <span className="font-mono text-[10px] px-1 py-0.5 rounded text-zinc-300 bg-zinc-800 border border-zinc-700">
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

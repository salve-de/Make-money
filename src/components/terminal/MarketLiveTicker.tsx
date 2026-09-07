'use client';

import React from 'react';

interface NewsTickerItem {
  category: string;
  headline: string;
  badge: string;
  badgeType: 'HOT' | 'PROFIT' | 'RECORD' | 'MONOPOLY' | 'SPEED';
  companyId?: string;
}

const NEWS_TICKER_ITEMS: NewsTickerItem[] = [
  {
    category: 'SPEED LAUNCH',
    headline: 'outbid.lol: 3時間構築の順位オークションが公開48時間で利益2,000万円突破',
    badge: '利益 ¥2,000万 / 48h',
    badgeType: 'RECORD',
    companyId: 'outbid-lol'
  },
  {
    category: 'SOLO ARCHITECT',
    headline: 'Photo AI / Nomad List: Pieter Levels氏、完全1人運営で年商45億円・純利益率84%',
    badge: '年商 ¥45億 (純利 84%)',
    badgeType: 'PROFIT',
    companyId: 'solo-photoai'
  },
  {
    category: 'AI WRAPPER',
    headline: 'HeadshotPro: Danny Postma氏、AI証明写真で月商4,500万円・アフィリエイト30%還元',
    badge: '月商 ¥4,500万',
    badgeType: 'HOT',
    companyId: 'solo-headshotpro'
  },
  {
    category: 'MARKET ARBITRAGE',
    headline: 'TikTok Shop物販実演: 台本自動生成×無償サンプルで月商2,200万円・利益率24%',
    badge: '月商 ¥2,200万',
    badgeType: 'HOT',
    companyId: 'tiktok-shop-faceless'
  },
  {
    category: 'LOCAL DX',
    headline: '無人セルフストレージDX: 初期投資回収後に月利3,200万円の純現金パイプライン',
    badge: '月利 ¥3,200万',
    badgeType: 'PROFIT',
    companyId: 'local-self-storage'
  },
  {
    category: 'GLOBAL MONOPOLY',
    headline: 'キーエンス: 代理店ゼロ直販体制により営業利益率54.1%・平均年収2,200万円',
    badge: '営業利益率 54.1%',
    badgeType: 'MONOPOLY',
    companyId: 'keyence-6861'
  },
  {
    category: 'DIGITAL ASSET',
    headline: 'Easlo: Notionテンプレート販売により完全1人で年商1.1億円・利益率95%',
    badge: '年商 ¥1.1億 (純利 95%)',
    badgeType: 'PROFIT',
    companyId: 'solo-easlo'
  },
  {
    category: 'LOCAL BLUE-COLLAR',
    headline: '害虫駆除×LINE自動見積もり: 職人ネットワーク化により月商450万円・利益率55%',
    badge: '利益率 55%',
    badgeType: 'PROFIT',
    companyId: 'local-pest-control'
  },
  {
    category: 'BOILERPLATE',
    headline: 'ShipFast: Marc Lou氏、Next.js開発スターターで初月4,000万円・Stripe公開',
    badge: '初月 ¥4,000万',
    badgeType: 'SPEED',
    companyId: 'solo-shipfast'
  },
  {
    category: 'SILICON DOMINANCE',
    headline: '信越化学工業: 半導体シリコンウェハー世界首位により営業利益率32.4%',
    badge: '営業利益率 32.4%',
    badgeType: 'MONOPOLY',
    companyId: 'shinetsu-4063'
  }
];

interface MarketLiveTickerProps {
  onSelectCompany?: (id: string) => void;
}

export const MarketLiveTicker: React.FC<MarketLiveTickerProps> = ({ onSelectCompany }) => {
  const tickerItems = [...NEWS_TICKER_ITEMS, ...NEWS_TICKER_ITEMS];

  return (
    <div className="h-7 bg-[#05070A] border-b border-white/[0.06] flex items-center overflow-hidden font-mono text-[11px] select-none shrink-0 relative text-zinc-300 z-20">
      {/* 左端固定：速報ラベル */}
      <div className="bg-[#090C10] text-zinc-200 h-full px-3 flex items-center gap-1.5 shrink-0 z-30 border-r border-white/[0.08] font-bold tracking-wider text-[10px] shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-zinc-200 font-mono tracking-wider">MARKET LIVE</span>
      </div>

      {/* スクロールストリップ（ホバーで静止） */}
      <div className="flex-1 ticker-wrapper h-full flex items-center overflow-hidden">
        <div className="ticker-track flex items-center pl-3">
          {tickerItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.companyId && onSelectCompany?.(item.companyId)}
              className={`inline-flex items-center gap-2 px-2.5 py-0.5 mr-3 rounded border border-white/[0.06] bg-white/[0.02] transition-colors shrink-0 ${
                item.companyId && onSelectCompany
                  ? 'cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.15] text-zinc-200'
                  : 'text-zinc-400'
              }`}
            >
              <span className="text-[9px] font-sans font-semibold tracking-wider text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded border border-white/[0.04]">
                {item.category}
              </span>
              <span className="text-zinc-200 hover:text-white font-sans text-xs">
                {item.headline}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60 tabular-nums">
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

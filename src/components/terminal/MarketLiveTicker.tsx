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
    category: '速報・爆速ローンチ',
    headline: '3時間で作ったLeaderboard（outbid.lol）が公開48時間で利益2,000万円突破',
    badge: '48時間で2,000万',
    badgeType: 'RECORD',
    companyId: 'outbid-lol'
  },
  {
    category: '完全1人開発',
    headline: 'Pieter Levels氏、従業員ゼロで年商45億円・純利益率84%を維持中（Photo AI / Nomad List）',
    badge: '年商45億円・利益率84%',
    badgeType: 'PROFIT',
    companyId: 'solo-photoai'
  },
  {
    category: 'AIツール爆益',
    headline: 'Danny Postma氏、AI証明写真（HeadshotPro）で月商4,500万円・アフィリエイト30%還元で急拡大',
    badge: '月商4,500万円',
    badgeType: 'HOT',
    companyId: 'solo-headshotpro'
  },
  {
    category: '市場の歪み',
    headline: 'TikTok Shop×顔出しなし物販チーム、台本自動生成で月商2,200万円（利益率24%）',
    badge: '月商2,200万円',
    badgeType: 'HOT',
    companyId: 'tiktok-shop-faceless'
  },
  {
    category: '地味だが爆益',
    headline: '地方の空き地×無人セルフストレージDX、初期投資回収後に月利3,200万円の純現金パイプライン',
    badge: '月利3,200万円',
    badgeType: 'PROFIT',
    companyId: 'local-self-storage'
  },
  {
    category: '巨大独占の堀',
    headline: 'キーエンス、代理店ゼロの直販営業モデルで営業利益率54.1%・平均年収2,200万円',
    badge: '営業利益率54.1%',
    badgeType: 'MONOPOLY',
    companyId: 'keyence-6861'
  },
  {
    category: 'テンプレート不労所得',
    headline: 'Easlo氏、完全1人でNotionテンプレート販売により年商1.1億円・利益率95%を達成',
    badge: '年商1.1億円・利益率95%',
    badgeType: 'PROFIT',
    companyId: 'solo-easlo'
  },
  {
    category: '手堅い地方DX',
    headline: '害虫駆除×LINE自動見積もり、職人ネットワーク化により1人運営で月商450万円・利益率55%',
    badge: '利益率55%',
    badgeType: 'PROFIT',
    companyId: 'local-pest-control'
  },
  {
    category: '開発ボイラープレート',
    headline: 'Marc Lou氏、Next.js開発スターター（ShipFast）で初月4,000万円・Stripe売上公開始動',
    badge: '初月4,000万円',
    badgeType: 'SPEED',
    companyId: 'solo-boilerplate'
  },
  {
    category: '素材世界シェア首位',
    headline: '信越化学工業、半導体シリコンウェハー世界首位独占により営業利益率32.4%を記録',
    badge: '営業利益率32.4%',
    badgeType: 'MONOPOLY',
    companyId: 'shinetsu-4063'
  }
];

interface MarketLiveTickerProps {
  onSelectCompany?: (id: string) => void;
}

export const MarketLiveTicker: React.FC<MarketLiveTickerProps> = ({ onSelectCompany }) => {
  // 無限ループ用に配列を2重化
  const tickerItems = [...NEWS_TICKER_ITEMS, ...NEWS_TICKER_ITEMS];

  const getBadgeStyle = (type: NewsTickerItem['badgeType']) => {
    switch (type) {
      case 'RECORD':
        return 'bg-zinc-800 text-white border-white/15';
      case 'PROFIT':
        return 'bg-zinc-800 text-emerald-300 border-emerald-500/20';
      case 'HOT':
        return 'bg-zinc-800 text-zinc-200 border-white/10';
      case 'MONOPOLY':
        return 'bg-zinc-800 text-zinc-100 border-white/15';
      case 'SPEED':
        return 'bg-zinc-800 text-zinc-200 border-white/10';
    }
  };

  return (
    <div className="h-7 bg-[#08090C] border-b border-white/[0.06] flex items-center overflow-hidden font-mono text-[11px] select-none shrink-0 relative">
      {/* 左端固定：速報ラベル（パルスランプ付き） */}
      <div className="flex items-center gap-2 text-zinc-400 shrink-0 px-3.5 bg-[#08090C] z-10 border-r border-white/[0.08] h-full shadow-[2px_0_8px_rgba(0,0,0,0.6)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="font-bold text-[10px] tracking-wider text-zinc-300 font-mono uppercase">
          MARKET INTELLIGENCE FEED
        </span>
      </div>

      {/* 横に滑らかに流れる無限ループコンテナ（ホバーで一時停止） */}
      <div className="flex-1 overflow-hidden relative">
        <div className="animate-ticker flex items-center">
          {tickerItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (item.companyId && onSelectCompany) {
                  onSelectCompany(item.companyId);
                }
              }}
              className={`flex items-center gap-2.5 px-5 py-1 shrink-0 transition-colors ${
                item.companyId && onSelectCompany
                  ? 'cursor-pointer hover:bg-white/[0.06]'
                  : ''
              }`}
              title={item.companyId ? 'クリックして詳細分析データを開く' : undefined}
            >
              {/* カテゴリタグ */}
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-sans">
                {item.category}
              </span>

              {/* ニュース見出し */}
              <span className="text-zinc-200 font-sans text-xs">
                {item.headline}
              </span>

              {/* 実績バッジ */}
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${getBadgeStyle(item.badgeType)}`}>
                {item.badge}
              </span>

              {/* 区切り点 */}
              <span className="text-zinc-600 pl-3 select-none">/</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

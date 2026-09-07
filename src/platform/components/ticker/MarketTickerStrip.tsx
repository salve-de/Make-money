'use client';

import React, { useRef, useEffect } from 'react';

export interface MarketTickerItem {
  category: string;
  headline: string;
  badge: string;
  badgeType?: 'PROFIT' | 'RECORD' | 'HOT' | 'MONOPOLY' | 'SPEED' | 'METRIC';
  entityId?: string;
}

const TICKER_ITEMS: MarketTickerItem[] = [
  {
    category: '完全1人開発',
    headline: 'Photo AI: Pieter Levels氏、従業員ゼロで年商45億円・純利益率84%を維持',
    badge: '年商 ¥45億 (純利 84%)',
    badgeType: 'PROFIT',
    entityId: 'ent_photoai',
  },
  {
    category: 'AIツール爆益',
    headline: 'HeadshotPro: Danny Postma氏、AI証明写真で月商4,500万円・アフィリ30%還元',
    badge: '月商 ¥4,500万',
    badgeType: 'HOT',
    entityId: 'ent_headshotpro',
  },
  {
    category: '市場マクロ指標',
    headline: '検証済み最高月商 (完全1人運営): ¥4,500万円',
    badge: 'RECORD +12%',
    badgeType: 'RECORD',
  },
  {
    category: '巨大独占の堀',
    headline: 'キーエンス: 代理店ゼロ直販体制により営業利益率54.0%・平均年収2,200万円',
    badge: '営業利益率 54.0%',
    badgeType: 'MONOPOLY',
    entityId: 'ent_keyence',
  },
  {
    category: 'テンプレート不労所得',
    headline: 'Easlo: Notionテンプレート販売により完全1人で年商1.1億円・純利益率95%',
    badge: '純利益率 95%',
    badgeType: 'PROFIT',
    entityId: 'ent_easlo',
  },
  {
    category: '市場マクロ指標',
    headline: 'ソロプレナー平均純手取り率: 84.2%',
    badge: '+3.1% YoY',
    badgeType: 'METRIC',
  },
  {
    category: '決済インフラ独占',
    headline: 'Stripe: コマース決済の関所を支配・年間流通総額150兆円・営業利益率42%',
    badge: '流通額 ¥150兆',
    badgeType: 'MONOPOLY',
    entityId: 'ent_stripe',
  },
  {
    category: '日刊ニュース要約',
    headline: 'TLDR: 完全1人発・エンジニア日刊ニュースレターで年商10億円・純利85%',
    badge: '年商 ¥10億 (純利 85%)',
    badgeType: 'PROFIT',
    entityId: 'ent_tldr',
  },
  {
    category: '市場マクロ指標',
    headline: 'AVG MICRO-SAAS MULTIPLE: 4.82x ARR',
    badge: '+0.4x WoW',
    badgeType: 'METRIC',
  },
  {
    category: 'B2B営業自動化',
    headline: 'Clay: 75+データ連携の自動アウトバウンド代行で月商1,800万円・利益率72%',
    badge: '月商 ¥1,800万 (純利 72%)',
    badgeType: 'SPEED',
    entityId: 'ent_clay_aaa',
  },
  {
    category: '手堅い地域DX',
    headline: '出張洗車DX: 職人ネットワーク化×LINE自動見積もりで月利350万円・利益率58%',
    badge: '月利 ¥350万 (利益率 58%)',
    badgeType: 'PROFIT',
    entityId: 'ent_local_wash',
  },
  {
    category: '爆速ローンチ記録',
    headline: 'outbid.lol: 3時間構築の順位オークションが公開48時間で利益2,000万円突破',
    badge: '利益 ¥2,000万 / 48h',
    badgeType: 'RECORD',
  },
  {
    category: '市場マクロ指標',
    headline: 'AI INFERENCE COST: 推論コスト年間 -38.5% 推移',
    badge: '粗利拡大ブースター',
    badgeType: 'METRIC',
  },
];

interface MarketTickerStripProps {
  onSelectEntity?: (entityId: string) => void;
}

export const MarketTickerStrip: React.FC<MarketTickerStripProps> = ({ onSelectEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const offsetRef = useRef(0);

  // 無限ループ用に配列を2重化
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp: number | null = null;
    const PIXELS_PER_SECOND = 55; // 調律速度: もっさり感を解消しつつ自然に読める秒速55px

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const elapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (!isPausedRef.current && trackRef.current) {
        offsetRef.current += PIXELS_PER_SECOND * elapsed;
        const halfWidth = trackRef.current.scrollWidth / 2;
        if (halfWidth > 0 && offsetRef.current >= halfWidth) {
          offsetRef.current -= halfWidth;
        }
        trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const getBadgeStyle = (type?: MarketTickerItem['badgeType']) => {
    switch (type) {
      case 'RECORD':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
      case 'PROFIT':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
      case 'HOT':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
      case 'MONOPOLY':
        return 'text-indigo-300 bg-indigo-950/60 border-indigo-800/60';
      case 'SPEED':
        return 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60';
      case 'METRIC':
      default:
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    }
  };

  return (
    <aside
      aria-label="リアルタイム市場指標ティッカー"
      className="h-7 w-full bg-[#05070A] border-b border-white/[0.06] flex items-center overflow-hidden font-mono text-[11px] select-none shrink-0 relative text-zinc-300 z-20"
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
    >
      {/* 左端固定バッジ: MARKET LIVE */}
      <div className="bg-[#090C10] text-zinc-200 h-full px-3 flex items-center gap-1.5 shrink-0 z-30 border-r border-white/[0.08] font-bold tracking-wider text-[10px] shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-zinc-200 font-mono tracking-wider">MARKET LIVE</span>
      </div>

      {/* 横に滑らかに流れるコンテナ（ホバーでピクセル単位でその場完全静止） */}
      <div
        ref={containerRef}
        className="flex-1 h-full flex items-center overflow-hidden relative"
      >
        <div
          ref={trackRef}
          className="flex items-center pl-3 will-change-transform"
          style={{ transform: 'translate3d(0, 0, 0)' }}
        >
          {tickerItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.entityId && onSelectEntity?.(item.entityId)}
              className={`inline-flex items-center gap-2 px-2.5 py-0.5 mr-3 rounded border border-white/[0.06] bg-white/[0.02] shrink-0 ${
                item.entityId && onSelectEntity
                  ? 'cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.15] text-zinc-200'
                  : 'text-zinc-400'
              }`}
              title={item.entityId ? 'クリックして詳細分析データを開く' : undefined}
            >
              {/* カテゴリタグ */}
              <span className="text-[9px] font-sans font-semibold tracking-wider text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded border border-white/[0.04]">
                {item.category}
              </span>

              {/* 見出し */}
              <span className="text-zinc-200 hover:text-white font-sans text-xs">
                {item.headline}
              </span>

              {/* 実績バッジ */}
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border tabular-nums ${getBadgeStyle(
                  item.badgeType
                )}`}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

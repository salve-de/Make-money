'use client';

import React, { useRef, useEffect } from 'react';
import { financialSnapshot, type SnapshotEntity } from '../../utils/financialSnapshot';

export interface MarketTickerItem {
  category: string;
  headline: string;
  badge: string;
  badgeType?: 'PROFIT' | 'RECORD' | 'HOT' | 'MONOPOLY' | 'SPEED' | 'METRIC';
  entityId?: string;
}

interface MarketTickerStripProps {
  entities: SnapshotEntity[];
  sourceLabel: string;
  onSelectEntity?: (entityId: string) => void;
}

export const MarketTickerStrip: React.FC<MarketTickerStripProps> = ({ onSelectEntity, entities, sourceLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const offsetRef = useRef(0);

  // 無限ループ用に配列を2重化
  const items: MarketTickerItem[] = entities.slice(0, 12).map((entity) => {
    const snapshot = financialSnapshot(entity);
    return { category: '台帳', headline: `${entity.name}: 月商 ${snapshot.revenue} / 営業利益率 ${snapshot.margin}`, badge: snapshot.status, entityId: entity.id };
  });
  const tickerItems = [...items, ...items];

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
      aria-label="台帳の財務サマリー"
      className="h-7 w-full bg-[#05070A] border-b border-white/[0.06] flex items-center overflow-hidden font-mono text-[11px] select-none shrink-0 relative text-zinc-300 z-20"
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
    >
      {/* 左端固定バッジ: KIN-KOROKU ＋ MARKET LIVE */}
      <div className="bg-[#07080A] text-zinc-200 h-full px-3 flex items-center gap-2.5 shrink-0 z-30 border-r border-white/[0.08] font-bold tracking-wider text-[10px] shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
        <span className="text-white font-mono font-bold tracking-widest text-[11px]">
          KIN-KOROKU
        </span>
        <span className="w-px h-3 bg-white/[0.15]" />
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-mono text-[9px] tracking-wider text-zinc-400">{sourceLabel}</span>
        </div>
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

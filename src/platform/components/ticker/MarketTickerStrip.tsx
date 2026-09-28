'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
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
  selectedEntityId?: string | null;
}

export const MarketTickerStrip: React.FC<MarketTickerStripProps> = ({ onSelectEntity, entities, sourceLabel, selectedEntityId }) => {
  // 選択中の事例を先頭に配置
  const selected = selectedEntityId ? entities.find((e) => e.id === selectedEntityId) : null;
  const remaining = selected ? entities.filter((e) => e.id !== selectedEntityId) : entities;
  const displayEntities = selected ? [selected, ...remaining.slice(0, 11)] : entities.slice(0, 12);

  const items: MarketTickerItem[] = displayEntities.map((entity) => {
    const snapshot = financialSnapshot(entity);
    return { category: '台帳', headline: `${entity.name}: 売上（月額換算） ${snapshot.revenue} / 営業利益率 ${snapshot.margin}`, badge: snapshot.status, entityId: entity.id };
  });

  return (
    <details className="group w-full shrink-0 border-b border-white/[0.12] bg-surface font-sans text-sm text-zinc-300">
      <summary
        aria-label="登録された財務参考値を表示"
        className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-left marker:hidden hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
      >
        <span className="font-medium text-zinc-100">財務参考値</span>
        <span className="text-xs text-zinc-400">{sourceLabel} · {items.length}件</span>
        <span className="ml-auto text-xs text-zinc-400 group-open:hidden">開く</span>
        <span className="ml-auto hidden text-xs text-zinc-400 group-open:inline">閉じる</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>

      <aside aria-label="事例の財務参考値">
        <div
          className="min-w-0 overflow-x-auto overscroll-x-contain border-t border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          tabIndex={0}
          aria-label="登録された財務参考値。左右にスクロールできます。"
        >
          <div className="flex min-w-max items-center gap-2 px-3 py-2">
          {items.map((item) => {
            const statusTone = item.badge.includes('一次資料')
              ? 'border-positive/25 bg-positive/10 text-positive'
              : item.badge.includes('照合待ち') || item.badge.includes('未確認') || item.badge.includes('UNAVAILABLE') || item.badge.includes('ESTIMATED')
                ? 'border-warning/25 bg-warning/10 text-warning'
                : item.badge.includes('報道・取材')
                  ? 'border-sky-300/25 bg-sky-300/10 text-sky-100'
                  : item.badge.includes('事後資料')
                    ? 'border-danger/25 bg-danger/10 text-danger'
                    : 'border-white/[0.12] bg-white/[0.04] text-zinc-300';

            return (
              <button
                key={item.entityId ?? item.headline}
                type="button"
                disabled={!item.entityId || !onSelectEntity}
                onClick={() => item.entityId && onSelectEntity?.(item.entityId)}
                aria-label={`${item.headline}。${item.badge}${item.entityId && onSelectEntity ? '。詳細を開く' : ''}`}
                className={`inline-flex min-h-8 shrink-0 items-center gap-2 rounded border border-white/[0.1] bg-white/[0.025] px-2.5 text-left font-sans text-xs text-zinc-200 disabled:cursor-default disabled:text-zinc-300 ${item.entityId && onSelectEntity ? 'hover:border-white/[0.2] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent' : ''}`}
              >
                <span className="rounded border border-white/[0.12] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                  {item.category}
                </span>
                <span>{item.headline}</span>
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums ${statusTone}`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </aside>
    </details>
  );
};

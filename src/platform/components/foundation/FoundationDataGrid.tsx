'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FoundationEntitySummary } from '@/lib/foundation/business-reader';

const PAGE_SIZE = 100;

interface FoundationDataGridProps {
  rows: FoundationEntitySummary[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  onLoadMore?: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

function formatObservedAt(value: string | null): string {
  if (!value) return '未確認';
  return value.slice(0, 10);
}

export const FoundationDataGrid: React.FC<FoundationDataGridProps> = ({
  rows,
  selectedEntityId,
  onSelectEntity,
  onLoadMore,
  hasMore,
  isLoading,
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);

  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || isLoading) return;
        if (visibleCount < rows.length) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, rows.length));
        } else if (hasMore && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, rows.length, visibleCount]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#07080B] select-none">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/[0.05] bg-[#090A0D] text-[10px] font-mono text-zinc-500">
        <span className="text-emerald-400/80">FOUNDATION LAKE / READ-ONLY</span>
        <span>IDENTITY SUMMARY ・ 数値は記録がある場合のみ詳細表示</span>
      </div>

      <div className="md:hidden divide-y divide-white/[0.05]">
        {visibleRows.map((entity) => {
          const isSelected = selectedEntityId === entity.id;
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelectEntity(entity.id)}
              className={`w-full text-left p-3 transition-colors ${isSelected ? 'bg-white/[0.08] border-l-2 border-emerald-500' : 'hover:bg-white/[0.03] border-l-2 border-transparent'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-sans text-sm font-semibold text-white truncate">{entity.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-500">#{entity.id}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/20">{entity.entityType}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.08]">{entity.status}</span>
                <span className="text-zinc-500">evidence {entity.evidenceIds.length}</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400 truncate">
                {entity.domain || entity.canonicalIdentifier || '識別子未確認'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block w-full">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="h-9 border-b border-white/[0.08] bg-[#090A0D] text-[11px] text-zinc-500">
              <th className="w-[5%] px-3 py-2 font-medium">#</th>
              <th className="w-[30%] px-3 py-2 font-medium">ENTITY</th>
              <th className="w-[20%] px-3 py-2 font-medium">TYPE / STATUS</th>
              <th className="w-[25%] px-3 py-2 font-medium">DOMAIN / IDENTIFIER</th>
              <th className="w-[10%] px-3 py-2 font-medium text-right">EVIDENCE</th>
              <th className="w-[10%] px-3 py-2 font-medium text-right">OBSERVED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {visibleRows.map((entity, index) => {
              const isSelected = selectedEntityId === entity.id;
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-white/[0.08] border-l-2 border-emerald-500' : 'hover:bg-white/[0.03] border-l-2 border-transparent'}`}
                >
                  <td className="px-3 py-2.5 text-zinc-600 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="min-w-0">
                      <div className="font-sans font-semibold text-white truncate">{entity.name}</div>
                      <div className="mt-0.5 text-[10px] text-zinc-600 truncate">{entity.id}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="text-cyan-300 truncate">{entity.entityType}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500 truncate">{entity.status}</div>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-zinc-400">
                    <div className="truncate">{entity.domain || 'ドメイン未確認'}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-600 truncate">{entity.canonicalIdentifier || '識別子未確認'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">{entity.evidenceIds.length}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-500 tabular-nums">{formatObservedAt(entity.observedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !isLoading && (
        <div className="p-8 text-center text-xs text-zinc-600 font-mono">該当するFoundation entityが見つかりません</div>
      )}
      <div ref={observerTargetRef} className="py-4 text-center text-[10px] text-zinc-500 font-mono">
        {isLoading ? 'Foundation R2から読み込み中...' : hasMore ? `追加読み込み待ち... (${rows.length}件)` : `全${rows.length}件を表示可能`}
      </div>
    </div>
  );
};

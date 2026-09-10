'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  FoundationValueSummary,
} from '@/lib/foundation/business-reader';
import type { FoundationValueTier } from '@/lib/foundation/value-projection';

const PAGE_SIZE = 100;

interface FoundationDataGridProps {
  rows: FoundationValueSummary[];
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

function tierLabel(tier: FoundationValueTier): string {
  if (tier === 'HIGH_SIGNAL') return 'HIGH SIGNAL';
  if (tier === 'USEFUL') return 'USEFUL';
  return 'CANDIDATE';
}

function tierClass(tier: FoundationValueTier): string {
  if (tier === 'HIGH_SIGNAL') return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300';
  if (tier === 'USEFUL') return 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300';
  return 'border-white/[0.10] bg-white/[0.04] text-zinc-500';
}

function SignalLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="shrink-0 text-[9px] uppercase tracking-wider text-zinc-600">{label}</span>
      <span className={`min-w-0 truncate ${value ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {value || '記録なし'}
      </span>
    </div>
  );
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
        <span>事実記録から作った表示信号 ・ 推定/不明は混ぜない</span>
      </div>

      <div className="md:hidden divide-y divide-white/[0.05]">
        {visibleRows.map((entity) => {
          const isSelected = selectedEntityId === entity.id;
          const profile = entity.valueProfile;
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelectEntity(entity.id)}
              className={`w-full text-left p-3 transition-colors ${isSelected ? 'bg-white/[0.08] border-l-2 border-emerald-500' : 'hover:bg-white/[0.03] border-l-2 border-transparent'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-sans text-sm font-semibold text-white">{entity.name}</span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] ${tierClass(profile.tier)}`}>{tierLabel(profile.tier)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-mono">
                {profile.labels.slice(0, 4).map((label) => (
                  <span key={label} className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-zinc-400">{label}</span>
                ))}
                <span className="text-zinc-600">coverage {profile.score}/10</span>
              </div>
              <div className="mt-2 space-y-1 text-[11px]">
                <SignalLine label="事業" value={profile.businessSignal || profile.painSignal} />
                <SignalLine label="金額" value={profile.moneySignal} />
                <SignalLine label="初動" value={profile.tractionSignal} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-600">
                <span className="min-w-0 truncate">{entity.domain || entity.canonicalIdentifier || '識別子未確認'} ・ {entity.entityType} ・ {entity.status}</span>
                <span>evidence {profile.counts.evidence} ・ {formatObservedAt(entity.observedAt)}</span>
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
              <th className="w-[37%] px-3 py-2 font-medium">CASE / BUSINESS SIGNAL</th>
              <th className="w-[38%] px-3 py-2 font-medium">VALUE SIGNALS</th>
              <th className="w-[20%] px-3 py-2 font-medium">QUALITY / STATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {visibleRows.map((entity, index) => {
              const isSelected = selectedEntityId === entity.id;
              const profile = entity.valueProfile;
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-white/[0.08] border-l-2 border-emerald-500' : 'hover:bg-white/[0.03] border-l-2 border-transparent'}`}
                >
                  <td className="px-3 py-3 align-top text-zinc-600 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-0">
                      <div className="font-sans font-semibold text-white truncate">{entity.name}</div>
                      <div className="mt-0.5 truncate text-[10px] text-zinc-600">{entity.id}</div>
                      <div className="mt-1 truncate text-[11px] text-zinc-300">{profile.businessSignal || profile.painSignal || '事業内容の記録なし'}</div>
                      <div className="mt-1 truncate text-[10px] text-zinc-600">{entity.domain || entity.canonicalIdentifier || '識別子未確認'}</div>
                      <div className="mt-1 flex gap-1 overflow-hidden">
                        {profile.labels.slice(0, 4).map((label) => (
                          <span key={label} className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-zinc-500">{label}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-[10px]">
                    <SignalLine label="金額" value={profile.moneySignal} />
                    <div className="mt-1"><SignalLine label="初動" value={profile.tractionSignal} /></div>
                    <div className="mt-1"><SignalLine label="仕組み" value={profile.mechanismSignal} /></div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] ${tierClass(profile.tier)}`}>{tierLabel(profile.tier)}</span>
                    <div className="mt-1 text-[10px] text-zinc-400">signal coverage {profile.score}/10</div>
                    <div className="mt-1 text-[10px] text-zinc-600">evidence {profile.counts.evidence} ・ {formatObservedAt(entity.observedAt)}</div>
                    <div className="mt-1 truncate text-[10px] text-zinc-600">{entity.entityType} ・ {entity.status}</div>
                  </td>
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
        {isLoading ? 'Foundation R2から価値信号を読み込み中...' : hasMore ? `追加読み込み待ち... (${rows.length}件)` : `全${rows.length}件を表示可能`}
      </div>
    </div>
  );
};

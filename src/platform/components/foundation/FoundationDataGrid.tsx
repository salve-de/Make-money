'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FoundationValueSummary } from '@/lib/foundation/business-reader';
import type { FoundationValueTier } from '@/lib/foundation/value-projection';

import { cleanIntelligenceText } from '@/lib/foundation/text-cleaner';

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
  return value ? value.slice(0, 10) : '未確認';
}

function tierLabel(tier: FoundationValueTier): string {
  if (tier === 'HIGH_SIGNAL') return '高シグナル';
  if (tier === 'USEFUL') return '情報あり';
  return '候補';
}

function tierClass(tier: FoundationValueTier): string {
  if (tier === 'HIGH_SIGNAL') return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300';
  if (tier === 'USEFUL') return 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300';
  return 'border-white/[0.10] bg-white/[0.04] text-zinc-500';
}

function strongestSignal(entity: FoundationValueSummary): { label: string; value: string | null } {
  const profile = entity.valueProfile;
  if (profile.moneySignal) return { label: '収益実額', value: cleanIntelligenceText(profile.moneySignal) };
  if (profile.tractionSignal) return { label: '初動突破', value: cleanIntelligenceText(profile.tractionSignal) };
  if (profile.mechanismSignal) return { label: '仕組み', value: cleanIntelligenceText(profile.mechanismSignal) };
  if (profile.timeSignal) return { label: '時系列', value: cleanIntelligenceText(profile.timeSignal) };
  return { label: 'シグナル', value: null };
}

function entityTypeLabel(type: string): string {
  const norm = type.toLowerCase();
  if (norm.includes('newsletter')) return 'ニュースレター';
  if (norm.includes('product') || norm.includes('saas')) return 'SaaS/ツール';
  if (norm.includes('marketplace')) return '仲介/取引所';
  if (norm.includes('community')) return 'コミュニティ';
  if (norm.includes('media')) return 'メディア';
  return type;
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
    setVisibleCount(PAGE_SIZE);
  }, [rows]);

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
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] bg-[#090A0D] px-3 py-2 font-mono text-[10px] text-zinc-500">
        <span className="text-emerald-400/80">FOUNDATION LEDGER</span>
        <span>左は比較規格を固定 / 右Dossierだけ事例ごとに変化</span>
      </div>

      <div className="divide-y divide-white/[0.05] md:hidden">
        {visibleRows.map((entity) => {
          const isSelected = selectedEntityId === entity.id;
          const profile = entity.valueProfile;
          const strongest = strongestSignal(entity);
          const rawHeadline = profile.businessSignal || profile.painSignal || profile.mechanismSignal || '事業の核心はまだ未確認';
          const headline = cleanIntelligenceText(rawHeadline);
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelectEntity(entity.id)}
              className={`w-full border-l-2 p-3 text-left transition-colors ${isSelected ? 'border-emerald-500 bg-white/[0.08]' : 'border-transparent hover:bg-white/[0.03]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate font-sans text-sm font-semibold text-white">{entity.name}</span>
                  <span className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-emerald-400/80 font-sans">
                    {entityTypeLabel(entity.entityType)}
                  </span>
                </div>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] ${tierClass(profile.tier)}`}>{tierLabel(profile.tier)}</span>
              </div>
              <div className="mt-1 line-clamp-2 font-sans text-[11px] leading-snug text-zinc-300">{headline}</div>
              <div className="mt-2 rounded border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                <div className="font-mono text-[9px] text-zinc-500">{strongest.label}</div>
                <div className={`mt-0.5 truncate font-sans text-[11px] font-medium ${strongest.value ? 'text-emerald-300' : 'text-zinc-700'}`}>{strongest.value || '記録なし'}</div>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-zinc-600">
                <span className="min-w-0 truncate">{entity.domain || entity.canonicalIdentifier || entity.entityType}</span>
                <span>EV {profile.counts.evidence} ・ {formatObservedAt(entity.observedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden w-full md:block">
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="h-9 border-b border-white/[0.08] bg-[#090A0D] text-[10px] text-zinc-500">
              <th className="w-[5%] px-3 py-2 font-medium">#</th>
              <th className="w-[49%] px-3 py-2 font-medium">CASE / 事業の正体と急所</th>
              <th className="w-[28%] px-3 py-2 font-medium">STRONGEST SIGNAL / 収益・初動</th>
              <th className="w-[18%] px-3 py-2 font-medium text-right">QUALITY / 確度</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {visibleRows.map((entity, index) => {
              const isSelected = selectedEntityId === entity.id;
              const profile = entity.valueProfile;
              const strongest = strongestSignal(entity);
              const rawHeadline = profile.businessSignal || profile.painSignal || profile.mechanismSignal || '事業の核心はまだ未確認';
              const headline = cleanIntelligenceText(rawHeadline);
              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`cursor-pointer border-l-2 transition-colors ${isSelected ? 'border-emerald-500 bg-white/[0.08]' : 'border-transparent hover:bg-white/[0.03]'}`}
                >
                  <td className="px-3 py-3 align-top tabular-nums text-zinc-700">{index + 1}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-sans text-xs font-semibold text-white">{entity.name}</span>
                      <span className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-emerald-400/80 font-sans">
                        {entityTypeLabel(entity.entityType)}
                      </span>
                      {profile.labels.slice(0, 2).map((label) => (
                        <span key={label} className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-zinc-500">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 line-clamp-2 font-sans text-[11px] leading-snug text-zinc-300">{headline}</div>
                    <div className="mt-1 truncate text-[9px] text-zinc-500">{entity.domain || entity.canonicalIdentifier || entity.id}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="text-[9px] font-bold tracking-wider text-zinc-500">{strongest.label}</div>
                    <div className={`mt-1 line-clamp-2 font-sans text-[11px] leading-snug font-medium ${strongest.value ? 'text-emerald-300' : 'text-zinc-700'}`}>{strongest.value || '記録なし'}</div>
                    {!profile.moneySignal && profile.tractionSignal && <div className="mt-1 text-[9px] text-zinc-600">金額より初動Signalを優先表示</div>}
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] ${tierClass(profile.tier)}`}>{tierLabel(profile.tier)}</span>
                    <div className="mt-1 font-mono text-[9px] text-zinc-500">coverage {profile.score}/10</div>
                    <div className="mt-1 font-mono text-[9px] text-zinc-600">EV {profile.counts.evidence}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-zinc-600">{formatObservedAt(entity.observedAt)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !isLoading && (
        <div className="p-8 text-center font-mono text-xs text-zinc-600">該当するFoundation entityが見つかりません</div>
      )}
      <div ref={observerTargetRef} className="py-4 text-center font-mono text-[10px] text-zinc-500">
        {isLoading ? 'Foundation R2から価値信号を読み込み中...' : hasMore ? `追加読み込み待ち... (${rows.length}件)` : `全${rows.length}件を表示可能`}
      </div>
    </div>
  );
};

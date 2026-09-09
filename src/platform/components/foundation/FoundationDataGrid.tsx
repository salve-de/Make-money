'use client';

import React from 'react';
import { Bookmark, ExternalLink, Loader2 } from 'lucide-react';
import type { FoundationEntitySummary } from '@/lib/foundation/business-reader';

interface FoundationDataGridProps {
  entities: FoundationEntitySummary[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string, event: React.MouseEvent) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isSplitView?: boolean;
}

function statusClass(status: string): string {
  if (status === 'ACTIVE') return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (status === 'SHUTDOWN' || status === 'CLOSED' || status === 'ACQUIRED') {
    return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  }
  return 'text-zinc-400 border-white/[0.12] bg-white/[0.04]';
}

function EntityRow({
  entity,
  selectedEntityId,
  onSelectEntity,
  bookmarkedIds,
  onToggleBookmark,
}: Omit<FoundationDataGridProps, 'entities' | 'hasMore' | 'isLoadingMore' | 'onLoadMore' | 'isSplitView'> & {
  entity: FoundationEntitySummary;
}) {
  const isSelected = selectedEntityId === entity.id;
  const isBookmarked = bookmarkedIds.has(entity.id);
  const secondary = [
    entity.entityType,
    entity.domain || 'ドメイン未確認',
    `根拠 ${entity.evidenceIds.length}件`,
  ].join(' · ');

  return (
    <tr
      onClick={() => onSelectEntity(entity.id)}
      className={`cursor-pointer transition-colors group ${
        isSelected
          ? 'bg-white/[0.08] border-l-2 border-emerald-500'
          : 'hover:bg-white/[0.03] border-l-2 border-transparent'
      }`}
    >
      <td className="py-2.5 px-4 align-middle">
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            type="button"
            onClick={(event) => onToggleBookmark(entity.id, event)}
            className="text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer mt-0.5"
            aria-label={`${entity.name}をブックマーク`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-zinc-300 fill-zinc-300' : ''}`} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-xs text-white truncate font-sans group-hover:text-emerald-300 transition-colors">
                {entity.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.1] shrink-0">
                Foundation Entity
              </span>
            </div>
            <div
              className="text-[11px] text-zinc-400 font-sans tracking-tight leading-snug mt-0.5 line-clamp-1 truncate"
              title={secondary}
            >
              {secondary}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3 text-right align-middle">
        <div className={`inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusClass(entity.status)}`}>
          {entity.status}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 font-mono">
          金額は未確認
        </div>
      </td>
    </tr>
  );
}

export const FoundationDataGrid: React.FC<FoundationDataGridProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  bookmarkedIds,
  onToggleBookmark,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isSplitView = false,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#07080B] select-none">
      <div className="md:hidden divide-y divide-white/[0.05]">
        {entities.map((entity) => (
          <button
            type="button"
            key={entity.id}
            onClick={() => onSelectEntity(entity.id)}
            className={`w-full text-left px-3 py-3 transition-colors ${
              selectedEntityId === entity.id ? 'bg-white/[0.08] border-l-2 border-emerald-500' : 'hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{entity.name}</div>
                <div className="mt-1 text-[10px] text-zinc-500 font-mono truncate">
                  {entity.entityType} · {entity.domain || 'ドメイン未確認'}
                </div>
              </div>
              <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusClass(entity.status)}`}>
                {entity.status}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 font-mono">
              金額は未確認 · 根拠 {entity.evidenceIds.length}件
            </div>
          </button>
        ))}
      </div>

      <div className={`${isSplitView ? 'block' : 'hidden xl:block'} w-full`}>
        <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#090A0D] text-zinc-500 text-[11px] h-9">
              <th className="w-[72%] py-2.5 px-4 font-medium">事例 / Foundation Entity</th>
              <th className="w-[28%] py-2.5 px-3 font-medium text-right">状態 / 金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entities.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                selectedEntityId={selectedEntityId}
                onSelectEntity={onSelectEntity}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!isSplitView && (
        <div className="md:block xl:hidden w-full">
          <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#090A0D] text-zinc-500 text-[11px]">
                <th className="w-[70%] py-2 px-3 font-medium">事例 / Foundation Entity</th>
                <th className="w-[30%] py-2 px-3 font-medium text-right">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {entities.map((entity) => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  selectedEntityId={selectedEntityId}
                  onSelectEntity={onSelectEntity}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entities.length === 0 && (
        <div className="p-8 text-center text-xs text-zinc-600 font-mono">
          該当するFoundation Entityがありません
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-[11px] font-mono text-zinc-300 hover:bg-white/[0.08] disabled:opacity-60 disabled:cursor-wait"
          >
            {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            {isLoadingMore ? 'R2から読み込み中…' : '次の100件をR2から読む'}
          </button>
        </div>
      )}
    </div>
  );
};

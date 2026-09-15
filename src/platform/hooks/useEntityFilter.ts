'use client';

import { useState, useMemo, useCallback } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import type { GridFilterOption } from '../types/terminal';
import type { ScreenerFilterState } from '../components/screener/AdvancedScreenerModal';

interface UseEntityFilterProps {
  entities: FinancialEntity[];
  searchQuery: string;
  onPersistApprovedId: (id: string) => void;
  onUpdateDetailedTags: (id: string) => void;
}

export function useEntityFilter({
  entities,
  searchQuery,
  onPersistApprovedId,
  onUpdateDetailedTags,
}: UseEntityFilterProps) {
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['ent_photoai', 'ent_keyence']));

  // 複数タグのトグルハンドラー
  const handleToggleTag = useCallback((tag: string | null) => {
    if (!tag) {
      setActiveTags([]);
      return;
    }
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleToggleBookmark = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 全タグ一覧および件数集計
  const { availableTags, tagCounts, newlyCollectedCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((e) => {
      (e.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort((a, b) => {
      if (a === '収集事例') return -1;
      if (b === '収集事例') return 1;
      return counts[b] - counts[a];
    });
    return {
      availableTags: tags,
      tagCounts: counts,
      newlyCollectedCount: counts['収集事例'] || 0,
    };
  }, [entities]);

  // 収集世代（バッチ）別件数集計
  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((e) => {
      if (e.batchId) {
        counts[e.batchId] = (counts[e.batchId] || 0) + 1;
      }
    });
    return counts;
  }, [entities]);

  // フィルタリング後のエンティティ配列
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (currentFilter === 'MONOPOLY' && entity.scale !== 'ENTERPRISE') return false;
      if (currentFilter === 'AI_NATIVE' && entity.sector !== 'AI_AUTOMATION') return false;
      if (currentFilter === 'BOOKMARKED' && !bookmarkedIds.has(entity.id)) return false;

      if (selectedBatch !== 'ALL' && entity.batchId !== selectedBatch) return false;

      if (activeTags.length > 0) {
        const entityTags = entity.tags || [];
        const hasAllTags = activeTags.every((t) => entityTags.includes(t));
        if (!hasAllTags) return false;
      }

      if (screenerFilters) {
        if (screenerFilters.scales.length > 0 && !screenerFilters.scales.includes(entity.scale)) return false;
        if (screenerFilters.minMargin > 0 && entity.pnl.operatingMargin < screenerFilters.minMargin) return false;
        if (screenerFilters.maxCapital !== null && (entity.operations.isCapitalUnconfirmed || entity.operations.initialCapitalRequired > screenerFilters.maxCapital)) return false;
        if (screenerFilters.moats.length > 0 && !screenerFilters.moats.includes(entity.strategy.moatType)) return false;
        if (screenerFilters.selectedTags && screenerFilters.selectedTags.length > 0) {
          const entityTags = entity.tags || [];
          const hasSelectedTag = screenerFilters.selectedTags.some((t) => entityTags.includes(t));
          if (!hasSelectedTag) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qNoSpace = q.replace(/\s+/g, '');
        const matchName = entity.name.toLowerCase().includes(q) || entity.name.toLowerCase().replace(/\s+/g, '').includes(qNoSpace);
        const matchTicker = entity.ticker.toLowerCase().includes(q);
        const matchTagline = (entity.tagline || '').toLowerCase().includes(q);
        const matchBlindspot = (entity.strategy?.blindspot || '').toLowerCase().includes(q);
        const matchFounder = (entity.founder || '').toLowerCase().includes(q);
        const matchTag = (entity.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchTicker && !matchTagline && !matchBlindspot && !matchFounder && !matchTag) return false;
      }

      return true;
    });
  }, [entities, currentFilter, selectedBatch, activeTags, screenerFilters, searchQuery, bookmarkedIds]);

  // 事例承認ハンドラー（「これはオッケー」ボタン）
  const handleApproveEntity = useCallback(async (entityId: string) => {
    const targetId = entityId.trim().toLowerCase();
    onPersistApprovedId(targetId);
    onUpdateDetailedTags(entityId);

    try {
      await fetch('/api/entities/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId }),
      });
    } catch (err) {
      console.error('[useEntityFilter] Failed to persist approval for', entityId, err);
    }
  }, [onPersistApprovedId, onUpdateDetailedTags]);

  // 一括承認ハンドラー
  const handleApproveAllCollected = useCallback(async () => {
    const targetEntities = entities.filter((e) => (e.tags || []).includes('収集事例'));
    if (targetEntities.length === 0) return;

    for (const target of targetEntities) {
      const id = target.id.trim().toLowerCase();
      onPersistApprovedId(id);
      onUpdateDetailedTags(target.id);
    }

    try {
      await Promise.all(
        targetEntities.map((e) =>
          fetch('/api/entities/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entityId: e.id }),
          })
        )
      );
    } catch (err) {
      console.error('[useEntityFilter] Failed to persist batch approval', err);
    }
  }, [entities, onPersistApprovedId, onUpdateDetailedTags]);

  return {
    currentFilter,
    setCurrentFilter,
    selectedBatch,
    setSelectedBatch,
    activeTags,
    setActiveTags,
    handleToggleTag,
    screenerFilters,
    setScreenerFilters,
    bookmarkedIds,
    handleToggleBookmark,
    availableTags,
    tagCounts,
    newlyCollectedCount,
    batchCounts,
    filteredEntities,
    handleApproveEntity,
    handleApproveAllCollected,
  };
}

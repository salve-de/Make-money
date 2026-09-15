'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity } from '@/shared/terminal';
import type { GridFilterOption } from '../types/terminal';
import type { ScreenerFilterState } from '../components/screener/AdvancedScreenerModal';
import { matchesGridFilter, readEntityFilterQuery } from '../model/entity-filter';
import { approveEntities } from '../api/entity-approval';

interface UseEntityFilterProps {
  entities: FinancialEntity[];
  searchQuery: string;
  onPersistApprovedId: (id: string) => void;
  onUpdateDetailedTags: (id: string) => void;
}

export function useEntityFilter({ entities, searchQuery, onPersistApprovedId, onUpdateDetailedTags }: UseEntityFilterProps) {
  const searchParams = useSearchParams();
  const { filter: filterParam, batch: batchParam } = readEntityFilterQuery(searchParams);
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>(filterParam);
  const [selectedBatch, setSelectedBatch] = useState<string>(batchParam);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['ent_photoai', 'ent_keyence']));
  const approvalInFlight = useRef(false);

  useEffect(() => {
    // Restore existing URL navigation, including Back/Forward and removed parameters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentFilter(filterParam);
    setSelectedBatch(batchParam);
  }, [filterParam, batchParam]);

  const handleToggleTag = useCallback((tag: string | null) => {
    if (!tag) { setActiveTags([]); return; }
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]);
  }, []);

  const handleToggleBookmark = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { availableTags, tagCounts, newlyCollectedCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((entity) => (entity.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    const tags = Object.keys(counts).sort((a, b) => {
      if (a === '収集事例') return -1;
      if (b === '収集事例') return 1;
      return counts[b] - counts[a];
    });
    return { availableTags: tags, tagCounts: counts, newlyCollectedCount: counts['収集事例'] || 0 };
  }, [entities]);

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach((entity) => { if (entity.batchId) counts[entity.batchId] = (counts[entity.batchId] || 0) + 1; });
    return counts;
  }, [entities]);

  const filteredEntities = useMemo(() => entities.filter((entity) => {
    if (!matchesGridFilter(entity, currentFilter, bookmarkedIds)) return false;
    if (selectedBatch !== 'ALL' && entity.batchId !== selectedBatch) return false;
    if (activeTags.length > 0 && !activeTags.every((tag) => (entity.tags || []).includes(tag))) return false;
    if (screenerFilters) {
      if (screenerFilters.scales.length > 0 && !screenerFilters.scales.includes(entity.scale)) return false;
      if (screenerFilters.minMargin > 0 && entity.pnl.operatingMargin < screenerFilters.minMargin) return false;
      if (screenerFilters.maxCapital !== null && (entity.operations.isCapitalUnconfirmed || entity.operations.initialCapitalRequired > screenerFilters.maxCapital)) return false;
      if (screenerFilters.moats.length > 0 && !screenerFilters.moats.includes(entity.strategy.moatType)) return false;
      if (screenerFilters.selectedTags?.length && !screenerFilters.selectedTags.some((tag) => (entity.tags || []).includes(tag))) return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const compact = query.replace(/\s+/g, '');
      const matchName = entity.name.toLowerCase().includes(query) || entity.name.toLowerCase().replace(/\s+/g, '').includes(compact);
      const matchTicker = entity.ticker.toLowerCase().includes(query);
      const matchTagline = (entity.tagline || '').toLowerCase().includes(query);
      const matchBlindspot = (entity.strategy?.blindspot || '').toLowerCase().includes(query);
      const matchFounder = (entity.founder || '').toLowerCase().includes(query);
      const matchTag = (entity.tags || []).some((tag) => tag.toLowerCase().includes(query));
      if (!matchName && !matchTicker && !matchTagline && !matchBlindspot && !matchFounder && !matchTag) return false;
    }
    return true;
  }), [entities, currentFilter, selectedBatch, activeTags, screenerFilters, searchQuery, bookmarkedIds]);

  const persistApproval = useCallback(async (ids: string[]) => {
    if (!ids.length || approvalInFlight.current) return;
    approvalInFlight.current = true;
    try {
      await approveEntities(ids);
      // Apply only acknowledged saves. Failed requests leave the visible data intact.
      for (const id of ids) {
        onPersistApprovedId(id.trim().toLowerCase());
        onUpdateDetailedTags(id);
      }
    } catch (error) {
      console.error('[useEntityFilter] Approval was not saved:', error);
      window.alert('承認を保存できませんでした。接続・保存先を確認し、再試行してください。');
    } finally {
      approvalInFlight.current = false;
    }
  }, [onPersistApprovedId, onUpdateDetailedTags]);

  const handleApproveEntity = useCallback((id: string) => persistApproval([id]), [persistApproval]);
  const handleApproveAllCollected = useCallback(() => persistApproval(
    entities.filter((entity) => (entity.tags || []).includes('収集事例')).map((entity) => entity.id),
  ), [entities, persistApproval]);

  return {
    currentFilter, setCurrentFilter, selectedBatch, setSelectedBatch,
    activeTags, setActiveTags, handleToggleTag, screenerFilters, setScreenerFilters,
    bookmarkedIds, handleToggleBookmark, availableTags, tagCounts,
    newlyCollectedCount, batchCounts, filteredEntities, handleApproveEntity, handleApproveAllCollected,
  };
}

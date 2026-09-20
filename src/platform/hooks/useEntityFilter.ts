'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FinancialEntity } from '@/shared/terminal';
import type { GridFilterOption } from '../types/terminal';
import type { ScreenerFilterState } from '../components/screener/AdvancedScreenerModal';
import { collectedEntityIds, matchesGridFilter, readEntityFilterQuery } from '../model/entity-filter';
import { approveEntities } from '../api/entity-approval';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_BOOKMARK_IDS, readGuestBookmarkIds, writeGuestBookmarkIds } from './bookmark-storage';

export type BookmarkSyncStatus = 'loading' | 'local' | 'saving' | 'synced' | 'error';

interface UseEntityFilterProps {
  entities: FinancialEntity[];
  searchQuery: string;
  onPersistApprovedId: (id: string) => void;
  onUpdateDetailedTags: (id: string) => void;
}

export function useEntityFilter({ entities, searchQuery, onPersistApprovedId, onUpdateDetailedTags }: UseEntityFilterProps) {
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const { filter: filterParam, batch: batchParam } = readEntityFilterQuery(searchParams);
  const [currentFilter, setCurrentFilter] = useState<GridFilterOption>(filterParam);
  const [selectedBatch, setSelectedBatch] = useState<string>(batchParam);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilterState | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => new Set(DEFAULT_BOOKMARK_IDS));
  const [bookmarkSyncStatus, setBookmarkSyncStatus] = useState<BookmarkSyncStatus>('loading');
  const bookmarkedIdsRef = useRef(bookmarkedIds);
  const pendingBookmarkIds = useRef(new Set<string>());
  const approvalInFlight = useRef(false);

  // Auth state is an external subscription; hydrate the bookmark projection only after it settles.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    bookmarkedIdsRef.current = bookmarkedIds;
  }, [bookmarkedIds]);

  useEffect(() => {
    let cancelled = false;
    pendingBookmarkIds.current.clear();

    if (authLoading) {
      setBookmarkSyncStatus('loading');
      return () => { cancelled = true; };
    }

    if (!user) {
      const guestIds = readGuestBookmarkIds();
      if (!cancelled) {
        setBookmarkedIds(guestIds);
        bookmarkedIdsRef.current = guestIds;
        setBookmarkSyncStatus('local');
      }
      return () => { cancelled = true; };
    }

    if (!token) {
      const empty = new Set<string>();
      setBookmarkedIds(empty);
      bookmarkedIdsRef.current = empty;
      setBookmarkSyncStatus('loading');
      return () => { cancelled = true; };
    }

    setBookmarkSyncStatus('loading');
    void (async () => {
      try {
        const response = await fetch('/api/bookmarks', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : '保存済み一覧を取得できません';
          throw new Error(message);
        }
        const rows = payload && typeof payload === 'object' && 'saved' in payload && Array.isArray(payload.saved)
          ? payload.saved
          : [];
        const accountIds = new Set(
          rows
            .filter((row): row is { itemType?: unknown; itemId?: unknown } => Boolean(row) && typeof row === 'object')
            .filter((row) => row.itemType === 'business' && typeof row.itemId === 'string')
            .map((row) => row.itemId as string),
        );
        if (cancelled) return;
        setBookmarkedIds(accountIds);
        bookmarkedIdsRef.current = accountIds;
        setBookmarkSyncStatus('synced');
      } catch (error) {
        if (cancelled) return;
        console.warn('[useEntityFilter] Bookmark sync failed:', error);
        const empty = new Set<string>();
        setBookmarkedIds(empty);
        bookmarkedIdsRef.current = empty;
        setBookmarkSyncStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, token, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    if (pendingBookmarkIds.current.has(id)) return;

    const previous = new Set(bookmarkedIdsRef.current);
    const wasSaved = previous.has(id);
    const next = new Set(previous);
    if (wasSaved) next.delete(id); else next.add(id);
    setBookmarkedIds(next);
    bookmarkedIdsRef.current = next;

    if (!user || !token) {
      if (writeGuestBookmarkIds(next)) {
        setBookmarkSyncStatus('local');
        return;
      }
      setBookmarkedIds(previous);
      bookmarkedIdsRef.current = previous;
      setBookmarkSyncStatus('error');
      return;
    }

    pendingBookmarkIds.current.add(id);
    setBookmarkSyncStatus('saving');
    void (async () => {
      try {
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: 'business', itemId: id }),
        });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== 'object' || !('saved' in payload) || typeof payload.saved !== 'boolean') {
          const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : '保存状態を更新できません';
          throw new Error(message);
        }
        const saved = payload.saved;
        const reconciled = new Set(bookmarkedIdsRef.current);
        if (saved) reconciled.add(id); else reconciled.delete(id);
        setBookmarkedIds(reconciled);
        bookmarkedIdsRef.current = reconciled;
        setBookmarkSyncStatus('synced');
      } catch (error) {
        console.warn('[useEntityFilter] Bookmark update failed:', error);
        const reverted = new Set(bookmarkedIdsRef.current);
        if (wasSaved) reverted.add(id); else reverted.delete(id);
        setBookmarkedIds(reverted);
        bookmarkedIdsRef.current = reverted;
        setBookmarkSyncStatus('error');
      } finally {
        pendingBookmarkIds.current.delete(id);
      }
    })();
  }, [token, user]);

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
  const handleApproveAllCollected = useCallback(
    () => persistApproval(collectedEntityIds(filteredEntities)),
    [filteredEntities, persistApproval],
  );

  return {
    currentFilter, setCurrentFilter, selectedBatch, setSelectedBatch,
    activeTags, setActiveTags, handleToggleTag, screenerFilters, setScreenerFilters,
    bookmarkedIds, handleToggleBookmark, bookmarkSyncStatus, availableTags, tagCounts,
    newlyCollectedCount, batchCounts, filteredEntities, handleApproveEntity, handleApproveAllCollected,
  };
}

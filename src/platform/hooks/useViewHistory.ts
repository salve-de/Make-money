'use client';

import { useState, useCallback } from 'react';

import { VIEW_HISTORY_STORAGE_KEY, decodeViewHistory, prependViewedEntity } from './view-history';

export function useViewHistory() {
  const [viewedEntityIds, setViewedEntityIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_STORAGE_KEY);
      return decodeViewHistory(stored);
    } catch {
      return [];
    }
  });

  // 閲覧履歴への追加（重複は先頭に移動、最大30件保持）
  const recordView = useCallback((entityId: string) => {
    if (!entityId) return;
    setViewedEntityIds((prev) => {
      const next = prependViewedEntity(prev, entityId);
      try {
        localStorage.setItem(VIEW_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist view history:', e);
      }
      return next;
    });
  }, []);

  return { viewedEntityIds, recordView };
}

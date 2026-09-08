'use client';

import { useState, useEffect, useCallback } from 'react';

const VIEW_HISTORY_STORAGE_KEY = 'mm_viewed_entity_history_v1';

export function useViewHistory() {
  const [viewedEntityIds, setViewedEntityIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 閲覧履歴への追加（重複は先頭に移動、最大30件保持）
  const recordView = useCallback((entityId: string) => {
    if (!entityId) return;
    setViewedEntityIds((prev) => {
      const filtered = prev.filter((id) => id !== entityId);
      const next = [entityId, ...filtered].slice(0, 30);
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

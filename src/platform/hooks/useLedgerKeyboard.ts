'use client';

import { useEffect } from 'react';
import { openEntityParam } from '../utils/entityUrl';

interface LedgerKeyboardOptions {
  enabled: boolean;
  entityIds: string[];
  selectedEntityId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

/** 事例一覧で ↑↓ で選択を移動し、Enter で詳細を開く（入力欄・ボタン操作中は反応しない）。 */
export function useLedgerKeyboard({ enabled, entityIds, selectedEntityId, onSelect, onOpen }: LedgerKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
        if (event.key === 'Enter' && (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY')) return;
      }
      if (entityIds.length === 0) return;
      const index = selectedEntityId ? entityIds.indexOf(selectedEntityId) : -1;
      if (event.key === 'Enter') {
        if (index < 0) return;
        event.preventDefault();
        onOpen(entityIds[index]);
        return;
      }
      event.preventDefault();
      const nextIndex = event.key === 'ArrowDown'
        ? Math.min(entityIds.length - 1, index + 1)
        : Math.max(0, index < 0 ? 0 : index - 1);
      const nextId = entityIds[nextIndex];
      if (nextId === selectedEntityId) return;
      onSelect(nextId);
      if (new URLSearchParams(window.location.search).has('entity')) openEntityParam(nextId);
      document.querySelector(`[data-entity-id="${CSS.escape(nextId)}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, entityIds, selectedEntityId, onSelect, onOpen]);
}

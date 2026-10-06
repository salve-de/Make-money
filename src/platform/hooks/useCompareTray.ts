'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { COMPARE_LIMIT, parseCompareIds } from '@/platform/model/compare-ids';

/** 比較に入れた事例（この端末だけに保存する）。 */
export interface CompareItem {
  id: string;
  name: string;
}

const STORAGE_KEY = 'make-money:compare:v1';
const CHANGE_EVENT = 'make-money:compare-change';
const EMPTY: CompareItem[] = [];

function parseItems(raw: string | null): CompareItem[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    const items: CompareItem[] = [];
    for (const item of value) {
      if (!item || typeof item.id !== 'string' || parseCompareIds(item.id)[0] !== item.id || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 300) continue;
      if (!items.some((entry) => entry.id === item.id)) items.push({ id: item.id, name: item.name });
      if (items.length === COMPARE_LIMIT) break;
    }
    return items;
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null = null;
let cachedItems: CompareItem[] = EMPTY;

function readItems(): CompareItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedItems;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parseItems(raw);
  }
  return cachedItems;
}

function writeItems(items: CompareItem[]): void {
  const next = items.slice(0, COMPARE_LIMIT);
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch {
    // 保存できない環境（プライベートブラウズ等）では、このページを開いている間だけ保持する。
    // 最後に読んだ保存値は残し、同じ古い値を読み直しても今の編集が戻らないようにする
  }
  cachedItems = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** 比較する事例の一覧。最大4件。追加・削除はすべてのタブへ反映される。 */
export function useCompareTray() {
  const items = useSyncExternalStore(subscribe, readItems, () => EMPTY);

  const has = useCallback((id: string) => items.some((item) => item.id === id), [items]);
  const toggle = useCallback((item: CompareItem) => {
    const current = readItems();
    if (current.some((entry) => entry.id === item.id)) {
      writeItems(current.filter((entry) => entry.id !== item.id));
    } else if (current.length < COMPARE_LIMIT) {
      writeItems([...current, item]);
    }
  }, []);
  const add = useCallback((item: CompareItem) => {
    const current = readItems();
    if (!current.some((entry) => entry.id === item.id) && current.length < COMPARE_LIMIT) writeItems([...current, item]);
  }, []);
  const remove = useCallback((id: string) => writeItems(readItems().filter((entry) => entry.id !== id)), []);
  const clear = useCallback(() => writeItems([]), []);

  return { items, has, toggle, add, remove, clear, isFull: items.length >= COMPARE_LIMIT };
}

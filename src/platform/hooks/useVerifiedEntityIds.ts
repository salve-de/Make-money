'use client';

import { useSyncExternalStore } from 'react';
import { readVerifiedEntities } from '@/platform/model/verified-revenue-view';

/**
 * 決済データで売上を確認済みの事例ID。一覧を開いたときに1回だけ読み、画面の間で使い回す。
 * 読めなかったときは空のまま（印を出さないだけで、一覧の表示は止めない）。
 */
const EMPTY: ReadonlySet<string> = new Set();
let verifiedIds: ReadonlySet<string> = EMPTY;
let status: 'idle' | 'loading' | 'loaded' = 'idle';
const listeners = new Set<() => void>();

function load() {
  if (status !== 'idle') return;
  status = 'loading';
  fetch('/api/verification/list')
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
    .then((body: unknown) => {
      verifiedIds = new Set(readVerifiedEntities(body).map((row) => row.entityId));
      // 読めなかった応答なら、次にこの一覧を開いたときに読み直す
      status = (body as { unavailable?: unknown } | null)?.unavailable === true ? 'idle' : 'loaded';
      listeners.forEach((listener) => listener());
    })
    .catch(() => {
      // 次にこの一覧を開いたときに読み直す
      status = 'idle';
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

/** 確認し直した直後など、次に読むときに最新の一覧を取り直す。 */
export function refreshVerifiedEntityIds() {
  if (status === 'loading') return;
  status = 'idle';
  if (listeners.size > 0) load();
}

export function useVerifiedEntityIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => verifiedIds, () => EMPTY);
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';
import { isValidCatalogPageProgress } from '@/lib/company-access/catalog-page';

/** 1回の取得を待つ上限。超えたら中断して、1回だけ取り直す。 */
const ATTEMPT_TIMEOUT_MS = 15_000;
/** この時間を過ぎても届かない時は、画面に「時間がかかっています」を出す。 */
const SLOW_AFTER_MS = 6_000;

type Page = { key: string; nextOffset: number | null; generation?: string; total: number | null };
export function mergeKnownCatalogEntities(initial: FinancialEntity[], rows: FinancialEntity[]): FinancialEntity[] {
  const merged = new Map([...initial, ...rows].map((entity) => [entity.id, entity]));
  // Paging returns summaries; it must not downgrade an SSR-selected full dossier.
  for (const entity of initial) {
    if (entity.lootBlueprint && (entity.evidenceCards?.length ?? 0) >= 2) merged.set(entity.id, entity);
  }
  return [...merged.values()];
}
export function useCuratedCatalog(initial: FinancialEntity[], query: string, filters = '') {
  const [rows, setRows] = useState(initial);
  const [page, setPage] = useState<Page>({ key: '', nextOffset: null, total: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const failedAt = useRef<{ offset: number; generation?: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const requestKey = JSON.stringify([query, filters]);

  const load = useCallback(async (offset: number, generation?: string) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    // Keep each response comfortably below Worker/browser response limits. The
    // full catalog remains reachable through repeated cursor pages.
    const params = new URLSearchParams({ offset: String(offset), pageSize: '10', q: query });
    if (filters) params.set('filters', filters);
    if (offset > 0 && generation) params.set('generation', generation);
    try {
      let payload: {
        data: unknown;
        generation: string;
        nextOffset: number | null;
        total: number;
      } | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          // 1回ごとに上限の時間を決める。外側の中断（検索語の変更）も引き継ぐ
          const attemptController = new AbortController();
          const timeout = window.setTimeout(() => attemptController.abort(), ATTEMPT_TIMEOUT_MS);
          const forward = () => attemptController.abort();
          controller.signal.addEventListener('abort', forward);
          let response: Response;
          try {
            response = await fetch(`/api/catalog?${params}`, { signal: attemptController.signal });
          } finally {
            window.clearTimeout(timeout);
            controller.signal.removeEventListener('abort', forward);
          }
          if (response.status === 409) throw new Error('事例データが更新されました。画面を再読み込みしてください');
          if (!response.ok) throw new Error(`事例データの取得に失敗しました（HTTP ${response.status}）。再読み込みしてください`);
          payload = await response.json() as {
            data: unknown;
            generation: string;
            nextOffset: number | null;
            total: number;
          };
          break;
        } catch (cause) {
          lastError = cause;
          if (attempt === 1 || controller.signal.aborted || (cause instanceof Error && cause.message.includes('事例データが更新されました'))) {
            throw cause;
          }
          await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
        }
      }
      if (!payload) throw lastError instanceof Error ? lastError : new Error('Invalid catalog page');
      const data = parseFinancialEntities(payload.data);
      if (!isValidCatalogPageProgress({
        offset,
        dataLength: data.length,
        generation: payload.generation,
        total: payload.total,
        nextOffset: payload.nextOffset,
      })) throw new Error('Invalid catalog page');
      // Ignore a previous search or page request after the query has changed.
      if (controller.signal.aborted || active.current !== controller) return;
      setRows((current) => offset === 0
        ? data
        : [...new Map([...current, ...data].map((entity) => [entity.id, entity])).values()]);
      setPage({ key: requestKey, nextOffset: payload.nextOffset, generation: payload.generation, total: payload.total });
      setError(null);
      failedAt.current = null;
    } catch (cause) {
      if (!controller.signal.aborted && active.current === controller) {
        failedAt.current = { offset, generation };
        setError(cause instanceof Error && cause.name !== 'AbortError' ? cause.message : '通信に時間がかかりすぎました。もう一度お試しください');
      }
    } finally {
      window.clearTimeout(slowTimer);
      if (active.current === controller) { active.current = null; setLoading(false); setSlow(false); }
    }
  }, [query, filters, requestKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(0); }, 200);
    return () => { window.clearTimeout(timer); active.current?.abort(); };
  }, [load]);
  const loadMore = useCallback(() => {
    if (active.current || page.key !== requestKey || page.nextOffset === null) return;
    void load(page.nextOffset, page.generation);
  }, [load, page, requestKey]);
  /** 取得に失敗した所（先頭でも2ページ目以降でも）を、その場所からもう一度取る。 */
  const retry = useCallback(() => {
    if (active.current) return;
    const at = failedAt.current ?? { offset: 0, generation: undefined };
    void load(at.offset, at.generation);
  }, [load]);
  const entities = useMemo(() => mergeKnownCatalogEntities(initial, rows), [initial, rows]);
  // 公開目録の API ページが届いた後の先頭の事例（届くまでは null）
  const firstId = page.key === requestKey ? rows[0]?.id ?? null : null;
  return {
    entities,
    firstId,
    loadedCount: rows.length,
    totalCount: page.key === requestKey ? page.total : null,
    hasMore: page.key === requestKey && page.nextOffset !== null,
    loading,
    loadMore,
    error,
    /** 時間がかかっている間 true（読み込み中の表示に「時間がかかっています」を足す） */
    slow,
    retry,
  };
}

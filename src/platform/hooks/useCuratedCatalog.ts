'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { parseFinancialEntities } from '@/shared/financial-entity-schema';

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
  const active = useRef<AbortController | null>(null);
  const requestKey = JSON.stringify([query, filters]);

  const load = useCallback(async (offset: number, generation?: string) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const params = new URLSearchParams({ offset: String(offset), q: query });
    if (filters) params.set('filters', filters);
    if (offset > 0 && generation) params.set('generation', generation);
    try {
      const response = await fetch(`/api/catalog?${params}`, { signal: controller.signal });
      if (response.status === 409) throw new Error('台帳が更新されました。画面を再読み込みしてください');
      if (!response.ok) throw new Error(`台帳の取得に失敗しました（HTTP ${response.status}）。再読み込みしてください`);
      const payload = await response.json() as {
        data: unknown;
        generation: string;
        nextOffset: number | null;
        total: number;
      };
      const data = parseFinancialEntities(payload.data);
      if (
        typeof payload.generation !== 'string' ||
        !Number.isSafeInteger(payload.total) ||
        payload.total < 0 ||
        payload.total < offset + data.length ||
        (payload.nextOffset !== null && (!Number.isSafeInteger(payload.nextOffset) || payload.nextOffset <= offset))
      ) throw new Error('Invalid catalog page');
      // Ignore a previous search or page request after the query has changed.
      if (controller.signal.aborted || active.current !== controller) return;
      setRows((current) => offset === 0
        ? data
        : [...new Map([...current, ...data].map((entity) => [entity.id, entity])).values()]);
      setPage({ key: requestKey, nextOffset: payload.nextOffset, generation: payload.generation, total: payload.total });
      setError(null);
    } catch (cause) {
      if (!controller.signal.aborted && active.current === controller) setError(cause instanceof Error ? cause.message : '台帳の取得に失敗しました');
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); }
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
  const entities = useMemo(() => mergeKnownCatalogEntities(initial, rows), [initial, rows]);
  return {
    entities,
    loadedCount: rows.length,
    totalCount: page.key === requestKey ? page.total : null,
    hasMore: page.key === requestKey && page.nextOffset !== null,
    loading,
    loadMore,
    error,
  };
}

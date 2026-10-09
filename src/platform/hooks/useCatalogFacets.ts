'use client';

import { useEffect, useState } from 'react';
import type { FacetRow } from '../model/entity-filter';
import { decodeFacets } from '../model/facet-wire';

/**
 * 公開中の全件の「絞り込みの件数用の最小の値」を、画面を開いた直後に1回だけ読み込む。
 * 読めない間・失敗した時は undefined（件数を出さず、すべての条件を押せるままにする）。
 */
export function useCatalogFacets(): readonly FacetRow[] | undefined {
  const [rows, setRows] = useState<readonly FacetRow[] | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/catalog/facets', { signal: controller.signal });
        if (!response.ok) return;
        const decoded = decodeFacets(await response.json());
        if (decoded) setRows(decoded);
      } catch { /* 件数が出ないだけで一覧は使える */ }
    })();
    return () => controller.abort();
  }, []);
  return rows;
}

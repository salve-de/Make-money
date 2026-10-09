'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { ListMetricCell, listMetricsOf } from '@/platform/components/grid/ReaderListCells';
import { readerSummaryFact } from '@/shared/display-text';
import { summaryLineOf } from '@/shared/list-lines';

const LIST_LIMIT = 8;

type Result = { rows: FinancialEntity[] } | { failed: true };

/** 比較に入れていない事例を、売上などの記録がある順に並べる。 */
export function otherCases(rows: readonly FinancialEntity[], excludeIds: readonly string[]): FinancialEntity[] {
  const hasMetric = (row: FinancialEntity) => (listMetricsOf(row.reader).main ? 1 : 0);
  return rows
    .filter((row) => !excludeIds.includes(row.id))
    .sort((a, b) => hasMetric(b) - hasMetric(a))
    .slice(0, LIST_LIMIT);
}

function CaseList({ title, empty, rows, canAdd, onAdd }: {
  title: string;
  empty: string;
  rows: FinancialEntity[];
  canAdd: boolean;
  onAdd: (entity: FinancialEntity) => void;
}) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="border-b border-term-line bg-term-head px-2.5 py-1 text-xs text-term-label">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-2.5 py-2 text-xs text-term-muted">{empty}</p>
      ) : (
        <ul>
          {rows.map((row) => {
            const summary = readerSummaryFact(row.reader);
            return (
              <li key={row.id} className="flex min-h-11 items-center gap-2 border-b border-term-line-soft px-2.5 py-1 text-[13px] lg:min-h-8">
                <Link href={`/?entity=${encodeURIComponent(row.id)}`} className="min-w-0 flex-1" title={row.tagline || row.name}>
                  <span className="block truncate text-term-fg-strong hover:underline">{row.name}</span>
                  {summary && <span className="block truncate text-xs text-term-muted">{summaryLineOf(row.reader)}</span>}
                </Link>
                <span className="term-num shrink-0 text-right text-xs">
                  <ListMetricCell metric={listMetricsOf(row.reader).main} expected={['REVENUE']} />
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(row)}
                  disabled={!canAdd}
                  title={canAdd ? '比較に追加' : '比較は4件までです'}
                  aria-label={`${row.name}を比較に追加`}
                  className="inline-flex h-11 shrink-0 items-center border border-term-line px-3 text-xs text-term-fg hover:bg-term-head disabled:cursor-not-allowed disabled:text-term-dim lg:h-6 lg:px-2"
                >
                  追加
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 比較に加えられる、ほかの公開事例。 */
export function CompareSimilarCases({ excludeIds, canAdd, onAdd }: {
  excludeIds: readonly string[];
  canAdd: boolean;
  onAdd: (entity: FinancialEntity) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/catalog?pageSize=100')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data?: FinancialEntity[] };
        if (!cancelled) setResult({ rows: Array.isArray(body.data) ? body.data : [] });
      })
      .catch(() => { if (!cancelled) setResult({ failed: true }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="border-b border-term-line">
      <div className="term-panel-title">
        <span className="term-panel-name">ほかの事例を加える</span>
      </div>
      {!result && <p className="px-3 py-2 text-xs text-term-muted">読み込み中…</p>}
      {result && 'failed' in result && <p role="alert" className="px-3 py-2 text-xs text-term-danger">事例を読み込めませんでした。</p>}
      {result && 'rows' in result && (
        <CaseList title="ほかの事例" empty="加えられる事例はありません。" rows={otherCases(result.rows, excludeIds)} canAdd={canAdd} onAdd={onAdd} />
      )}
    </div>
  );
}

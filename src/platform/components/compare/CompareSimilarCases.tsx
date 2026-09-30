'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { hasRecordedRevenue, isFailureCase } from '@/platform/model/case-outcome';
import { confirmStatus } from '@/platform/components/grid/ledgerRow';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';
import { formatYen } from '@/platform/utils/moneyDisplay';

const LIST_LIMIT = 5;

type Result = { sector: string; rows: FinancialEntity[] } | { sector: string; failed: true };

/** 同じ分野の事例を、失敗・撤退の記録と売上の記録に分ける（比較中の事例は除く）。 */
export function splitSimilarCases(rows: readonly FinancialEntity[], excludeIds: readonly string[]) {
  const candidates = rows.filter((row) => !excludeIds.includes(row.id));
  const failures = candidates.filter(isFailureCase).slice(0, LIST_LIMIT);
  const successes = candidates
    .filter((row) => hasRecordedRevenue(row) && !isFailureCase(row))
    .sort((a, b) => b.pnl.monthlyRevenue - a.pnl.monthlyRevenue)
    .slice(0, LIST_LIMIT);
  return { failures, successes };
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
          {rows.map((row) => (
            <li key={row.id} className="flex min-h-11 items-center gap-2 border-b border-term-line-soft px-2.5 text-[13px] lg:min-h-8">
              <Link href={`/?entity=${encodeURIComponent(row.id)}`} className="min-w-0 flex-1 truncate text-term-fg-strong hover:underline" title={row.tagline || row.name}>
                {row.name}
              </Link>
              <span className="shrink-0 text-right text-xs">
                {isFailureCase(row) ? (
                  <span className="text-term-danger">失敗・撤退</span>
                ) : (
                  <><span className="term-num text-term-fg">{formatYen(row.pnl.monthlyRevenue)}</span><span className="ml-1 text-term-dim">{confirmStatus(row).label}</span></>
                )}
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
          ))}
        </ul>
      )}
    </section>
  );
}

/** 比較中の1件目と同じ分野の、失敗事例と売上の記録がある事例。 */
export function CompareSimilarCases({ sector, excludeIds, canAdd, onAdd }: {
  sector: FinancialEntity['sector'];
  excludeIds: readonly string[];
  canAdd: boolean;
  onAdd: (entity: FinancialEntity) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/catalog?sector=${encodeURIComponent(sector)}&pageSize=100`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data?: FinancialEntity[] };
        if (!cancelled) setResult({ sector, rows: Array.isArray(body.data) ? body.data : [] });
      })
      .catch(() => { if (!cancelled) setResult({ sector, failed: true }); });
    return () => { cancelled = true; };
  }, [sector]);

  // 分野が変わった直後は、前の分野の結果を出さずに読み込み中とする
  const state = !result || result.sector !== sector
    ? { status: 'loading' as const }
    : 'failed' in result ? { status: 'error' as const } : { status: 'ready' as const, rows: result.rows };

  const label = sectorLabel(sector);
  return (
    <div className="border-b border-term-line">
      <div className="term-panel-title">
        <span className="term-panel-name">同じ分野の事例</span>
        <span className="truncate">{label}</span>
      </div>
      {state.status === 'loading' && <p className="px-3 py-2 text-xs text-term-muted">読み込み中…</p>}
      {state.status === 'error' && <p role="alert" className="px-3 py-2 text-xs text-term-danger">同じ分野の事例を読み込めませんでした。</p>}
      {state.status === 'ready' && (() => {
        const { failures, successes } = splitSimilarCases(state.rows, excludeIds);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-term-line">
            <CaseList title="失敗・撤退の記録がある事例" empty="この分野の失敗事例はまだ記録がありません。" rows={failures} canAdd={canAdd} onAdd={onAdd} />
            <CaseList title="売上の記録がある事例" empty="この分野で売上の記録がある事例はまだありません。" rows={successes} canAdd={canAdd} onAdd={onAdd} />
          </div>
        );
      })()}
    </div>
  );
}

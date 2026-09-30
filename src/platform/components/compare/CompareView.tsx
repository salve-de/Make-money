'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { loadEntityDetail } from '@/platform/hooks/entity-detail-loader';
import { useCompareTray } from '@/platform/hooks/useCompareTray';
import { COMPARE_LIMIT, compareHref } from '@/platform/model/compare-ids';
import { CASE_OUTCOME_LABEL, caseOutcome, hasRecordedRevenue } from '@/platform/model/case-outcome';
import { confirmStatus, teamSizeText } from '@/platform/components/grid/ledgerRow';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';
import { formatYen } from '@/platform/utils/moneyDisplay';
import { CompareSimilarCases } from './CompareSimilarCases';

type Loaded = { status: 'loading' } | { status: 'ready'; entity: FinancialEntity } | { status: 'missing' } | { status: 'error' };

function text(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^(UNKNOWN|未確認)(?:$|[（(：:。])/.test(trimmed) ? '' : trimmed;
}

const money = (value: number, entity: FinancialEntity) => (
  <><span className="term-num text-term-fg-strong">{formatYen(value)}</span><span className="ml-1 text-xs text-term-dim">{confirmStatus(entity).label}</span></>
);

/** 比較する項目。値が出せない（未確認）の欄は「—」。全列で未確認の行は出さない。 */
const ROWS: { label: string; value: (entity: FinancialEntity) => React.ReactNode }[] = [
  { label: '事業', value: (e) => text(e.essence?.whatItDoes) || text(e.tagline) || null },
  { label: '分野', value: (e) => sectorLabel(e.sector) },
  {
    label: '成否',
    value: (e) => {
      const outcome = caseOutcome(e);
      return <span className={outcome === 'failure' ? 'text-term-danger' : outcome === 'success' ? 'text-term-fg-strong' : 'text-term-muted'}>{CASE_OUTCOME_LABEL[outcome]}</span>;
    },
  },
  { label: '開始年', value: (e) => (e.temporal?.foundedYear && e.temporal.foundedYear > 0 ? <span className="term-num">{e.temporal.foundedYear}年</span> : null) },
  { label: '月商', value: (e) => (hasRecordedRevenue(e) ? money(e.pnl.monthlyRevenue, e) : null) },
  {
    label: '営業利益',
    value: (e) => (hasRecordedRevenue(e) && !e.pnl.isOperatingProfitUnconfirmed && Number.isFinite(e.pnl.operatingProfit) ? money(e.pnl.operatingProfit, e) : null),
  },
  {
    label: '営業利益率',
    value: (e) => (hasRecordedRevenue(e) && !e.pnl.isMarginUnconfirmed && Number.isFinite(e.pnl.operatingMargin)
      ? <span className="term-num">{e.pnl.operatingMargin.toFixed(1)}%</span> : null),
  },
  { label: '運営人数', value: (e) => (teamSizeText(e) ? <span className="term-num">{teamSizeText(e)}人</span> : null) },
  { label: '価格', value: (e) => text(e.pricing?.pricePoint) || null },
  { label: '対象顧客', value: (e) => text(e.essence?.targetCustomer) || null },
  { label: '最初の顧客', value: (e) => text(e.acquisition?.primaryFunnel) || text(e.lootBlueprint?.stealthEntry) || null },
  { label: '競争優位', value: (e) => text(e.strategy?.moatDescription) || null },
  { label: '大手との競争', value: (e) => text(e.strategy?.incumbentDilemma) || null },
];

// Tailwind が読み取れるよう、列数ごとのクラスを文字列のまま並べる
const COLUMN_CLASSES = [
  'grid-cols-[88px_minmax(180px,1fr)]',
  'grid-cols-[88px_repeat(2,minmax(180px,1fr))]',
  'grid-cols-[88px_repeat(3,minmax(180px,1fr))]',
  'grid-cols-[88px_repeat(4,minmax(180px,1fr))]',
];

function useComparedEntities(ids: readonly string[]) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const requested = useRef(new Set<string>());
  const key = ids.join(',');
  useEffect(() => {
    // 取得済み・取得中の事例は取り直さない。まだ結果の無い事例は、表示側で「読み込み中」として扱う
    for (const id of key ? key.split(',') : []) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      loadEntityDetail(id)
        .then((entity) => setLoaded((prev) => ({ ...prev, [id]: entity ? { status: 'ready', entity } : { status: 'missing' } })))
        .catch(() => {
          requested.current.delete(id);
          setLoaded((prev) => ({ ...prev, [id]: { status: 'error' } }));
        });
    }
  }, [key]);
  return loaded;
}

export function CompareView({ ids: requestedIds }: { ids: string[] }) {
  const router = useRouter();
  const tray = useCompareTray();
  // URL の指定を優先し、無ければこの端末で比較に入れた事例を使う
  const ids = requestedIds.length > 0 ? requestedIds : tray.items.map((item) => item.id);
  const loaded = useComparedEntities(ids);
  const ready = ids.map((id) => loaded[id]).filter((item): item is { status: 'ready'; entity: FinancialEntity } => item?.status === 'ready').map((item) => item.entity);

  const removeCase = (id: string) => {
    tray.remove(id);
    router.replace(compareHref(ids.filter((item) => item !== id)));
  };
  const addCase = (entity: Pick<FinancialEntity, 'id' | 'name'>) => {
    if (ids.includes(entity.id) || ids.length >= COMPARE_LIMIT) return;
    tray.add({ id: entity.id, name: entity.name });
    router.replace(compareHref([...ids, entity.id]));
  };
  const clearAll = () => {
    tray.clear();
    router.replace('/compare');
  };

  const rows = ROWS.map((row) => ({ label: row.label, cells: ready.map((entity) => row.value(entity)) }))
    .filter((row) => row.cells.some((cell) => cell !== null && cell !== ''));
  const columns = COLUMN_CLASSES[Math.min(Math.max(ids.length, 1), COMPARE_LIMIT) - 1];

  return (
    <>
      <div className="term-panel-title">
        <span className="term-panel-name max-lg:hidden">事例の比較</span>
        <span className="term-num">{ids.length} / {COMPARE_LIMIT}件</span>
        <span className="hidden truncate sm:inline">売上・利益は記録がある値だけを表示します。未確認は「—」です。</span>
        {ids.length > 0 && <button type="button" onClick={clearAll} className="ml-auto flex min-h-11 items-center px-2 text-xs text-term-muted hover:bg-term-line hover:text-term-fg-strong lg:min-h-6">すべて外す</button>}
      </div>
      <h1 className="sr-only">事例の比較</h1>

      {ids.length === 0 ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">比較する事例がありません</p>
          <p className="mt-1 text-term-sub">事例の詳細で「比較」を押すと、ここに{COMPARE_LIMIT}件まで並べて見比べられます。</p>
          <Link href="/" className="mt-3 inline-flex min-h-11 items-center border border-term-line px-4 text-sm text-term-fg hover:bg-term-head lg:min-h-8 lg:px-3">事例一覧へ</Link>
        </section>
      ) : (
        <div className="overflow-x-auto border-b border-term-line">
          <div role="table" aria-label="事例の比較表" className={`grid min-w-max ${columns} text-[13px] lg:min-w-0`}>
            <div role="row" className="contents">
              <span role="columnheader" className="sticky left-0 z-10 border-b border-r border-term-line bg-term-head px-2.5 py-1.5 text-xs text-term-label">項目</span>
              {ids.map((id) => {
                const state = loaded[id];
                const name = state?.status === 'ready' ? state.entity.name : tray.items.find((item) => item.id === id)?.name ?? id;
                return (
                  <div role="columnheader" key={id} className="flex min-w-0 items-start gap-2 border-b border-r border-term-line bg-term-head px-2.5 py-1.5 last:border-r-0">
                    <Link href={`/?entity=${encodeURIComponent(id)}`} className="min-w-0 flex-1 truncate font-semibold text-term-fg-strong hover:underline" title={`${name}の詳細を開く`}>{name}</Link>
                    <button type="button" onClick={() => removeCase(id)} aria-label={`${name}を比較から外す`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-term-muted hover:bg-term-line hover:text-term-fg-strong lg:h-6 lg:w-6">×</button>
                  </div>
                );
              })}
            </div>
            {ids.some((id) => loaded[id]?.status !== 'ready') && (
              <div role="row" className="contents">
                <span role="rowheader" className="sticky left-0 z-10 border-b border-r border-term-line-soft bg-term-panel px-2.5 py-1.5 text-xs text-term-label">状態</span>
                {ids.map((id) => {
                  const status = loaded[id]?.status ?? 'loading';
                  return (
                    <span role="cell" key={id} className="border-b border-r border-term-line-soft px-2.5 py-1.5 text-xs text-term-muted last:border-r-0">
                      {status === 'ready' ? '' : status === 'loading' ? '読み込み中…' : status === 'missing' ? 'この事例は公開されていないか、見つかりません' : '読み込めませんでした。再読み込みしてください'}
                    </span>
                  );
                })}
              </div>
            )}
            {rows.map((row) => (
              <div role="row" key={row.label} className="contents">
                <span role="rowheader" className="sticky left-0 z-10 border-b border-r border-term-line-soft bg-term-panel px-2.5 py-1.5 text-xs leading-5 text-term-label">{row.label}</span>
                {ids.map((id) => {
                  const index = ready.findIndex((entity) => entity.id === id);
                  const cell = index >= 0 ? row.cells[index] : null;
                  return (
                    <span role="cell" key={id} className="min-w-0 break-words border-b border-r border-term-line-soft px-2.5 py-1.5 leading-6 text-term-fg last:border-r-0">
                      {cell ?? <span className="text-term-dim" aria-label="未確認">—</span>}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {ready[0] && (
        <CompareSimilarCases
          sector={ready[0].sector}
          excludeIds={ids}
          canAdd={ids.length < COMPARE_LIMIT}
          onAdd={addCase}
        />
      )}
    </>
  );
}

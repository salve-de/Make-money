'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import type { FinancialEntity } from '@/shared/terminal';
import { loadEntityDetail } from '@/platform/hooks/entity-detail-loader';
import { parseBuildCaseParam, synthesisHref } from '@/platform/model/build-material';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';

type Loaded =
  | { id: string; status: 'ready'; entity: FinancialEntity }
  | { id: string; status: 'missing' | 'error' };

/** 未確認の印だけの文言は要点として出さない。 */
function text(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^(UNKNOWN|未確認)(?:$|[（(：:。])/.test(trimmed) ? '' : trimmed;
}

const BTN = 'inline-flex min-h-11 items-center justify-center border px-4 text-sm lg:min-h-8 lg:px-3';

/**
 * 「これで作る」から来たとき、材料にする事例を明示する。
 * 公開目録に無い・不正なIDは材料にしない（何も出さず、ほかの入口だけを見せる）。
 */
export function BuildMaterial() {
  const caseId = parseBuildCaseParam(useSearchParams()?.get('case'));
  // 結果は取得したIDと対で持つ。IDが変わったら古い結果は使わず「読み込み中」になる（状態の取り違えを起こさない）
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    loadEntityDetail(caseId)
      .then((entity) => { if (!cancelled) setResult(entity ? { id: caseId, status: 'ready', entity } : { id: caseId, status: 'missing' }); })
      .catch(() => { if (!cancelled) setResult({ id: caseId, status: 'error' }); });
    return () => { cancelled = true; };
  }, [caseId]);

  if (!caseId) return null;
  const current = result?.id === caseId ? result : null;
  if (current?.status === 'missing') return null;

  if (!current) {
    return <p role="status" className="border-b border-term-line px-3 py-3 text-sm text-term-muted">材料にする事例を読み込んでいます…</p>;
  }
  if (current.status !== 'ready') {
    return <p role="status" className="border-b border-term-line px-3 py-3 text-sm text-term-sub">材料にする事例を読み込めませんでした。時間をおいて、事例の画面からもう一度「これで作る」を押してください。</p>;
  }

  const { entity } = current;
  const summary = text(entity.essence?.whatItDoes) || text(entity.tagline);
  const sector = sectorLabel(entity);
  return (
    <section aria-label="作る材料にする事例" data-testid="build-material" className="border-b border-term-accent bg-term-panel">
      <div className="term-panel-title">
        <span className="term-panel-name">材料にする事例</span>
        <span className="max-sm:hidden">この事例を材料に、事業の案を作ります</span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-term-fg-strong" title={entity.name}>{entity.name}</h2>
          {sector && <p className="text-xs text-term-label">{sector}</p>}
          {summary && <p className="mt-0.5 text-sm text-term-sub">{summary}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link href={synthesisHref(entity.id)} prefetch={false} className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>
            この事例を材料に案を作る
          </Link>
          <Link href="/build" prefetch={false} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>
            材料を外す
          </Link>
        </div>
      </div>
    </section>
  );
}

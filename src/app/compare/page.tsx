import { Suspense } from 'react';
import type { Metadata } from 'next';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { CompareView } from '@/platform/components/compare/CompareView';
import { COMPARE_LIMIT, parseCompareIds } from '@/platform/model/compare-ids';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '事例の比較 | Make Money' };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const raw = (await searchParams).ids;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const ids = parseCompareIds(value);
  // 上限を超えて指定された分は表示しない。黙って消さず、画面で知らせる
  const omitted = ids.length >= COMPARE_LIMIT ? new Set((value ?? '').split(',').map((part) => part.trim()).filter(Boolean)).size - COMPARE_LIMIT : 0;
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="COMPARE" />
      <main className="w-full flex-1">
        <Suspense fallback={<p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>}>
          <CompareView ids={ids} omittedCount={Math.max(omitted, 0)} />
        </Suspense>
      </main>
    </div>
  );
}

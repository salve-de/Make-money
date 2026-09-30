import { Suspense } from 'react';
import type { Metadata } from 'next';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { CompareView } from '@/platform/components/compare/CompareView';
import { parseCompareIds } from '@/platform/model/compare-ids';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '事例の比較' };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const raw = (await searchParams).ids;
  const ids = parseCompareIds(Array.isArray(raw) ? raw[0] : raw);
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="COMPARE" />
      <main className="w-full flex-1">
        <Suspense fallback={<p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>}>
          <CompareView ids={ids} />
        </Suspense>
      </main>
    </div>
  );
}

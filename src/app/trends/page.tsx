import { Suspense, type ComponentProps, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { CatalogUnavailableError, readReleasePatternCases } from '@/lib/company-access/catalog-release';
import { buildPatternReport, parsePatternFilter } from '@/lib/company-access/case-patterns';
import { PATTERN_SECTOR_LABELS } from '@/lib/company-access/case-patterns-labels';
import { PatternsView } from '@/features/case-patterns';
import { CaseTrendsSummary } from '@/features/case-trends';
import { buildCaseTrends, summarizeCaseTrends } from '@/lib/company-access/case-trends';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { sha256Sync } from '@/shared/sha256';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '傾向 | Make Money' };

type Params = { sector?: string | string[]; price?: string | string[]; basis?: string | string[] };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  let report: ReturnType<typeof buildPatternReport> | null = null;
  try {
    report = buildPatternReport(await readReleasePatternCases(), parsePatternFilter(params, PATTERN_SECTOR_LABELS), PATTERN_SECTOR_LABELS);
  } catch (error) {
    if (!(error instanceof CatalogUnavailableError)) throw error;
  }
  // 出典付きの数字・公表内容がある事例だけを要約に使う。1件も無ければこの区画ごと出さない（空の枠を作らない）
  let trendsProps: ComponentProps<typeof CaseTrendsSummary> | null = null;
  try {
    const published = await readCachedLocalPublishableEntities();
    const cases = published.map((row) => buildCaseTrends(row));
    const shown = cases.filter((item) => item.series.length > 0 || item.records.length > 0);
    if (shown.length > 0) {
      shown.sort((a, b) => Number(b.status === 'COMPARABLE') - Number(a.status === 'COMPARABLE'));
      trendsProps = {
        cases: shown,
        coverage: summarizeCaseTrends(cases),
        corpus: { version: 1, hash: sha256Sync(published.map((row) => row.id).join('\n')), publishedCaseCount: published.length, checkedAt: null },
      };
    }
  } catch (error) {
    if (!(error instanceof CatalogUnavailableError)) throw error;
  }
  const trends: ReactNode = trendsProps ? <CaseTrendsSummary {...trendsProps} /> : null;
  const body = report
    ? <>{trends}<PatternsView report={report} /></>
    : <p role="alert" className="px-3 py-4 text-sm text-term-fg">目録を読み込めません。しばらくしてから、ページを開き直してください。</p>;
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="TRENDS" />
      <main className="w-full flex-1">
        <Suspense fallback={<p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>}>{body}</Suspense>
      </main>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { readReleasePatternCases } from '@/lib/company-access/catalog-release';
import { buildPatternReport, parsePatternFilter } from '@/lib/company-access/case-patterns';
import { PATTERN_SECTOR_LABELS } from '@/lib/company-access/case-patterns-labels';

export const dynamic = 'force-dynamic';

/** 傾向画面と同じ集計を JSON で返す。条件は sector / price / basis。 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const filter = parsePatternFilter({ sector: p.get('sector') ?? undefined, price: p.get('price') ?? undefined, basis: p.get('basis') ?? undefined }, PATTERN_SECTOR_LABELS);
  try {
    const report = buildPatternReport(await readReleasePatternCases(), filter, PATTERN_SECTOR_LABELS);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch {
    return NextResponse.json({ error: 'Catalog temporarily unavailable' }, { status: 503 });
  }
}

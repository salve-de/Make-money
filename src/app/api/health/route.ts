import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/storage/d1';
import { readReleaseSummaries } from '@/lib/company-access/catalog-release';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { runHealthChecks } from '@/lib/ops/health';
import { getCatalogManifest } from '@/lib/company-access/release-manifest';

// 死活監視用。認証なし・キャッシュなし。返すのは ok / ng と版・時刻だけ（docs/launch/MONITORING.md）。
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HEADERS = { 'Cache-Control': 'no-store, max-age=0', 'Content-Type': 'application/json' };

export async function GET() {
  const version = (await getRuntimeEnvValue('APP_VERSION')) ?? (await getRuntimeEnvValue('NEXT_PUBLIC_APP_VERSION'));
  const manifest = await getCatalogManifest();
  const report = await runHealthChecks({
    pingDatabase: () => queryD1('SELECT 1 AS ok'),
    readCatalogCount: async () => (await readReleaseSummaries()).length,
    expectedCatalogCount: manifest.publishedCount,
    version: version ?? '',
    releaseHash: manifest.summaries.hash,
  });
  // 監視サービスが状態コードだけで判定できるように、異常は 503
  return new NextResponse(JSON.stringify(report), { status: report.status === 'ok' ? 200 : 503, headers: HEADERS });
}

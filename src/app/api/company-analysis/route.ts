import { NextResponse } from 'next/server';
import { authorizePro } from '@/lib/payments/entitlement';
import { CatalogUnavailableError, findReleaseEntity } from '@/lib/company-access/catalog-release';
import { isCatalogId } from '@/shared/catalog-membership';
import { parseCompanyAnalysis } from '@/lib/company-access/schema';
import { hasUnverifiedAiNarrative } from '@/lib/company-access/natural-text';

export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
});
export async function GET(request: Request) {
  const access = await authorizePro(request);
  if (access.status !== 200) return response({ error: 'Analysis access unavailable' }, access.status);
  const id = new URL(request.url).searchParams.get('entity_id');
  if (!id || id.length > 200) return response({ error: 'Invalid entity' }, 400);
  try {
    // 公開目録にある事例だけ。目録外は R2 も読まずに 404
    if (!isCatalogId(id)) return response({ error: 'Analysis not found' }, 404);
    const entity = await findReleaseEntity(id);
    // 再監査で「AI生成・未検証」と記録された分析は販売しない
    if (!entity?.meta || hasUnverifiedAiNarrative(entity)) return response({ error: 'Analysis not found' }, 404);
    return response({ entityId: id, meta: parseCompanyAnalysis(entity.meta) });
  } catch (error) {
    if (!(error instanceof CatalogUnavailableError)) console.warn('[company-analysis] failed', error);
    return response({ error: 'Analysis temporarily unavailable' }, 503);
  }
}

import { NextResponse } from 'next/server';
import { authorizePro } from '@/lib/payments/entitlement';
import { findInstitutionalEntity } from '@/platform/data/mockLedgerData';
import { readFoundationBusinessCase } from '@/lib/foundation/business-reader';
import { adaptFoundationDetailToFinancialEntity } from '@/lib/foundation/foundation-adapter';
import { parseCompanyAnalysis } from '@/lib/company-access/schema';

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
    let entity = findInstitutionalEntity(id);
    if (!entity) {
      const detail = await readFoundationBusinessCase(id);
      if (detail) entity = adaptFoundationDetailToFinancialEntity(detail);
    }
    if (!entity?.meta) return response({ error: 'Analysis not found' }, 404);
    return response({ entityId: id, meta: parseCompanyAnalysis(entity.meta) });
  } catch { return response({ error: 'Analysis temporarily unavailable' }, 503); }
}

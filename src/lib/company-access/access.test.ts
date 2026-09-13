import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ status: 403 as 200 | 401 | 403 | 503 }));
vi.mock('@/lib/payments/entitlement', () => ({ authorizePro: vi.fn(async () => ({ status: state.status, uid: 'test' })) }));
vi.mock('@/lib/foundation/business-reader', () => ({ readFoundationBusinessCase: vi.fn(async () => null) }));
import { GET } from '@/app/api/company-analysis/route';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { publicEntity, publicFoundationData } from './public-entity';
import { parseCompanyAnalysis } from './schema';
const entity = INSTITUTIONAL_ENTITIES.find((item) => item.meta)!;
beforeEach(() => { state.status = 403; });
describe('server-only premium delivery', () => {
  it.each([401, 403, 503] as const)('never delivers text for access status %s', async (status) => {
    state.status = status;
    const result = await GET(new Request(`https://example.test/api/company-analysis?entity_id=${entity.id}`));
    expect(result.status).toBe(status);
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(await result.text()).not.toContain('meta');
  });
  it('delivers validated content only after current server authorization', async () => {
    state.status = 200;
    const result = await GET(new Request(`https://example.test/api/company-analysis?entity_id=${entity.id}`));
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(parseCompanyAnalysis(body.meta)).toEqual(entity.meta);
  });
  it('removes paid data from public records and nested Foundation dossiers', () => {
    expect(publicEntity(entity).meta).toBeUndefined();
    expect(publicEntity(entity).hasPremiumAnalysis).toBe(true);
    expect(publicFoundationData({ nested: [{ dossier: entity }] })).toEqual({ nested: [{ dossier: Object.fromEntries(Object.entries(entity).filter(([key]) => key !== 'meta')) }] });
    expect(entity.meta).toBeDefined();
  });
});

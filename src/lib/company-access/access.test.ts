import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ status: 403 as 200 | 401 | 403 | 503 }));
vi.mock('@/lib/payments/entitlement', () => ({ authorizePro: vi.fn(async () => ({ status: state.status, uid: 'test' })) }));
const found = vi.hoisted(() => ({ entity: null as unknown }));
vi.mock('@/lib/company-access/catalog-release', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/company-access/catalog-release')>()),
  findReleaseEntity: vi.fn(async () => found.entity),
}));
import manifest from '../../../data/catalog-release.json';
import { GET } from '@/app/api/company-analysis/route';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { publicEntity, publicFoundationData } from './public-entity';
import { parseCompanyAnalysis } from './schema';
const PUBLISHED_ID = Object.keys(manifest.details)[0];
const entity = { ...INSTITUTIONAL_ENTITIES.find((item) => item.meta)!, id: PUBLISHED_ID };
beforeEach(() => { state.status = 403; found.entity = entity; });
describe('server-only premium delivery', () => {
  it('目録に無い事例は、権限があっても 404', async () => {
    state.status = 200;
    const result = await GET(new Request('https://example.test/api/company-analysis?entity_id=ent_not_in_catalog'));
    expect(result.status).toBe(404);
  });
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

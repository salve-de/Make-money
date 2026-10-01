import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../../../../data/catalog-release.json';

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  summaries: vi.fn(),
}));

vi.mock('@/lib/company-access/local-entity-index', () => ({
  findCachedPublishableEntity: mocks.find,
}));
vi.mock('@/lib/company-access/catalog-release', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/company-access/catalog-release')>();
  return { ...actual, readReleaseSummaries: mocks.summaries };
});
vi.mock('@/lib/company-access/projection-cache', () => ({ cachedPublicEntity: (value: unknown) => value }));

import { GET } from './route';

const [PUBLISHED_ID, PUBLISHED_HASH] = Object.entries(manifest.details)[0] as [string, string];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('/api/businesses は公開目録だけを返す', () => {
  it('目録に無い ID は保存先を読まずに 404', async () => {
    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_not_in_catalog'));
    expect(response.status).toBe(404);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('目録にある ID は公開版を返し、static_fallback を名乗らない', async () => {
    mocks.find.mockResolvedValue({ id: PUBLISHED_ID, name: 'X', latestDossierHash: PUBLISHED_HASH, sourceRevision: 1 });
    const response = await GET(new Request(`http://localhost/api/businesses?entity_id=${PUBLISHED_ID}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.source).toBe('catalog_release');
    expect(JSON.stringify(body)).not.toContain('static_fallback');
  });

  it('目録のハッシュと違う dossier_hash は 404', async () => {
    const response = await GET(new Request(`http://localhost/api/businesses?entity_id=${PUBLISHED_ID}&dossier_hash=${'b'.repeat(64)}`));
    expect(response.status).toBe(404);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('目録のハッシュと一致する dossier_hash は公開版を返す', async () => {
    mocks.find.mockResolvedValue({ id: PUBLISHED_ID, name: 'X', latestDossierHash: PUBLISHED_HASH, sourceRevision: 1 });
    const response = await GET(new Request(`http://localhost/api/businesses?entity_id=${PUBLISHED_ID}&dossier_hash=${PUBLISHED_HASH}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Dossier-Hash')).toBe(PUBLISHED_HASH);
  });

  it('一覧は目録外の行を落とす', async () => {
    mocks.summaries.mockResolvedValue([
      { id: PUBLISHED_ID, name: 'in', tagline: '' },
      { id: 'ent_not_in_catalog', name: 'out', tagline: '' },
    ]);
    const response = await GET(new Request('http://localhost/api/businesses'));
    const body = await response.json();
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([PUBLISHED_ID]);
    expect(body.source).toBe('catalog_release');
  });

  it('目録を読めない時は 503（見本には落ちない）', async () => {
    const { CatalogUnavailableError } = await import('@/lib/company-access/catalog-release');
    mocks.summaries.mockRejectedValue(new CatalogUnavailableError('down'));
    const response = await GET(new Request('http://localhost/api/businesses'));
    expect(response.status).toBe(503);
  });
});

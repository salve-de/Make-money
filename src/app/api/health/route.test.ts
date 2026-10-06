import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), env: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: mocks.query }));
vi.mock('@/lib/company-access/catalog-release', () => ({ readReleaseSummaries: mocks.read }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: mocks.env }));
import manifest from '../../../../data/catalog-release.json';
import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    mocks.query.mockResolvedValue([{ ok: 1 }]);
    mocks.read.mockResolvedValue(Array.from({ length: manifest.publishedCount }, (_, i) => ({ id: `ent_${i}` })));
    mocks.env.mockResolvedValue('v-test');
  });

  it('正常なら 200 で、キャッシュ無効、ok と版と時刻だけを返す', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(Object.keys(body).sort()).toEqual(['checks', 'release', 'status', 'time', 'version']);
    expect(body.release).toBe(manifest.summaries.hash.slice(0, 12));
    expect(body).toMatchObject({ status: 'ok', version: 'v-test', checks: { database: 'ok', catalog: 'ok' } });
    expect(mocks.query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('D1 が落ちていれば 503 で、内部の文言は出さない', async () => {
    mocks.query.mockRejectedValue(new Error('Application database is unavailable: account 123'));
    const response = await GET();
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).not.toContain('account 123');
    expect(JSON.parse(text).checks).toEqual({ database: 'ng', catalog: 'ok' });
  });

  it('カタログが読めなければ 503', async () => {
    mocks.read.mockRejectedValue(new Error('Catalog release is unavailable'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.catalog).toBe('ng');
  });
});

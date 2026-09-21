import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/lib/company-access/local-entity-index', () => ({ readCachedLocalPublishableEntities: mocks.read }));
import { GET } from './route';

describe('catalog paging and search', () => {
  beforeEach(() => { mocks.read.mockResolvedValue(Array.from({ length: 205 }, (_, i) => ({
    id: `ent_${i}`, name: `Company ${i}`, ticker: `C${i}`, tags: [], strategy: { blindspot: `Opportunity ${i}` },
    meta: { private: 'never deliver' },
  } as unknown as FinancialEntity))); });
  it('pages the entire catalog without duplicate or omitted IDs', async () => {
    const first = await (await GET(new Request('http://localhost/api/catalog'))).json();
    const second = await (await GET(new Request(`http://localhost/api/catalog?offset=100&generation=${first.generation}`))).json();
    const last = await (await GET(new Request('http://localhost/api/catalog?offset=200'))).json();
    expect(first.data).toHaveLength(100);
    expect(first.data[0]).not.toHaveProperty('meta');
    expect(last.nextOffset).toBeNull();
    expect(new Set([...first.data, ...second.data, ...last.data].map((row: FinancialEntity) => row.id)).size).toBe(205);
  });
  it('accepts a smaller client page size for bounded browser responses', async () => {
    const result = await (await GET(new Request('http://localhost/api/catalog?pageSize=25'))).json();
    expect(result.data).toHaveLength(25);
    expect(result.nextOffset).toBe(25);
  });
  it('searches outside the initial page', async () => {
    const result = await (await GET(new Request('http://localhost/api/catalog?q=Company%20204'))).json();
    expect(result.data.map((row: FinancialEntity) => row.id)).toEqual(['ent_204']);
  });
  it('applies filters to the full catalog, not the first page', async () => {
    const rows = await mocks.read();
    rows[204].scale = 'SOLO';
    rows[204].batchId = 'late-batch';
    rows[204].tags = ['special'];
    const filters = { filter: 'SOLO', batch: 'late-batch', tags: ['special'], bookmarks: [], screener: null };
    const params = new URLSearchParams({ filters: JSON.stringify(filters) });
    const result = await (await GET(new Request(`http://localhost/api/catalog?${params}`))).json();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('ent_204');
  });
  it('shares compact-name and founder search with the UI', async () => {
    const rows = await mocks.read();
    rows[204].name = 'Photo AI';
    rows[204].founder = 'Example Founder';
    for (const q of ['photoai', 'example founder', 'ent_204']) {
      const result = await (await GET(new Request(`http://localhost/api/catalog?q=${encodeURIComponent(q)}`))).json();
      expect(result.data.map((row: FinancialEntity) => row.id)).toEqual(['ent_204']);
    }
  });
  it('rejects malformed filters', async () => {
    for (const filters of ['null', '{', JSON.stringify({ filter: 'bad' })]) {
      expect((await GET(new Request(`http://localhost/api/catalog?filters=${encodeURIComponent(filters)}`))).status).toBe(400);
    }
  });
  it('rejects stale generations and bad offsets', async () => {
    expect((await GET(new Request('http://localhost/api/catalog?generation=old'))).status).toBe(409);
    expect((await GET(new Request('http://localhost/api/catalog?offset=-1'))).status).toBe(400);
  });
  it('reports unavailable storage instead of pretending the small fallback is complete', async () => {
    mocks.read.mockRejectedValue(new Error('missing object'));
    expect((await GET(new Request('http://localhost/api/catalog'))).status).toBe(503);
  });
});

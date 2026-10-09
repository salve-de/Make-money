import { describe, expect, it, vi } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { decodeFacets } from '@/platform/model/facet-wire';
vi.mock('@/lib/company-access/local-entity-index', () => ({
  readCachedLocalPublishableEntities: async () => [{
    id: 'a', scale: 'SOLO', pnl: { operatingMargin: 60 }, operations: { initialCapitalRequired: 0, isCapitalUnconfirmed: false },
    strategy: { moatType: 'SWITCHING_COST' }, reader: { display: { tags: { field: '開発・IT', form: 'ソフト・アプリ', buyer: '個人向け', features: [] } } },
  } as unknown as FinancialEntity],
}));
import { GET } from './route';

describe('/api/catalog/facets', () => {
  it('公開中の全件の最小の値を返す', async () => {
    const body = await (await GET()).json();
    const rows = decodeFacets(body);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toMatchObject({ scale: 'SOLO', margin: 60, capital: 0, moat: 'SWITCHING_COST' });
    expect(rows?.[0].words).toContain('開発・IT');
    expect(JSON.stringify(body)).not.toContain('"id"');
  });
});

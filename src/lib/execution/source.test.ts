import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../../../data/catalog-release.json';

const state = vi.hoisted(() => ({ local: vi.fn() }));
vi.mock('@/lib/company-access/local-entity-index', () => ({ findCachedPublishableEntity: state.local }));
import { findExecutionSource } from './source';

const PUBLISHED_ID = Object.keys(manifest.details)[0];

describe('execution identity は公開目録だけ', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.local.mockResolvedValue(null);
  });
  it('目録に無い ID は保存先を読まずに null', async () => {
    expect(await findExecutionSource('ent_unknown')).toBeNull();
    expect(state.local).not.toHaveBeenCalled();
  });
  it('目録にあっても詳細が読めなければ null', async () => {
    expect(await findExecutionSource(PUBLISHED_ID)).toBeNull();
  });
  it('目録の事例から、財務・有料の項目を除いた元データを作る', async () => {
    state.local.mockResolvedValue({ id: PUBLISHED_ID, name: 'Known', pnl: { monthlyRevenue: 42 },
      meta: { private: true }, strategy: { blindspot: 'hint' } });
    const source = await findExecutionSource(PUBLISHED_ID);
    expect(source).toMatchObject({ id: PUBLISHED_ID });
    expect(source).not.toHaveProperty('strategy');
    expect(source).not.toHaveProperty('pnl');
    expect(source).not.toHaveProperty('meta');
  });
});

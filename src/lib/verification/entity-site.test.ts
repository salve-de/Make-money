import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../../../data/catalog-release.json';

const mocks = vi.hoisted(() => ({ findCurated: vi.fn() }));
vi.mock('@/lib/company-access/local-entity-index', () => ({ findCachedPublishableEntity: mocks.findCurated }));

import { findEntitySite } from './entity-site';

const PUBLISHED_ID = Object.keys(manifest.details)[0];

beforeEach(() => {
  mocks.findCurated.mockReset().mockResolvedValue(null);
});

describe('findEntitySite', () => {
  it('目録の事例の正式 ID と公式サイトを返す（大文字小文字は直す）', async () => {
    mocks.findCurated.mockResolvedValue({ id: PUBLISHED_ID, url: 'https://example.com' });
    expect(await findEntitySite(PUBLISHED_ID.toUpperCase())).toEqual({ entityId: PUBLISHED_ID, url: 'https://example.com' });
  });
  it('公式サイトが無ければ url は null', async () => {
    mocks.findCurated.mockResolvedValue({ id: PUBLISHED_ID, url: '   ' });
    expect(await findEntitySite(PUBLISHED_ID)).toEqual({ entityId: PUBLISHED_ID, url: null });
  });
  it('目録に無い ID は何も読まずに null', async () => {
    expect(await findEntitySite('ent_hidden')).toBeNull();
    expect(mocks.findCurated).not.toHaveBeenCalled();
  });
  it('目録にあっても詳細が無ければ null', async () => {
    expect(await findEntitySite(PUBLISHED_ID)).toBeNull();
  });
  it('読み込みの失敗は隠さない', async () => {
    mocks.findCurated.mockRejectedValue(new Error('catalog unavailable'));
    await expect(findEntitySite(PUBLISHED_ID)).rejects.toThrow('catalog unavailable');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCurated: vi.fn(),
  readSummary: vi.fn(),
}));
vi.mock('@/lib/company-access/local-entity-index', () => ({ findCachedPublishableEntity: mocks.findCurated }));
vi.mock('@/lib/foundation/make-money-view', () => ({ readMakeMoneyPublicEntitySummaryById: mocks.readSummary }));

import { findEntitySite } from './entity-site';

const FOUNDATION_ID = `ent_acme_${'a1b2c3d4e5'.repeat(2)}`;

beforeEach(() => {
  mocks.findCurated.mockReset().mockResolvedValue(null);
  mocks.readSummary.mockReset().mockResolvedValue(null);
});

describe('findEntitySite', () => {
  it('returns the canonical id and official site of a published case', async () => {
    mocks.findCurated.mockResolvedValue({ id: 'ent_photoai', url: 'https://photoai.com' });
    expect(await findEntitySite('ENT_PHOTOAI')).toEqual({ entityId: 'ent_photoai', url: 'https://photoai.com' });
    expect(mocks.findCurated).toHaveBeenCalledWith('ENT_PHOTOAI');
    expect(mocks.readSummary).not.toHaveBeenCalled();
  });

  it('returns a null site for a published case without an official URL', async () => {
    mocks.findCurated.mockResolvedValue({ id: 'ent_nosite', url: '   ' });
    expect(await findEntitySite('ent_nosite')).toEqual({ entityId: 'ent_nosite', url: null });
  });

  it('returns null when the case is not published', async () => {
    expect(await findEntitySite('ent_hidden')).toBeNull();
    expect(mocks.readSummary).not.toHaveBeenCalled();
  });

  it('falls back to the rights-cleared public view for a collected case, using its domain', async () => {
    mocks.readSummary.mockResolvedValue({ id: FOUNDATION_ID, domain: 'acme.example' });
    expect(await findEntitySite(FOUNDATION_ID)).toEqual({ entityId: FOUNDATION_ID, url: 'https://acme.example' });
    expect(mocks.readSummary).toHaveBeenCalledWith(FOUNDATION_ID);
  });

  it('returns a null site for a collected case without a domain', async () => {
    mocks.readSummary.mockResolvedValue({ id: FOUNDATION_ID, domain: null });
    expect(await findEntitySite(FOUNDATION_ID)).toEqual({ entityId: FOUNDATION_ID, url: null });
  });

  it('returns null when neither source has the case', async () => {
    expect(await findEntitySite(FOUNDATION_ID)).toBeNull();
  });

  it('does not query the public view for ids that are not collection ids', async () => {
    expect(await findEntitySite('ent_short')).toBeNull();
    expect(await findEntitySite(FOUNDATION_ID.toUpperCase())).toBeNull();
    expect(mocks.readSummary).not.toHaveBeenCalled();
  });

  it('treats a missing storage configuration (local development) as not found', async () => {
    mocks.readSummary.mockRejectedValue(Object.assign(new Error('not configured'), { code: 'R2_NOT_CONFIGURED' }));
    expect(await findEntitySite(FOUNDATION_ID)).toBeNull();
  });

  it('does not hide other storage failures', async () => {
    mocks.readSummary.mockRejectedValue(new Error('R2 unavailable'));
    await expect(findEntitySite(FOUNDATION_ID)).rejects.toThrow('R2 unavailable');
    mocks.findCurated.mockRejectedValue(new Error('catalog unavailable'));
    await expect(findEntitySite('ent_any')).rejects.toThrow('catalog unavailable');
  });
});

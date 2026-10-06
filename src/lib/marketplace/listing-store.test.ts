import { beforeEach, expect, it, vi } from 'vitest';
import { listPublishedMarketplaceListings, parseMarketplaceOffset } from './listing-store';
const query = vi.hoisted(() => vi.fn());
vi.mock('@/lib/storage/d1', () => ({ queryD1: query }));
const rows = Array.from({ length: 61 }, (_, index) => ({
  id: `listing-${index}`, sessionId: null, sourceType: 'external', slug: `service-${index}`,
  title: 'Service', summary: 'Useful service', category: 'other', productUrl: 'https://example.com',
  checkoutUrl: null, priceLabel: '', sellerName: '', status: 'published', reviewNote: null, createdAt: '2026-09-28', updatedAt: '2026-09-28',
}));
beforeEach(() => { query.mockReset().mockImplementation(async (_sql, [limit, offset], parse) => rows.slice(offset, offset + limit).map(parse)); });
it('requests a sentinel row and stable ordering, then exposes the 61st listing on the next page', async () => {
  const first = await listPublishedMarketplaceListings();
  expect(first.listings).toHaveLength(60);
  expect(first.listings[0]).not.toHaveProperty('userId');
  expect(first.listings[0]).not.toHaveProperty('listingId');
  expect(first.listings[0]).not.toHaveProperty('sessionId');
  expect(first.hasMore).toBe(true);
  expect(first.nextOffset).toBe(60);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?'), [61, 0], expect.any(Function));
  const last = await listPublishedMarketplaceListings(60, first.nextOffset!);
  expect(last.listings.map(row => row.slug)).toEqual(['service-60']);
  expect(last.hasMore).toBe(false);
  expect(last.nextOffset).toBeNull();
});
it('returns an empty terminal page', async () => {
  expect(await listPublishedMarketplaceListings(60, 120)).toEqual({ listings: [], hasMore: false, nextOffset: null });
});
it.each([-1, NaN, Infinity, 1.5, 2_147_483_001])('rejects invalid store offset %s before SQL', async offset => {
  await expect(listPublishedMarketplaceListings(60, offset)).rejects.toThrow('Invalid marketplace pagination');
  expect(query).not.toHaveBeenCalled();
});
it.each([0, -1, 101, NaN, 1.5])('rejects unbounded/invalid limit %s', async limit => {
  await expect(listPublishedMarketplaceListings(limit)).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();
});
it.each(['-1', '1.5', '1e2', '', '01', 'Infinity', '2147483001', ['0', '60']].map(value => ({ value })))('rejects invalid URL offset $value', ({ value }) => {
  expect(() => parseMarketplaceOffset(value)).toThrow();
});
it('accepts absent, first and subsequent page offsets', () => {
  expect(parseMarketplaceOffset(undefined)).toBe(0);
  expect(parseMarketplaceOffset('0')).toBe(0);
  expect(parseMarketplaceOffset('60')).toBe(60);
});

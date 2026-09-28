import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: { uid: 'seller-1' } as { uid: string } | null,
  getBuildSession: vi.fn(),
  getOwnedBySession: vi.fn(),
  getOwnedById: vi.fn(),
  execute: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({
  verifyFirebaseIdToken: async () => state.user,
}));
vi.mock('@/lib/builder/session', () => ({
  getOwnedBuildSession: state.getBuildSession,
}));
vi.mock('@/lib/marketplace/listing-store', () => ({
  getOwnedMarketplaceListing: state.getOwnedBySession,
  getOwnedMarketplaceListingById: state.getOwnedById,
}));
vi.mock('@/lib/storage/d1', () => ({
  executeD1: state.execute,
}));
vi.mock('@/lib/security/rate-limit', () => ({
  consumeRequestRateLimit: state.rateLimit,
}));

import { PUT } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/marketplace/listings', {
    method: 'PUT',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { uid: 'seller-1' };
  state.getBuildSession.mockReset();
  state.getOwnedBySession.mockReset().mockResolvedValue(null);
  state.getOwnedById.mockReset().mockResolvedValue({
    listingId: 'listing-1',
    sourceType: 'external',
    sessionId: null,
    slug: 'my-service-a1b2c3d4',
    title: 'My Service',
    summary: 'A useful product for independent creators.',
    category: 'business_tool',
    productUrl: 'https://maker.example/',
    checkoutUrl: null,
    priceLabel: '',
    sellerName: '',
    status: 'published',
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
  });
  state.execute.mockReset().mockResolvedValue({ changes: 1 });
  state.rateLimit.mockReset().mockResolvedValue(true);
});

describe('PUT /api/marketplace/listings external product', () => {
  it('publishes an external HTTPS product without requiring a Builder session', async () => {
    const response = await PUT(request({
      sourceType: 'external',
      title: 'My Service',
      summary: 'A useful product for independent creators.',
      category: 'business_tool',
      productUrl: 'https://maker.example',
      checkoutUrl: '',
      priceLabel: '',
      sellerName: '',
      status: 'published',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, listing: { sourceType: 'external', sessionId: null } });
    expect(state.getBuildSession).not.toHaveBeenCalled();
    expect(state.execute).toHaveBeenCalledOnce();
    const [sql, params] = state.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('source_type');
    expect(params[1]).toBe('seller-1');
    expect(params[2]).toBeNull();
    expect(params[3]).toBe('external');
  });
});

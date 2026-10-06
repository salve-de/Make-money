import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ verify: vi.fn(), rate: vi.fn(), store: vi.fn() }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: mocks.verify }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: mocks.rate }));
vi.mock('@/lib/payments/entitlement', () => ({ assertPaymentStoreAvailable: mocks.store }));
vi.mock('@/lib/stripe', () => ({ getStripeClient: vi.fn(async () => null) }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: vi.fn(async () => undefined) }));

import { POST } from './route';

const call = () => POST(new Request('http://localhost/api/checkout', {
  method: 'POST',
  headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
  body: JSON.stringify({ product: 'nope' }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue({ uid: 'u1', email: 'a@example.com' });
  mocks.store.mockResolvedValue(undefined);
  mocks.rate.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/checkout の回数上限', () => {
  it('上限を超えたら 429 を返し、決済画面の処理に進まない', async () => {
    mocks.rate.mockResolvedValue(false);
    const response = await call();
    expect(response.status).toBe(429);
    expect(mocks.rate).toHaveBeenCalledWith(expect.anything(), 'checkout-session', expect.objectContaining({ subject: 'u1' }));
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('回数を数えられなくても、正規の購入は止めない', async () => {
    mocks.rate.mockRejectedValue(new Error('D1 offline'));
    const response = await call();
    expect(response.status).toBe(400); // 上限では止まらず、次の検証（不明なプラン）まで進む
  });
});

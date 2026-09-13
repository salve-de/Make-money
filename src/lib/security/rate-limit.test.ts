import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/lib/storage/d1', () => ({ queryD1: query }));
import { consumeRequestRateLimit } from './rate-limit';

afterEach(() => query.mockReset());

it('uses a one-way client key and returns the persisted count decision', async () => {
  query.mockResolvedValue([{ requestCount: 1 }]);
  const request = new NextRequest('http://localhost/api/write', { headers: { 'cf-connecting-ip': '203.0.113.10' } });
  await expect(consumeRequestRateLimit(request, 'submission-create', { limit: 2, windowMs: 60_000 })).resolves.toBe(true);
  expect(query).toHaveBeenCalledOnce();
  const params = query.mock.calls[0][1] as (string | number)[];
  expect(params[0]).toMatch(/^submission-create:[0-9a-f]{64}$/);
  expect(params[0]).not.toContain('203.0.113.10');
});

it('rejects a request after the durable window count exceeds the limit', async () => {
  query.mockResolvedValue([{ requestCount: 4 }]);
  const request = new Request('http://localhost/api/write');
  await expect(consumeRequestRateLimit(request, 'newsletter-subscribe', { limit: 3 })).resolves.toBe(false);
});

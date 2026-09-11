import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ingest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: vi.fn(async () => 'test-only-token') }));
vi.mock('@/lib/foundation/ingest', () => ({
  ingestFoundationResearch: ingest,
  FoundationBundleValidationError: class extends Error {},
  FoundationIngestAuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage/r2', () => ({
  R2BucketMissingError: class extends Error {},
  R2ConfigurationError: class extends Error {},
  R2ObjectConflictError: class extends Error {},
}));
import { POST } from '@/app/api/foundation/ingest/route';

it('returns 400 for malformed authorized JSON before invoking any ingest operation', async () => {
  const response = await POST(new NextRequest('http://localhost/api/foundation/ingest', {
    method: 'POST', headers: { 'x-foundation-ingest-token': 'test-only-token' }, body: '{',
  }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Invalid JSON request body' });
  expect(ingest).not.toHaveBeenCalled();
});

it('preserves authorization before parsing JSON', async () => {
  const response = await POST(new NextRequest('http://localhost/api/foundation/ingest', { method: 'POST', body: '{' }));
  expect(response.status).toBe(401);
  expect(ingest).not.toHaveBeenCalled();
});

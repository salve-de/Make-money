import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { approveLocalEntities, ApprovalStoreError } from '@/lib/storage/local-entity-approvals';
vi.mock('@/lib/storage/local-entity-approvals', () => ({
  approveLocalEntities: vi.fn(),
  ApprovalStoreError: class extends Error { constructor(message: string, readonly status: number) { super(message); } },
}));
const store = vi.mocked(approveLocalEntities);
const request = (body: unknown, url = 'http://localhost:3000/api/entities/approve', origin?: string) => new NextRequest(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body),
});
beforeEach(() => { vi.stubEnv('NODE_ENV', 'development'); store.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe('approval API acknowledgement', () => {
  it('returns only the persisted acknowledgement', async () => {
    store.mockResolvedValue({ approvedCount: 2, entityIds: ['a', 'b'], updated: true });
    const response = await POST(request({ entityIds: ['A', 'b'] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, entityIds: ['a', 'b'], approvedCount: 2 });
    expect(store).toHaveBeenCalledTimes(1);
  });
  it.each([404, 409, 503] as const)('returns %s for persistence failure, never success:true', async (status) => {
    store.mockRejectedValue(new ApprovalStoreError('not persisted', status));
    const response = await POST(request({ entityId: 'a' }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ success: false });
  });
  it.each([null, {}, { entityIds: [null] }, { entityIds: [''] }, { entityIds: ['a'.repeat(257)] }])('rejects invalid input without writing', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(store).not.toHaveBeenCalled();
  });
  it('rejects oversized bodies', async () => {
    expect((await POST(request({ entityId: 'a'.repeat(300000) }))).status).toBe(413);
    expect(store).not.toHaveBeenCalled();
  });
  it('blocks packaged production, remote hosts, and cross-origin writes', async () => {
    expect((await POST(request({ entityId: 'a' }, 'https://example.com/api/entities/approve'))).status).toBe(403);
    expect((await POST(request({ entityId: 'a' }, undefined, 'https://example.com'))).status).toBe(403);
    vi.stubEnv('NODE_ENV', 'production');
    expect((await POST(request({ entityId: 'a' }))).status).toBe(403);
    expect(store).not.toHaveBeenCalled();
  });
});

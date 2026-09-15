import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { queryD1 } from '@/lib/storage/d1';
import { approveLocalEntities, ApprovalStoreError } from '@/lib/storage/local-entity-approvals';
import { approveD1Entities, EntityApprovalStoreError, listD1ApprovedEntityIds } from '@/lib/storage/entity-approvals';

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: vi.fn() }));
vi.mock('@/lib/storage/local-entity-approvals', () => ({
  approveLocalEntities: vi.fn(),
  ApprovalStoreError: class extends Error { constructor(message: string, readonly status: number) { super(message); } },
}));
vi.mock('@/lib/storage/entity-approvals', () => ({
  approveD1Entities: vi.fn(),
  listD1ApprovedEntityIds: vi.fn(),
  EntityApprovalStoreError: class extends Error { constructor(message: string, readonly status = 503) { super(message); } },
}));

const localStore = vi.mocked(approveLocalEntities);
const d1Store = vi.mocked(approveD1Entities);
const d1List = vi.mocked(listD1ApprovedEntityIds);
const verify = vi.mocked(verifyFirebaseIdToken);
const roles = vi.mocked(queryD1);

const request = (
  body: unknown,
  url = 'http://localhost:3000/api/entities/approve',
  headers: Record<string, string> = {},
) => new NextRequest(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  localStore.mockReset();
  d1Store.mockReset();
  d1List.mockReset();
  verify.mockReset();
  roles.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('approval API acknowledgement', () => {
  it('keeps local development on the atomic fixture adapter', async () => {
    localStore.mockResolvedValue({ approvedCount: 2, entityIds: ['a', 'b'], updated: true });
    const response = await POST(request({ entityIds: ['A', 'b'] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, entityIds: ['a', 'b'], approvedCount: 2 });
    expect(localStore).toHaveBeenCalledTimes(1);
    expect(d1Store).not.toHaveBeenCalled();
  });

  it.each([404, 409, 503] as const)('returns %s for local persistence failure, never success:true', async (status) => {
    localStore.mockRejectedValue(new ApprovalStoreError('not persisted', status));
    const response = await POST(request({ entityId: 'a' }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ success: false });
  });

  it.each([null, {}, { entityIds: [null] }, { entityIds: [''] }, { entityIds: ['../../etc/passwd'] }, { entityIds: ['a'.repeat(201)] }])(
    'rejects invalid input without writing',
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(localStore).not.toHaveBeenCalled();
      expect(d1Store).not.toHaveBeenCalled();
    },
  );

  it('rejects oversized bodies', async () => {
    expect((await POST(request({ entityId: 'a'.repeat(300000) }))).status).toBe(413);
    expect(localStore).not.toHaveBeenCalled();
  });

  it('blocks cross-origin writes before any persistence or authentication', async () => {
    const response = await POST(request({ entityId: 'a' }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://evil.example.com',
    }));
    expect(response.status).toBe(403);
    expect(localStore).not.toHaveBeenCalled();
    expect(d1Store).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('requires a verified production identity', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const url = 'https://app.example.com/api/entities/approve';
    expect((await POST(request({ entityId: 'a' }, url, { origin: 'https://app.example.com' }))).status).toBe(401);
    verify.mockResolvedValue(null);
    expect((await POST(request({ entityId: 'a' }, url, {
      origin: 'https://app.example.com', authorization: 'Bearer invalid',
    }))).status).toBe(401);
    expect(d1Store).not.toHaveBeenCalled();
  });

  it('requires the D1 admin role in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    verify.mockResolvedValue({ uid: 'member-1', claims: {} });
    roles.mockResolvedValue([{ role: 'member' }]);
    const response = await POST(request({ entityId: 'a' }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://app.example.com', authorization: 'Bearer valid',
    }));
    expect(response.status).toBe(403);
    expect(d1Store).not.toHaveBeenCalled();
  });

  it('persists and read-back acknowledges an admin production approval in D1', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    verify.mockResolvedValue({ uid: 'admin-1', claims: {} });
    roles.mockResolvedValue([{ role: 'admin' }]);
    d1Store.mockResolvedValue({ approvedCount: 2, entityIds: ['a', 'b'], updated: true });
    const response = await POST(request({ entityIds: ['A', 'b'] }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://app.example.com', authorization: 'Bearer valid',
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, entityIds: ['a', 'b'], approvedCount: 2 });
    expect(d1Store).toHaveBeenCalledWith(['a', 'b'], 'admin-1');
    expect(localStore).not.toHaveBeenCalled();
  });

  it('never converts a production persistence failure into success', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    verify.mockResolvedValue({ uid: 'admin-1', claims: {} });
    roles.mockResolvedValue([{ role: 'admin' }]);
    d1Store.mockRejectedValue(new EntityApprovalStoreError('not persisted'));
    const response = await POST(request({ entityId: 'a' }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://app.example.com', authorization: 'Bearer valid',
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false });
  });

  it('publishes the global D1 approval overlay without exposing user data', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    d1List.mockResolvedValue(['a', 'b']);
    const response = await GET(new NextRequest('https://app.example.com/api/entities/approve'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, entityIds: ['a', 'b'] });
  });
});

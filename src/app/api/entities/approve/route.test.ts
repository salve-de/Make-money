import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { queryD1 } from '@/lib/storage/d1';
import { approveD1Entities, EntityApprovalStoreError, listD1ApprovedEntityIds } from '@/lib/storage/entity-approvals';

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: vi.fn() }));
vi.mock('@/lib/storage/entity-approvals', () => ({
  approveD1Entities: vi.fn(),
  listD1ApprovedEntityIds: vi.fn(),
  EntityApprovalStoreError: class extends Error { constructor(message: string, readonly status = 503) { super(message); } },
}));

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
  vi.stubEnv('MAKE_MONEY_LOCAL_EDITOR', '');
  d1Store.mockReset();
  d1List.mockReset();
  verify.mockReset();
  roles.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('approval API acknowledgement', () => {
  it('requires authentication even with MAKE_MONEY_LOCAL_EDITOR set', async () => {
    vi.stubEnv('MAKE_MONEY_LOCAL_EDITOR', '1');
    const response = await POST(request({ entityIds: ['A', 'b'] }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(d1Store).not.toHaveBeenCalled();
  });

  it('does not grant local-editor access from a localhost-shaped request alone', async () => {
    const response = await POST(request({ entityId: 'a' }, 'http://localhost:3000/api/entities/approve', {
      host: 'localhost:3000',
    }));
    expect(response.status).toBe(401);
    expect(d1Store).not.toHaveBeenCalled();
  });

  it.each([null, {}, { entityIds: [null] }, { entityIds: [''] }, { entityIds: ['../../etc/passwd'] }, { entityIds: ['a'.repeat(201)] }])(
    'rejects invalid input without writing',
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(d1Store).not.toHaveBeenCalled();
    },
  );

  it('rejects oversized bodies', async () => {
    expect((await POST(request({ entityId: 'a'.repeat(300000) }))).status).toBe(413);
  });

  it('blocks cross-origin writes before any persistence or authentication', async () => {
    const response = await POST(request({ entityId: 'a' }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://evil.example.com',
    }));
    expect(response.status).toBe(403);
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
  });

  it('accepts up to MAX_APPROVAL_IDS_PER_REQUEST explicit IDs and delegates bounded work to the D1 store', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    verify.mockResolvedValue({ uid: 'admin-1', claims: {} });
    roles.mockResolvedValue([{ role: 'admin' }]);
    const entityIds = Array.from({ length: 800 }, (_, index) => `ent-${index}`);
    d1Store.mockResolvedValue({ approvedCount: entityIds.length, entityIds, updated: true });

    const response = await POST(request({ entityIds }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://app.example.com', authorization: 'Bearer valid',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, approvedCount: 800, entityIds });
    expect(d1Store).toHaveBeenCalledWith(entityIds, 'admin-1');
  });

  it('rejects more than MAX_APPROVAL_IDS_PER_REQUEST explicit IDs', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const entityIds = Array.from({ length: 801 }, (_, index) => `ent-${index}`);
    const response = await POST(request({ entityIds }, 'https://app.example.com/api/entities/approve', {
      origin: 'https://app.example.com', authorization: 'Bearer valid',
    }));
    expect(response.status).toBe(400);
    expect(d1Store).not.toHaveBeenCalled();
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

  it('publishes the bounded D1 approval overlay for requested IDs without exposing user data', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    d1List.mockResolvedValue(['a', 'b']);
    const req = new NextRequest('https://app.example.com/api/entities/approve?entityId=a&entityId=b');
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, entityIds: ['a', 'b'] });
    expect(d1List).toHaveBeenCalledWith(['a', 'b']);
  });
});

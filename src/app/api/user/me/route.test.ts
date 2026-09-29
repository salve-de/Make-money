import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { executionOwnerKey } from '@/lib/execution/generation-store';

const state = vi.hoisted(() => ({
  user: { uid: 'owner-a' } as { uid: string } | null,
  batch: vi.fn(),
  execute: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({
  verifyFirebaseIdToken: async () => state.user,
}));

vi.mock('@/lib/storage/d1', () => ({
  batchD1: state.batch,
  executeD1: state.execute,
  queryD1: state.query,
}));

vi.mock('@/lib/payments/entitlement', () => ({
  getProEntitlement: async () => false,
}));

import { DELETE } from './route';

function request(auth = true) {
  return new NextRequest('http://localhost/api/user/me', {
    method: 'DELETE',
    headers: auth ? { Authorization: 'Bearer test' } : {},
  });
}

beforeEach(() => {
  state.user = { uid: 'owner-a' };
  state.batch.mockReset().mockResolvedValue([]);
  state.execute.mockReset();
  state.query.mockReset().mockImplementation(async (sql: string) => sql.includes('sqlite_master') ? [{ available: 1 }] : [{ users: 0, execution_projects: 0, marketplace_listings: 0, execution_generation: 1 }]);
});

describe('DELETE /api/user/me', () => {
  it('deletes execution projects in the same application-data transaction', async () => {
    const response = await DELETE(request());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, scope: 'application_data', executionGeneration: 1 });
    expect(typeof body.executionResetAt).toBe('string');
    const statements = state.batch.mock.calls[0]?.[0] as Array<{ sql: string; params: unknown[] }>;
    expect(statements).toEqual(expect.arrayContaining([
      { sql: 'DELETE FROM execution_projects WHERE user_id = ?', params: ['owner-a'] },
      { sql: 'DELETE FROM marketplace_listings WHERE user_id = ?', params: ['owner-a'] },
      expect.objectContaining({ sql: expect.stringContaining('execution_resets'), params: [executionOwnerKey('owner-a'), expect.any(String)] }),
      { sql: 'DELETE FROM users WHERE id = ?', params: ['owner-a'] },
    ]));
    expect(state.query).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*) FROM marketplace_listings WHERE user_id = ?'),
      ['owner-a', 'owner-a', 'owner-a', executionOwnerKey('owner-a')],
    );
  });

  it('fails closed when execution data remains after deletion', async () => {
    state.query.mockResolvedValueOnce([{ available: 1 }]).mockResolvedValueOnce([{ users: 0, execution_projects: 1, marketplace_listings: 0, execution_generation: 1 }]);

    const response = await DELETE(request());

    expect(response.status).toBe(503);
  });

  it('preserves account deletion before marketplace migration', async () => {
    state.query.mockResolvedValueOnce([{ available: 0 }]);
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    const statements = state.batch.mock.calls[0][0] as Array<{ sql: string }>;
    expect(statements.some(({ sql }) => sql.includes('marketplace_listings'))).toBe(false);
    expect(state.query.mock.calls[1][0]).not.toContain('FROM marketplace_listings');
  });

  it('deletes the revenue-verification rows that keep the user id, once migration 0012 exists', async () => {
    state.query.mockReset()
      .mockResolvedValueOnce([{ available: 1, verifications: 1 }])
      .mockResolvedValueOnce([{ users: 0, execution_projects: 0, marketplace_listings: 0, execution_generation: 1, verified_revenue: 0 }]);
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    const statements = state.batch.mock.calls[0][0] as Array<{ sql: string; params: unknown[] }>;
    expect(statements).toEqual(expect.arrayContaining([{ sql: 'DELETE FROM verified_revenue WHERE user_id = ?', params: ['owner-a'] }]));
    expect(state.query).toHaveBeenLastCalledWith(
      expect.stringContaining('COUNT(*) FROM verified_revenue WHERE user_id = ?'),
      ['owner-a', 'owner-a', 'owner-a', executionOwnerKey('owner-a'), 'owner-a'],
    );
  });

  it('fails closed when revenue-verification rows remain after deletion', async () => {
    state.query.mockReset()
      .mockResolvedValueOnce([{ available: 1, verifications: 1 }])
      .mockResolvedValueOnce([{ users: 0, execution_projects: 0, marketplace_listings: 0, execution_generation: 1, verified_revenue: 1 }]);
    expect((await DELETE(request())).status).toBe(503);
  });

  it('preserves account deletion before the revenue-verification migration', async () => {
    state.query.mockResolvedValueOnce([{ available: 1, verifications: 0 }]);
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    const statements = state.batch.mock.calls[0][0] as Array<{ sql: string }>;
    expect(statements.some(({ sql }) => sql.includes('verified_revenue'))).toBe(false);
    expect(state.query.mock.calls[1][0]).not.toContain('verified_revenue');
  });

  it('rejects an inconsistent schema readback without deleting anything', async () => {
    state.query.mockReset().mockResolvedValueOnce([{ available: 1, verifications: 2 }]);
    expect((await DELETE(request())).status).toBe(503);
    expect(state.batch).not.toHaveBeenCalled();
  });

  it('does not mutate data when schema inspection fails', async () => {
    state.query.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await DELETE(request())).status).toBe(503);
    expect(state.batch).not.toHaveBeenCalled();
  });

  it('does not touch application data without authentication', async () => {
    state.user = null;

    const response = await DELETE(request(false));

    expect(response.status).toBe(401);
    expect(state.batch).not.toHaveBeenCalled();
    expect(state.query).not.toHaveBeenCalled();
  });
});

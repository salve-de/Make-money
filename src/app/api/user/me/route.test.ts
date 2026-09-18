import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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
  state.query.mockReset().mockResolvedValue([{ users: 0, execution_projects: 0 }]);
});

describe('DELETE /api/user/me', () => {
  it('deletes execution projects in the same application-data transaction', async () => {
    const response = await DELETE(request());

    expect(response.status).toBe(200);
    const statements = state.batch.mock.calls[0]?.[0] as Array<{ sql: string; params: unknown[] }>;
    expect(statements).toEqual(expect.arrayContaining([
      { sql: 'DELETE FROM execution_projects WHERE user_id = ?', params: ['owner-a'] },
      { sql: 'DELETE FROM users WHERE id = ?', params: ['owner-a'] },
    ]));
    expect(state.query).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*) FROM execution_projects WHERE user_id = ?'),
      ['owner-a', 'owner-a'],
    );
  });

  it('fails closed when execution data remains after deletion', async () => {
    state.query.mockResolvedValue([{ users: 0, execution_projects: 1 }]);

    const response = await DELETE(request());

    expect(response.status).toBe(503);
  });

  it('does not touch application data without authentication', async () => {
    state.user = null;

    const response = await DELETE(request(false));

    expect(response.status).toBe(401);
    expect(state.batch).not.toHaveBeenCalled();
    expect(state.query).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: { uid: 'owner-a' } as { uid: string } | null,
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));

import { GET, PUT } from './route';

const validProject = {
  entityId: 'ent-photoai',
  sourceName: 'Photo AI',
  offerName: 'AI profile photo service',
  targetCustomer: 'People who need a better profile photo',
  targetPriceJpy: 3000,
  firstDollarTargetJpy: 1000,
  completedSteps: ['FIND', 'BUILD'],
  buildUrl: 'https://example.com/build',
  launchUrl: 'https://example.com',
  checkoutUrl: 'https://example.com/checkout',
  revenueJpy: 0,
  notes: 'Keep scope tiny',
};

function req(body?: unknown, auth = true, query = '') {
  return new NextRequest('http://localhost/api/execution-projects' + query, {
    method: body === undefined ? 'GET' : 'PUT',
    headers: auth ? { Authorization: 'Bearer test' } : {},
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  state.user = { uid: 'owner-a' };
  state.query.mockReset().mockResolvedValue([]);
  state.execute.mockReset().mockResolvedValue({ changes: 1 });
});

describe('execution projects', () => {
  it('reads only the verified owner', async () => {
    const response = await GET(req(undefined, true, '?entityId=ent-photoai&userId=owner-b'));
    expect(response.status).toBe(200);
    expect(state.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id=? AND entity_id=?'),
      ['owner-a', 'ent-photoai'],
      expect.any(Function),
    );
  });

  it('writes only under the verified owner', async () => {
    const response = await PUT(req(validProject));
    expect(response.status).toBe(200);
    expect(state.execute).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(user_id,entity_id)'),
      expect.arrayContaining(['owner-a', 'ent-photoai', 'Photo AI']),
    );
  });

  it('does not touch storage without a verified token', async () => {
    expect((await GET(req(undefined, false))).status).toBe(401);
    state.user = null;
    expect((await PUT(req(validProject))).status).toBe(401);
    expect(state.query).not.toHaveBeenCalled();
    expect(state.execute).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { ...validProject, entityId: '' },
    { ...validProject, completedSteps: ['FIND', 'NOPE'] },
    { ...validProject, revenueJpy: -1 },
    { ...validProject, buildUrl: 'javascript:alert(1)' },
    { ...validProject, unexpected: true },
  ])('rejects malformed project input', async (value) => {
    expect((await PUT(req(value))).status).toBe(400);
  });

  it('does not acknowledge failed persistence', async () => {
    state.execute.mockResolvedValue({ changes: 0 });
    expect((await PUT(req(validProject))).status).toBe(503);
  });
});

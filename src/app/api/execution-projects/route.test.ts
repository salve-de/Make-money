import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MAX_EXECUTION_NOTES_LENGTH } from '@/shared/execution';

const state = vi.hoisted(() => ({
  user: { uid: 'owner-a' } as { uid: string } | null,
  query: vi.fn(),
  execute: vi.fn(),
  generation: { generation: 0, resetAt: null as string | null },
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));
vi.mock('@/lib/execution/generation-store', () => ({
  executionOwnerKey: (uid: string) => 'owner-key-' + uid,
  getExecutionGeneration: async () => state.generation,
}));

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
  revision: 0,
  generation: 0,
};

const savedProject = {
  ...validProject,
  revision: 1,
  updatedAt: '2026-09-18T12:00:00.000Z',
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
  state.generation = { generation: 0, resetAt: null };
  state.query.mockReset().mockResolvedValue([]);
  state.execute.mockReset().mockResolvedValue({ changes: 1 });
});

describe('execution projects', () => {
  it('reads only the verified owner and current generation', async () => {
    const response = await GET(req(undefined, true, '?entityId=ent-photoai&userId=owner-b'));
    expect(response.status).toBe(200);
    expect(state.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id=? AND entity_id=? AND generation=?'),
      ['owner-a', 'ent-photoai', 0],
      expect.any(Function),
    );
  });

  it('paginates the execution-project listing without dropping rows', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...savedProject,
      entityId: 'ent-' + String(index).padStart(3, '0'),
      sourceName: 'Project ' + index,
    }));
    state.query.mockResolvedValue(rows);

    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects).toHaveLength(100);
    expect(body).toMatchObject({ hasMore: true, nextCursor: 'ent-099', generation: 0 });
    expect(state.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY entity_id ASC LIMIT 101'),
      ['owner-a', 0],
      expect.any(Function),
    );

    state.query.mockResolvedValue([rows[100]]);
    const next = await GET(req(undefined, true, '?cursor=ent-099'));
    expect(await next.json()).toMatchObject({
      projects: [expect.objectContaining({ entityId: 'ent-100' })],
      hasMore: false,
      nextCursor: null,
    });
    expect(state.query).toHaveBeenLastCalledWith(
      expect.stringContaining('entity_id>?'),
      ['owner-a', 0, 'ent-099'],
      expect.any(Function),
    );
  });

  it('creates a project under the verified owner with a server revision', async () => {
    state.query.mockResolvedValue([savedProject]);
    const response = await PUT(req(validProject));
    expect(response.status).toBe(200);
    expect(state.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO execution_projects'),
      expect.arrayContaining(['owner-a', 'ent-photoai', 'Photo AI', 0, 'owner-key-owner-a']),
    );
    expect(await response.json()).toMatchObject({ generation: 0, project: { revision: 1, generation: 0 } });
  });

  it('updates only when the submitted revision still matches', async () => {
    state.query.mockResolvedValue([{ ...savedProject, revision: 2 }]);
    const response = await PUT(req({ ...savedProject, revision: 1 }));
    expect(response.status).toBe(200);
    expect(state.execute).toHaveBeenCalledWith(
      expect.stringContaining('revision=revision+1'),
      expect.arrayContaining(['owner-a', 'ent-photoai', 0, 1, 'owner-key-owner-a']),
    );
  });

  it('rejects stale overlapping saves with the current server project', async () => {
    state.execute.mockResolvedValue({ changes: 0 });
    state.query.mockResolvedValue([{ ...savedProject, revision: 2 }]);
    const response = await PUT(req({ ...savedProject, revision: 1 }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ generation: 0, project: { revision: 2 } });
  });

  it('rejects a draft from an invalidated account generation on every device', async () => {
    state.generation = { generation: 2, resetAt: '2026-09-18T12:00:00.000Z' };
    state.query.mockResolvedValue([]);
    const response = await PUT(req({ ...validProject, generation: 1 }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ generation: 2, project: null });
    expect(state.execute).not.toHaveBeenCalled();
  });

  it('accepts maximum multibyte and JSON-escaped valid fields within the bounded request size', async () => {
    state.query.mockResolvedValue([savedProject]);
    const response = await PUT(req({
      ...validProject,
      sourceName: '\u0001'.repeat(300),
      offerName: '\u0002'.repeat(300),
      targetCustomer: '顧'.repeat(2000),
      notes: '\u0003'.repeat(MAX_EXECUTION_NOTES_LENGTH),
    }));
    expect(response.status).toBe(200);
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
    { ...validProject, revision: -1 },
    { ...validProject, generation: -1 },
    { ...validProject, unexpected: true },
  ])('rejects malformed project input', async (value) => {
    expect((await PUT(req(value))).status).toBe(400);
  });

  it('does not acknowledge an actual storage failure', async () => {
    state.execute.mockRejectedValue(new Error('offline'));
    expect((await PUT(req(validProject))).status).toBe(503);
  });
});

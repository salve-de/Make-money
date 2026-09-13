import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ user: { uid: 'owner-a' } as { uid: string } | null, query: vi.fn(), execute: vi.fn() }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute }));
import { GET, PUT } from './route';
function req(body?: unknown, auth = true) { return new NextRequest('http://localhost/api/analyst-notes?userId=owner-b', { method: body === undefined ? 'GET' : 'PUT', headers: auth ? { Authorization: 'Bearer test' } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
beforeEach(() => { state.user = { uid: 'owner-a' }; state.query.mockReset().mockResolvedValue([]); state.execute.mockReset().mockResolvedValue({ changes: 1 }); });
describe('private analyst notes', () => {
  it('reads only verified owner regardless of supplied query UID', async () => {
    expect(await (await GET(req())).json()).toEqual({ uid: 'owner-a', notes: {} });
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=?'), ['owner-a'], expect.any(Function));
  });
  it('ignores a supplied owner in writes and binds only authenticated UID', async () => {
    const response = await PUT(req({ userId: 'owner-b', entityId: 'ent-x', content: 'private draft' }));
    expect(response.status).toBe(200);
    expect(state.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(user_id,entity_id)'), ['owner-a', 'ent-x', 'private draft', expect.any(String)]);
  });
  it('does not access storage for missing or invalid tokens', async () => {
    expect((await GET(req(undefined, false))).status).toBe(401);
    state.user = null; expect((await PUT(req({ entityId: 'x', content: '' }))).status).toBe(401);
    expect(state.query).not.toHaveBeenCalled(); expect(state.execute).not.toHaveBeenCalled();
  });
  it.each([null, [], { entityId: '', content: 'x' }, { entityId: 'x', content: 42 }, { entityId: 'x', content: 'x'.repeat(50001) }])('rejects malformed note input', async (value) => { expect((await PUT(req(value))).status).toBe(400); });
  it('does not acknowledge unsaved data or fake an empty list on failure', async () => {
    state.execute.mockResolvedValue({ changes: 0 }); expect((await PUT(req({ entityId: 'x', content: '' }))).status).toBe(503);
    state.query.mockRejectedValue(new Error('offline')); expect((await GET(req())).status).toBe(503);
  });
});

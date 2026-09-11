import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ user: { uid: 'user-1' } as { uid: string } | null, query: vi.fn(), execute: vi.fn(), batch: vi.fn() }));
vi.mock('@/lib/storage/d1', () => ({ queryD1: state.query, executeD1: state.execute, batchD1: state.batch }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn(async () => state.user) }));
import { POST as newsletter } from '@/app/api/newsletter/subscribe/route';
import { POST as submission } from '@/app/api/submissions/route';
import { GET as listBookmarks, POST as bookmark } from '@/app/api/bookmarks/route';
import { PUT as saveNote } from '@/app/api/analyst-notes/route';
import { POST as strategy } from '@/app/api/strategy-chat/route';
import { DELETE as deleteUser } from '@/app/api/user/me/route';
const validSubmission = { businessName: ' Example ', url: ' https://example.com ', monthlyRevenue: '100', monthlyProfit: 0 };
const validBookmark = { itemType: 'business', itemId: ' entity-1 ' };
function request(body: unknown, raw = false, auth = true) {
  return new NextRequest('http://localhost/api/test', { method: 'POST', headers: auth ? { authorization: 'Bearer test' } : {}, body: raw ? String(body) : JSON.stringify(body) });
}
beforeEach(() => {
  state.user = { uid: 'user-1' };
  state.query.mockReset().mockRejectedValue(new Error('Unavailable'));
  state.execute.mockReset().mockRejectedValue(new Error('Unavailable'));
  state.batch.mockReset().mockRejectedValue(new Error('Unavailable'));
  vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
});
describe('D1 API persistence and input boundaries', () => {
  it('bounds analyst note requests and rejects unknown fields before storage', async () => {
    expect((await saveNote(request({ entityId: 'ent-1', content: 'ok', role: 'admin' }))).status).toBe(400);
    expect((await saveNote(request({ entityId: 'ent-1', content: 'x'.repeat(70_000) }))).status).toBe(413);
    expect(state.execute).not.toHaveBeenCalled();
  });
  for (const [name, handler, valid] of [ ['newsletter', newsletter, { email: ' TEST@Example.com ' }], ['submission', submission, validSubmission], ['bookmark', bookmark, validBookmark] ] as const) {
    it.each([null, [], 'hello', {}, 123])(`${name} rejects invalid shape %j before storage`, async (body) => {
      expect((await handler(request(body))).status).toBe(400);
      expect(state.query).not.toHaveBeenCalled(); expect(state.execute).not.toHaveBeenCalled();
    });
    it(`${name} rejects malformed JSON`, async () => { expect((await handler(request('{', true))).status).toBe(400); });
    it(`${name} never claims success when D1 is unavailable`, async () => {
      const response = await handler(request(valid)); expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('success');
    });
  }
  it('normalizes newsletter input and deduplicates with a database unique constraint', async () => {
    state.execute.mockResolvedValue({ changes: 1 }); state.query.mockResolvedValue([{ id: 'sub-1', email: 'test@example.com' }]);
    expect(await (await newsletter(request({ email: ' TEST@Example.com ' }))).json()).toMatchObject({ subscriberId: 'sub-1' });
    expect(state.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(email) DO NOTHING'), [expect.any(String), 'test@example.com', 'web_portal']);
  });
  it('requires persisted newsletter readback', async () => {
    state.execute.mockResolvedValue({ changes: 1 }); state.query.mockResolvedValue([]);
    expect((await newsletter(request({ email: 'a@example.com' }))).status).toBe(503);
  });
  it.each([{ email: '@' }, { email: 'a@b.c', source: {} }, { email: 'a@b.c', source: ' ' }])('rejects newsletter fields %j', async (body) => { expect((await newsletter(request(body))).status).toBe(400); });
  it('rejects unknown newsletter fields and oversized bodies before storage', async () => {
    expect((await newsletter(request({ email: 'a@example.com', status: 'active' }))).status).toBe(400);
    expect((await newsletter(request({ email: `a${'x'.repeat(400)}@example.com` }))).status).toBe(400);
    expect(state.execute).not.toHaveBeenCalled();
  });
  it('stores authenticated submission with zero profit', async () => {
    state.execute.mockResolvedValue({ changes: 1 });
    expect((await submission(request({ ...validSubmission, toolsUsed: ' tool ' }))).status).toBe(200);
    expect(state.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO submissions'), [expect.any(String), 'user-1', 'Example', 'https://example.com', 100, 0, 'tool', '', '']);
  });
  it('supports anonymous submission but rejects invalid supplied credentials', async () => {
    state.execute.mockResolvedValue({ changes: 1 });
    expect((await submission(request(validSubmission, false, false))).status).toBe(200);
    state.user = null; expect((await submission(request(validSubmission))).status).toBe(401);
  });
  it('does not claim a saved submission on zero changed rows', async () => { state.execute.mockResolvedValue({ changes: 0 }); expect((await submission(request(validSubmission))).status).toBe(503); });
  it.each([{ monthlyRevenue: 'NaN' }, { monthlyProfit: '' }, { monthlyProfit: true }, { monthlyProfit: 0.5 }, { monthlyRevenue: -1 }, { toolsUsed: [] }, { proofScreenshotUrl: 'javascript:alert(1)' }, { url: 'invalid' }])('rejects submission fields %j', async (fields) => { expect((await submission(request({ ...validSubmission, ...fields }))).status).toBe(400); });
  it('rejects oversized submission text before storage', async () => {
    expect((await submission(request({ ...validSubmission, toolsUsed: 'x'.repeat(2049) }))).status).toBe(400);
    expect(state.execute).not.toHaveBeenCalled();
  });
  it('requires bookmark authentication', async () => {
    expect((await bookmark(request(validBookmark, false, false))).status).toBe(401);
    state.user = null; expect((await listBookmarks(request(null))).status).toBe(401);
    expect(state.query).not.toHaveBeenCalled();
  });
  it.each([0, 1])('atomically toggles a bookmark and returns actual saved state %i', async (saved) => {
    state.query.mockResolvedValue([{ saved }]);
    expect(await (await bookmark(request(validBookmark))).json()).toEqual({ success: true, saved: saved === 1 });
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(user_id,item_type,item_id)'), ['user-1', 'business', 'entity-1']);
  });
  it('binds the authenticated owner for bookmark lists', async () => {
    state.query.mockResolvedValue([]); expect(await (await listBookmarks(request(null))).json()).toEqual({ saved: [] });
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=?'), ['user-1'], expect.any(Function));
    const parser = state.query.mock.calls[0][2];
    expect(() => parser({ userId: 'other-user', itemType: 'business', itemId: 'x', createdAt: '2026' })).toThrow();
  });
});
describe('strategy owner isolation and honest persistence', () => {
  it('never reads another user notes or persists anonymous chat', async () => {
    const response = await strategy(request({ action: 'CHAT', messages: [{ role: 'user', content: 'test' }] }, false, false));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ persisted: false });
    expect(state.query).not.toHaveBeenCalled(); expect(state.execute).not.toHaveBeenCalled();
  });
  it('scopes saved notes and generated message to the verified UID', async () => {
    state.query.mockResolvedValue([]); state.execute.mockResolvedValue({ changes: 1 });
    const response = await strategy(request({ action: 'CHAT', messages: [{ role: 'user', content: 'test' }], conversationId: 'someone-elses-name' }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ persisted: true });
    expect(state.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=?'), ['user-1'], expect.any(Function));
    expect(state.execute.mock.calls[0][1][1]).toBe('user-1');
  });
  it('does not expose an API key to anonymous strategy requests', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    const response = await strategy(request({ action: 'CHAT', messages: [{ role: 'user', content: 'test' }] }, false, false));
    expect(response.status).toBe(401);
    expect(state.query).not.toHaveBeenCalled();
  });
  it('requires authentication before deleting an account', async () => {
    state.user = null;
    expect((await deleteUser(request(null, false, false))).status).toBe(401);
    expect(state.batch).not.toHaveBeenCalled();
  });
  it('deletes owned state and anonymizes retained payment facts atomically', async () => {
    state.batch.mockResolvedValue([]);
    state.query.mockResolvedValue([]);
    expect((await deleteUser(request(null, false, true))).status).toBe(200);
    expect(state.batch).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ sql: expect.stringContaining('DELETE FROM bookmarks'), params: ['user-1'] }),
      expect.objectContaining({ sql: expect.stringContaining('json_remove'), params: ['user-1'] }),
      expect.objectContaining({ sql: expect.stringContaining('DELETE FROM users'), params: ['user-1'] }),
    ]));
  });
});

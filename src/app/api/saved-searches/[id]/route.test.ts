import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/saved-searches/store', () => ({ updateSavedSearch: state.update, deleteSavedSearch: state.remove }));

import { DELETE, PATCH } from './route';

const filters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };
const saved = { id: 'abc', name: '新しい名前', query: 'AI', filters, notify: false, createdAt: 1 };

function request(method: 'PATCH' | 'DELETE', body?: unknown, options: { auth?: boolean; raw?: boolean } = {}) {
  return new NextRequest('http://localhost/api/saved-searches/abc', {
    method,
    headers: options.auth === false ? {} : { authorization: 'Bearer test' },
    ...(body === undefined ? {} : { body: options.raw ? String(body) : JSON.stringify(body) }),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  state.user = { uid: 'user-1' };
  state.update.mockReset().mockResolvedValue(saved);
  state.remove.mockReset().mockResolvedValue(true);
});

describe('PATCH /api/saved-searches/[id]', () => {
  it('requires a signed-in user', async () => {
    expect((await PATCH(request('PATCH', { name: 'x' }, { auth: false }), context('abc'))).status).toBe(401);
    state.user = null;
    expect((await PATCH(request('PATCH', { name: 'x' }), context('abc'))).status).toBe(401);
    expect(state.update).not.toHaveBeenCalled();
  });

  it('renames or mutes the search, scoped to the authenticated user', async () => {
    const response = await PATCH(request('PATCH', { name: ' 新しい名前 ', notify: false }), context('abc'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ savedSearch: saved });
    expect(state.update).toHaveBeenCalledWith('user-1', 'abc', { name: '新しい名前', notify: false });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it("cannot change someone else's search: it looks exactly like a missing one", async () => {
    state.user = { uid: 'intruder' };
    state.update.mockResolvedValue(null);
    const response = await PATCH(request('PATCH', { notify: false }), context('abc'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: '条件が見つかりません' });
    // the store is asked in the caller's name, so it can only ever match the caller's rows
    expect(state.update).toHaveBeenCalledWith('intruder', 'abc', { notify: false });
  });

  it('does not let the body choose the owner or the conditions', async () => {
    for (const body of [{ name: 'x', userId: 'user-2' }, { name: 'x', filters: {} }, { name: 'x', query: 'y' }, { id: 'other' }]) {
      expect((await PATCH(request('PATCH', body), context('abc'))).status).toBe(400);
    }
    expect(state.update).not.toHaveBeenCalled();
  });

  it('rejects an empty change, a bad name or notify value, and broken bodies', async () => {
    expect((await PATCH(request('PATCH', {}), context('abc'))).status).toBe(400);
    const bad = await PATCH(request('PATCH', { name: '' }), context('abc'));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: '名前は1〜60文字で入力してください' });
    expect((await PATCH(request('PATCH', { notify: 'yes' }), context('abc'))).status).toBe(400);
    expect((await PATCH(request('PATCH', '{', { raw: true }), context('abc'))).status).toBe(400);
    expect((await PATCH(request('PATCH', { name: 'x'.repeat(10_000) }), context('abc'))).status).toBe(413);
    expect(state.update).not.toHaveBeenCalled();
  });

  it.each(['../secret', 'a/b', 'x'.repeat(65), 'a b', '%00'])('answers 404 for the impossible id %j without touching storage', async (id) => {
    expect((await PATCH(request('PATCH', { name: 'x' }), context(id))).status).toBe(404);
    expect(state.update).not.toHaveBeenCalled();
  });

  it('never claims success when storage fails', async () => {
    state.update.mockRejectedValue(new Error('unavailable'));
    const response = await PATCH(request('PATCH', { name: 'x' }), context('abc'));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('savedSearch');
  });
});

describe('DELETE /api/saved-searches/[id]', () => {
  it('requires a signed-in user', async () => {
    expect((await DELETE(request('DELETE', undefined, { auth: false }), context('abc'))).status).toBe(401);
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('deletes the caller’s search', async () => {
    const response = await DELETE(request('DELETE'), context('abc'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(state.remove).toHaveBeenCalledWith('user-1', 'abc');
  });

  it("cannot delete someone else's search, and cannot tell it from a missing one", async () => {
    state.user = { uid: 'intruder' };
    state.remove.mockResolvedValue(false);
    const response = await DELETE(request('DELETE'), context('abc'));
    expect(response.status).toBe(404);
    expect(state.remove).toHaveBeenCalledWith('intruder', 'abc');
  });

  it('answers 404 for an impossible id and 503 when storage fails', async () => {
    expect((await DELETE(request('DELETE'), context('../x'))).status).toBe(404);
    expect(state.remove).not.toHaveBeenCalled();
    state.remove.mockRejectedValue(new Error('unavailable'));
    expect((await DELETE(request('DELETE'), context('abc'))).status).toBe(503);
  });
});

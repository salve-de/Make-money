import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  list: vi.fn(),
  create: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: async () => state.user }));
vi.mock('@/lib/saved-searches/store', () => ({ listSavedSearches: state.list, createSavedSearch: state.create }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: state.rateLimit }));

import { GET, POST } from './route';

const filters = { filter: 'ALL', batch: 'ALL', tags: [], bookmarks: [], screener: null };
const saved = { id: 'abc', name: '条件', query: 'AI', filters, notify: true, createdAt: 1_700_000_000_000 };

function request(method: 'GET' | 'POST', body?: unknown, options: { auth?: boolean; raw?: boolean } = {}) {
  return new NextRequest('http://localhost/api/saved-searches', {
    method,
    headers: options.auth === false ? {} : { authorization: 'Bearer test' },
    ...(body === undefined ? {} : { body: options.raw ? String(body) : JSON.stringify(body) }),
  });
}

beforeEach(() => {
  state.user = { uid: 'user-1' };
  state.list.mockReset().mockResolvedValue([saved]);
  state.create.mockReset().mockResolvedValue({ status: 'created', savedSearch: saved });
  state.rateLimit.mockReset().mockResolvedValue(true);
});

describe('GET /api/saved-searches', () => {
  it('requires a signed-in user and touches nothing without one', async () => {
    expect((await GET(request('GET', undefined, { auth: false }))).status).toBe(401);
    state.user = null;
    expect((await GET(request('GET'))).status).toBe(401);
    expect(state.list).not.toHaveBeenCalled();
  });

  it("returns the caller's searches, never cached", async () => {
    const response = await GET(request('GET'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ savedSearches: [saved] });
    expect(state.list).toHaveBeenCalledWith('user-1');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
  });

  it('answers 503, not an empty list, when the database is unavailable', async () => {
    state.list.mockRejectedValue(new Error('unavailable'));
    const response = await GET(request('GET'));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('savedSearches');
  });
});

describe('POST /api/saved-searches', () => {
  const valid = { name: '条件', query: 'AI', filters, notify: true };

  it('requires a signed-in user before reading the body or touching storage', async () => {
    expect((await POST(request('POST', valid, { auth: false }))).status).toBe(401);
    state.user = null;
    expect((await POST(request('POST', valid))).status).toBe(401);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.rateLimit).not.toHaveBeenCalled();
  });

  it('creates a search for the authenticated user and answers 201 with it', async () => {
    const response = await POST(request('POST', valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ savedSearch: saved });
    expect(state.create).toHaveBeenCalledWith('user-1', { name: '条件', query: 'AI', filters, notify: true });
  });

  it('ignores any owner the body claims: only the verified token decides', async () => {
    const response = await POST(request('POST', { ...valid, userId: 'someone-else' }));
    expect(response.status).toBe(400);
    expect(state.create).not.toHaveBeenCalled();
  });

  it('refuses the 21st search with the agreed message', async () => {
    state.create.mockResolvedValue({ status: 'limit' });
    const response = await POST(request('POST', valid));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: '保存できる条件は20件までです' });
  });

  it('shows the reason when the content is invalid, and stores nothing', async () => {
    const tooLong = await POST(request('POST', { ...valid, name: 'あ'.repeat(61) }));
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toEqual({ error: '名前は1〜60文字で入力してください' });
    const bookmarked = await POST(request('POST', { ...valid, filters: { ...filters, filter: 'BOOKMARKED' } }));
    expect(bookmarked.status).toBe(400);
    expect(await bookmarked.json()).toEqual({ error: '保存した事例の一覧は条件として保存できません' });
    expect(state.create).not.toHaveBeenCalled();
  });

  it.each([['malformed JSON', '{', true], ['an array', [], false], ['null', null, false], ['a string', 'x', false]] as const)(
    'rejects %s with 400',
    async (_label, body, raw) => {
      expect((await POST(request('POST', body, { raw }))).status).toBe(400);
      expect(state.create).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized body with 413 before storing anything', async () => {
    const response = await POST(request('POST', { ...valid, query: 'x'.repeat(200 * 1024) }));
    expect(response.status).toBe(413);
    expect(state.create).not.toHaveBeenCalled();
  });

  it('applies a per-user rate limit', async () => {
    state.rateLimit.mockResolvedValue(false);
    const response = await POST(request('POST', valid));
    expect(response.status).toBe(429);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.rateLimit).toHaveBeenCalledWith(expect.anything(), 'saved-search-create', expect.objectContaining({ subject: 'user-1' }));
  });

  it('never claims success when storage fails', async () => {
    state.create.mockRejectedValue(new Error('unavailable'));
    const response = await POST(request('POST', valid));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('savedSearch');
  });
});

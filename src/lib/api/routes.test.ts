import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ database: null as unknown, user: { uid: 'user-1' } as { uid: string } | null }));
vi.mock('@/db', async () => ({ ...(await import('@/db/schema')), get db() { return state.database; } }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: vi.fn(async () => state.user) }));
import { GET as userStatus } from '@/app/api/user/me/route';
import { POST as newsletter } from '@/app/api/newsletter/subscribe/route';
import { POST as submission } from '@/app/api/submissions/route';
import { GET as listBookmarks, POST as bookmark } from '@/app/api/bookmarks/route';

const validSubmission = { businessName: ' Example ', url: ' https://example.com ', monthlyRevenue: '100', monthlyProfit: 0 };
const validBookmark = { itemType: 'business', itemId: ' entity-1 ' };
function request(body: unknown, raw = false, auth = true) {
  return new NextRequest('http://localhost/api/test', { method: 'POST',
    headers: auth ? { authorization: 'Bearer test' } : {}, body: raw ? String(body) : JSON.stringify(body) });
}
function database(rows: unknown[] = []) {
  const values = vi.fn(() => ({ returning: vi.fn(async () => [{ id: 12 }]) }));
  const where = vi.fn(() => Object.assign(Promise.resolve(rows), { limit: vi.fn(async () => rows) }));
  const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    insert: vi.fn(() => ({ values })), delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })) };
  state.database = db;
  return { ...db, values };
}
beforeEach(() => { state.database = null; state.user = { uid: 'user-1' }; });

describe('API input boundaries and persistence responses', () => {
  for (const [name, handler, valid] of [
    ['newsletter', newsletter, { email: ' TEST@Example.com ' }],
    ['submission', submission, validSubmission], ['bookmark', bookmark, validBookmark],
  ] as const) {
    it.each([null, [], 'hello', {}, 123])(`${name} rejects invalid shape %j before DB`, async (body) => {
      const db = database();
      expect((await handler(request(body))).status).toBe(400);
      expect(db.insert).not.toHaveBeenCalled(); expect(db.select).not.toHaveBeenCalled();
    });
    it(`${name} returns 400 for malformed JSON`, async () => {
      expect((await handler(request('{', true))).status).toBe(400);
    });
    it(`${name} does not claim success without persistence`, async () => {
      const response = await handler(request(valid));
      expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('success');
    });
    it(`${name} returns an error on DB failure`, async () => {
      const db = database();
      db.insert.mockImplementation(() => { throw new Error('DB unavailable'); });
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try { expect((await handler(request(valid))).status).toBe(500); } finally { log.mockRestore(); }
    });
  }
  for (const [name, handler, valid] of [
    ['newsletter', newsletter, { email: 'a@example.com' }],
    ['submission', submission, validSubmission],
  ] as const) {
    it(`${name} does not claim a saved record when INSERT returns no row`, async () => {
      const db = database();
      db.values.mockImplementation(() => ({ returning: vi.fn(async () => []) }));
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const response = await handler(request(valid));
        expect(response.status).toBe(500);
        expect(await response.json()).not.toHaveProperty('success');
      } finally { log.mockRestore(); }
    });
  }
  it('newsletter normalizes persisted email and defaults source', async () => {
    const db = database(); const response = await newsletter(request({ email: ' TEST@Example.com ' }));
    expect(response.status).toBe(200);
    expect(db.values).toHaveBeenCalledWith({ email: 'test@example.com', source: 'web_portal', status: 'active' });
    expect(await response.json()).toMatchObject({ subscriberId: 12, email: 'test@example.com' });
  });
  it('newsletter returns an existing subscriber without another insert', async () => {
    const db = database([{ id: 9 }]);
    expect(await (await newsletter(request({ email: 'a@example.com' }))).json()).toMatchObject({ subscriberId: 9 });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it.each([{ email: '@' }, { email: 'a@b.c', source: {} }, { email: 'a@b.c', source: ' ' }])('rejects invalid newsletter fields %j', async (body) => {
    expect((await newsletter(request(body))).status).toBe(400);
  });
  it('accepts zero profit and normalizes submission fields without persisting extra fields', async () => {
    const db = database();
    expect((await submission(request({ ...validSubmission, status: 'approved', toolsUsed: ' tool ' }))).status).toBe(200);
    expect(db.values).toHaveBeenCalledWith({ userId: 'user-1', businessName: 'Example', url: 'https://example.com',
      monthlyRevenue: 100, monthlyProfit: 0, toolsUsed: 'tool', acquisitionChannel: '', proofScreenshotUrl: '', status: 'pending' });
  });
  it('supports an anonymous submission with zero revenue and a loss', async () => {
    const db = database();
    expect((await submission(request({ ...validSubmission, monthlyRevenue: 0, monthlyProfit: '-10' }, false, false))).status).toBe(200);
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ userId: null, monthlyRevenue: 0, monthlyProfit: -10 }));
  });
  it.each([{ monthlyRevenue: 'NaN' }, { monthlyProfit: '' }, { monthlyProfit: true }, { monthlyProfit: 0.5 },
    { monthlyRevenue: -1 }, { monthlyRevenue: 2147483648 }, { monthlyProfit: '-2147483649' },
    { toolsUsed: [] }, { acquisitionChannel: 3 }, { proofScreenshotUrl: 'javascript:alert(1)' }, { url: 'invalid' }])('rejects invalid submission fields %j', async (fields) => {
    const db = database();
    expect((await submission(request({ ...validSubmission, ...fields }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('bookmark requires authentication before writing', async () => {
    const db = database(); state.user = null;
    expect((await bookmark(request(validBookmark))).status).toBe(401);
    expect((await bookmark(request(validBookmark, false, false))).status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });
  it.each([{ itemType: 'unknown', itemId: '1' }, { itemType: 'business', itemId: 1 }, { itemType: 'idea', itemId: ' ' }])('rejects invalid bookmark fields %j', async (body) => {
    expect((await bookmark(request(body))).status).toBe(400);
  });
  it('bookmark persists the authenticated user and normalized ID', async () => {
    const db = database();
    expect(await (await bookmark(request(validBookmark))).json()).toEqual({ success: true, saved: true });
    expect(db.values).toHaveBeenCalledWith({ userId: 'user-1', itemType: 'business', itemId: 'entity-1' });
  });
  it('bookmark removes an existing item', async () => {
    const db = database([{ id: 8 }]);
    expect(await (await bookmark(request(validBookmark))).json()).toEqual({ success: true, saved: false });
    expect(db.delete).toHaveBeenCalledOnce(); expect(db.insert).not.toHaveBeenCalled();
  });
  it('bookmark list reports unavailable DB rather than a false empty list', async () => {
    expect((await listBookmarks(request(null))).status).toBe(503);
  });
  it('bookmark list returns persisted records', async () => {
    const rows = [{ id: 8, itemId: 'entity-1' }]; database(rows);
    expect(await (await listBookmarks(request(null))).json()).toEqual({ saved: rows });
  });
});


describe('membership persistence availability', () => {
  it('does not report a free membership when DB is unavailable', async () => {
    const response = await userStatus(request(null));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('isPro');
  });
  it('does not downgrade a member when DB lookup fails', async () => {
    const db = database();
    db.select.mockImplementation(() => { throw new Error('Unavailable'); });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await userStatus(request(null));
      expect(response.status).toBe(503);
      expect(await response.json()).not.toHaveProperty('isPro');
    } finally { log.mockRestore(); }
  });
  it('returns actual membership status from the DB', async () => {
    database([{ id: 'user-1', email: 'a@example.com', displayName: 'A', isPro: true, role: 'member' }]);
    expect(await (await userStatus(request(null))).json()).toMatchObject({ uid: 'user-1', isPro: true });
  });
  it('returns free membership only after a new user was saved', async () => {
    const db = database();
    expect(await (await userStatus(request(null))).json()).toMatchObject({ uid: 'user-1', isPro: false });
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', isPro: false }));
  });
  it('requires authentication', async () => {
    expect((await userStatus(request(null, false, false))).status).toBe(401);
    state.user = null;
    expect((await userStatus(request(null))).status).toBe(401);
  });
});

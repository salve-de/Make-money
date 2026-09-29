import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const state = vi.hoisted(() => ({ database: null as DatabaseSync | null, offline: false }));
vi.mock('@/lib/storage/d1', () => ({
  queryD1: vi.fn(async (sql: string, params: (string | number | null)[] = [], parse?: (row: unknown) => unknown) => {
    if (state.offline) throw new Error('D1 offline');
    const rows = state.database!.prepare(sql).all(...params);
    return parse ? rows.map(parse) : rows;
  }),
}));

import { GET } from './route';

const T0 = 1_800_000_000;
function add(over: Record<string, unknown> = {}) {
  const row = {
    id: `id-${Math.random().toString(36).slice(2)}`, entity_id: 'ent_example', user_id: 'owner-secret-uid', provider: 'stripe',
    account_id_hash: 'd'.repeat(64), account_domain: 'example.com', currency: 'JPY', last30d_revenue_minor: 250000,
    mrr_minor: 90000, active_subscriptions: 12, period_start: T0 - 2_592_000, period_end: T0, verified_at: T0, ...over,
  };
  state.database!.prepare(`INSERT INTO verified_revenue(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(() => '?').join(',')})`)
    .run(...(Object.values(row) as (string | number | null)[]));
}
const get = (query = '?entity_id=ent_example') => GET(new Request(`http://localhost/api/verification${query}`));

beforeEach(() => {
  state.offline = false;
  state.database = new DatabaseSync(':memory:');
  state.database.exec(readFileSync('migrations/d1/0012_verified_revenue.sql', 'utf8'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  state.database?.close();
  vi.restoreAllMocks();
});

describe('GET /api/verification', () => {
  it('returns null for a case nobody verified', async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verification: null });
  });

  it('returns the latest verification of the case, in the public shape', async () => {
    add({ verified_at: T0, last30d_revenue_minor: 100 });
    add({ verified_at: T0 + 7200, last30d_revenue_minor: 300, mrr_minor: null, active_subscriptions: null });
    add({ entity_id: 'ent_other', verified_at: T0 + 9999, last30d_revenue_minor: 999 });
    const response = await get();
    expect(await response.json()).toEqual({
      verification: {
        entityId: 'ent_example', provider: 'stripe', accountDomain: 'example.com', currency: 'JPY',
        last30dRevenueMinor: 300, mrrMinor: null, activeSubscriptions: null,
        periodStart: T0 - 2_592_000, periodEnd: T0, verifiedAt: T0 + 7200,
      },
    });
  });

  it('needs no sign-in and never exposes the user or the payment account', async () => {
    add();
    const text = await (await get()).text();
    expect(text).not.toContain('owner-secret-uid');
    expect(text).not.toContain('d'.repeat(64));
    expect(text).not.toMatch(/user_?[iI]d|account_?[iI]d|hash/);
  });

  it('may be cached briefly by shared caches, since it is public', async () => {
    expect((await get()).headers.get('cache-control')).toBe('public, max-age=30, must-revalidate');
  });

  it.each(['', '?', '?entity_id=', '?entity_id=%20%20', `?entity_id=${'e'.repeat(201)}`])('rejects a missing or oversized case id (%j)', async (query) => {
    const response = await get(query);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'invalid_request' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 503 when the database is unavailable', async () => {
    state.offline = true;
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'unavailable' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 503 for a row that is not what the contract says', async () => {
    add();
    state.database!.prepare("UPDATE verified_revenue SET last30d_revenue_minor = 'lots'").run();
    expect((await get()).status).toBe(503);
  });
});

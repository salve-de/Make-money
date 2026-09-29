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

import { GET as LIST } from './route';

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

describe('GET /api/verification/list', () => {
  it('lists each verified case once, with its latest time, newest first', async () => {
    add({ entity_id: 'ent_a', verified_at: T0 });
    add({ entity_id: 'ent_a', verified_at: T0 + 500 });
    add({ entity_id: 'ent_b', verified_at: T0 + 200 });
    const response = await LIST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      verified: [{ entityId: 'ent_a', verifiedAt: T0 + 500 }, { entityId: 'ent_b', verifiedAt: T0 + 200 }],
    });
  });

  it('is empty when nothing is verified', async () => {
    expect(await (await LIST()).json()).toEqual({ verified: [] });
  });

  it('needs no sign-in and exposes only the case and the time', async () => {
    add();
    const text = await (await LIST()).text();
    expect(text).not.toContain('owner-secret-uid');
    expect(text).not.toContain('d'.repeat(64));
    expect(text).not.toContain('JPY');
    expect(text).not.toContain('example.com');
    expect((await LIST()).headers.get('cache-control')).toBe('public, max-age=30, must-revalidate');
  });

  it('answers an empty, uncached list marked unavailable when the database is unavailable', async () => {
    state.offline = true;
    const response = await LIST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verified: [], unavailable: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

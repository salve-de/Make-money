import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import { VERIFICATION_COOLDOWN_SECONDS, type VerifiedRevenue } from '@/shared/verification';

const state = vi.hoisted(() => ({ database: null as DatabaseSync | null }));
vi.mock('@/lib/storage/d1', () => ({
  queryD1: vi.fn(async (sql: string, params: (string | number | null)[] = [], parse?: (row: unknown) => unknown) => {
    const rows = state.database!.prepare(sql).all(...params);
    return parse ? rows.map(parse) : rows;
  }),
  executeD1: vi.fn(async (sql: string, params: (string | number | null)[] = []) => {
    const result = state.database!.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastRowId: null };
  }),
}));

import { getLastVerifiedAt, getLatestVerification, insertVerification, listVerifiedEntities, MAX_VERIFIED_LIST } from './store';

const HASH = 'a'.repeat(64);
const T0 = 1_800_000_000;

const revenue = (over: Partial<VerifiedRevenue> = {}): VerifiedRevenue => ({
  entityId: 'ent_example',
  provider: 'stripe',
  accountDomain: 'example.com',
  currency: 'JPY',
  last30dRevenueMinor: 250000,
  mrrMinor: 90000,
  activeSubscriptions: 12,
  periodStart: T0 - 30 * 86400,
  periodEnd: T0,
  verifiedAt: T0,
  ...over,
});
let sequence = 0;
const save = (userId: string, over: Partial<VerifiedRevenue> = {}, hash = HASH) =>
  insertVerification({ id: `id-${++sequence}`, userId, accountIdHash: hash, revenue: revenue(over) });
const count = () => Number((state.database!.prepare('SELECT COUNT(*) AS n FROM verified_revenue').get() as { n: number | bigint }).n);

beforeEach(() => {
  sequence = 0;
  state.database = new DatabaseSync(':memory:');
  state.database.exec(readFileSync('migrations/d1/0012_verified_revenue.sql', 'utf8'));
});
afterEach(() => { state.database?.close(); });

describe('migration 0012', () => {
  it('creates the table and the indexes the queries rely on', () => {
    const names = (state.database!.prepare("SELECT name FROM sqlite_master WHERE tbl_name = 'verified_revenue' ORDER BY name").all() as { name: string }[]).map((row) => row.name);
    expect(names).toEqual(expect.arrayContaining([
      'verified_revenue', 'verified_revenue_entity_latest', 'verified_revenue_recent', 'verified_revenue_user_entity',
    ]));
  });

  it('can be applied twice (idempotent)', () => {
    expect(() => state.database!.exec(readFileSync('migrations/d1/0012_verified_revenue.sql', 'utf8'))).not.toThrow();
  });

  it('has the columns the contract names, and nothing that holds a key', () => {
    const columns = (state.database!.prepare('PRAGMA table_info(verified_revenue)').all() as { name: string }[]).map((row) => row.name);
    expect(columns).toEqual([
      'id', 'entity_id', 'user_id', 'provider', 'account_id_hash', 'account_domain', 'currency',
      'last30d_revenue_minor', 'mrr_minor', 'active_subscriptions', 'period_start', 'period_end', 'verified_at',
    ]);
  });

  it('rejects rows that cannot be real', () => {
    const insert = (over: Record<string, unknown>) => {
      const row = {
        id: 'x', entity_id: 'e', user_id: 'u', provider: 'stripe', account_id_hash: HASH, account_domain: 'example.com', currency: 'JPY',
        last30d_revenue_minor: 1, mrr_minor: 1, active_subscriptions: 1, period_start: 1, period_end: 2, verified_at: 3, ...over,
      };
      state.database!.prepare(`INSERT INTO verified_revenue(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(() => '?').join(',')})`)
        .run(...(Object.values(row) as (string | number | null)[]));
    };
    expect(() => insert({})).not.toThrow();
    expect(() => insert({ id: 'y', account_id_hash: 'raw-account-id' })).toThrow();
    expect(() => insert({ id: 'y', mrr_minor: -1 })).toThrow();
    expect(() => insert({ id: 'y', active_subscriptions: -1 })).toThrow();
    expect(() => insert({ id: 'y', period_start: 10, period_end: 2 })).toThrow();
    expect(() => insert({ id: 'y', entity_id: '' })).toThrow();
    expect(() => insert({ id: 'y', entity_id: 'e'.repeat(201) })).toThrow();
    expect(() => insert({ id: 'x' })).toThrow(); // duplicate primary key
    expect(() => insert({ id: 'y', mrr_minor: null, active_subscriptions: null })).not.toThrow();
  });
});

describe('insertVerification and getLatestVerification', () => {
  it('stores a row and reads back exactly the public fields', async () => {
    expect(await save('owner-1')).toBe(true);
    const latest = await getLatestVerification('ent_example');
    expect(latest).toEqual(revenue());
    expect(Object.keys(latest!).sort()).toEqual([
      'accountDomain', 'activeSubscriptions', 'currency', 'entityId', 'last30dRevenueMinor',
      'mrrMinor', 'periodEnd', 'periodStart', 'provider', 'verifiedAt',
    ]);
  });

  it('keeps who verified and the hashed account in the table, but never returns them', async () => {
    await save('owner-1', {}, 'b'.repeat(64));
    const row = state.database!.prepare('SELECT user_id, account_id_hash FROM verified_revenue').get() as { user_id: string; account_id_hash: string };
    expect(row).toEqual({ user_id: 'owner-1', account_id_hash: 'b'.repeat(64) });
    expect(JSON.stringify(await getLatestVerification('ent_example'))).not.toMatch(/owner-1|bbbbbbbb/);
    expect(JSON.stringify(await listVerifiedEntities())).not.toMatch(/owner-1|bbbbbbbb/);
  });

  it('stores nulls as nulls, not as zero', async () => {
    await save('owner-1', { mrrMinor: null, activeSubscriptions: null });
    expect(await getLatestVerification('ent_example')).toMatchObject({ mrrMinor: null, activeSubscriptions: null });
  });

  it('keeps a negative revenue as it is', async () => {
    await save('owner-1', { last30dRevenueMinor: -4200 });
    expect((await getLatestVerification('ent_example'))?.last30dRevenueMinor).toBe(-4200);
  });

  it('returns null for a case nobody verified', async () => {
    expect(await getLatestVerification('ent_unknown')).toBeNull();
  });

  it('returns the newest verification of the case, whoever made it', async () => {
    await save('owner-1', { verifiedAt: T0, last30dRevenueMinor: 100 });
    await save('owner-2', { verifiedAt: T0 + 7200, last30dRevenueMinor: 300 });
    await save('owner-1', { verifiedAt: T0 + 3601, last30dRevenueMinor: 200 });
    expect((await getLatestVerification('ent_example'))?.last30dRevenueMinor).toBe(300);
  });

  it('does not mix up cases', async () => {
    await save('owner-1', { entityId: 'ent_a', last30dRevenueMinor: 1 });
    await save('owner-1', { entityId: 'ent_b', last30dRevenueMinor: 2 });
    expect((await getLatestVerification('ent_b'))?.last30dRevenueMinor).toBe(2);
  });

  it('ignores rows written by a provider this contract does not describe', async () => {
    await save('owner-1');
    state.database!.prepare("UPDATE verified_revenue SET provider = 'paddle'").run();
    expect(await getLatestVerification('ent_example')).toBeNull();
    expect(await listVerifiedEntities()).toEqual([]);
  });

  it('fails closed on a row that is not what the contract says', async () => {
    await save('owner-1');
    state.database!.prepare("UPDATE verified_revenue SET last30d_revenue_minor = 'lots'").run();
    await expect(getLatestVerification('ent_example')).rejects.toThrow('Invalid verification row');
  });
});

describe('one verification per user and case per hour', () => {
  it('refuses a second row from the same user for the same case within the hour', async () => {
    expect(await save('owner-1', { verifiedAt: T0 })).toBe(true);
    expect(await save('owner-1', { verifiedAt: T0 + 60 })).toBe(false);
    expect(await save('owner-1', { verifiedAt: T0 + VERIFICATION_COOLDOWN_SECONDS - 1 })).toBe(false);
    expect(count()).toBe(1);
  });

  it('allows it again once the hour has passed', async () => {
    expect(await save('owner-1', { verifiedAt: T0 })).toBe(true);
    expect(await save('owner-1', { verifiedAt: T0 + VERIFICATION_COOLDOWN_SECONDS })).toBe(true);
    expect(count()).toBe(2);
  });

  it('does not limit another user, or the same user on another case', async () => {
    expect(await save('owner-1', { verifiedAt: T0 })).toBe(true);
    expect(await save('owner-2', { verifiedAt: T0 + 1 })).toBe(true);
    expect(await save('owner-1', { entityId: 'ent_other', verifiedAt: T0 + 2 })).toBe(true);
    expect(count()).toBe(3);
  });

  it('reports the last time a user verified a case', async () => {
    expect(await getLastVerifiedAt('owner-1', 'ent_example')).toBeNull();
    await save('owner-1', { verifiedAt: T0 });
    await save('owner-1', { verifiedAt: T0 + 5000 });
    await save('owner-2', { verifiedAt: T0 + 9000 });
    expect(await getLastVerifiedAt('owner-1', 'ent_example')).toBe(T0 + 5000);
    expect(await getLastVerifiedAt('owner-1', 'ent_other')).toBeNull();
    expect(await getLastVerifiedAt('owner-3', 'ent_example')).toBeNull();
  });
});

describe('listVerifiedEntities', () => {
  it('lists each case once with its latest time, newest first', async () => {
    await save('owner-1', { entityId: 'ent_a', verifiedAt: T0 });
    await save('owner-1', { entityId: 'ent_a', verifiedAt: T0 + 4000 });
    await save('owner-1', { entityId: 'ent_b', verifiedAt: T0 + 100 });
    await save('owner-2', { entityId: 'ent_c', verifiedAt: T0 + 9000 });
    expect(await listVerifiedEntities()).toEqual([
      { entityId: 'ent_c', verifiedAt: T0 + 9000 },
      { entityId: 'ent_a', verifiedAt: T0 + 4000 },
      { entityId: 'ent_b', verifiedAt: T0 + 100 },
    ]);
  });

  it('is empty when nothing is verified', async () => {
    expect(await listVerifiedEntities()).toEqual([]);
  });

  it('honors a limit and rejects an unbounded one', async () => {
    for (let i = 0; i < 5; i += 1) await save('owner-1', { entityId: `ent_${i}`, verifiedAt: T0 + i });
    expect(await listVerifiedEntities(2)).toHaveLength(2);
    await expect(listVerifiedEntities(0)).rejects.toThrow();
    await expect(listVerifiedEntities(MAX_VERIFIED_LIST + 1)).rejects.toThrow();
    await expect(listVerifiedEntities(1.5)).rejects.toThrow();
  });
});

describe('query plans', () => {
  const plan = (sql: string, params: (string | number)[]) =>
    (state.database!.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as { detail: string }[]).map((row) => row.detail).join(' | ');

  it('reads the latest verification of a case through its index', () => {
    expect(plan("SELECT * FROM verified_revenue WHERE entity_id = ? AND provider = 'stripe' ORDER BY verified_at DESC, id DESC LIMIT 1", ['e']))
      .toContain('verified_revenue_entity_latest');
  });

  it('finds a user\'s last verification of a case through its index', () => {
    expect(plan('SELECT MAX(verified_at) FROM verified_revenue WHERE user_id = ? AND entity_id = ?', ['u', 'e']))
      .toContain('verified_revenue_user_entity');
  });
});

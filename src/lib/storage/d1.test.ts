import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const state = vi.hoisted(() => ({ env: null as Record<string, unknown> | null, vars: {} as Record<string, string> }));
vi.mock('../runtime/cloudflare', () => ({ getCloudflareRuntimeEnv: async () => state.env, getRuntimeEnvValue: async (name: string) => state.vars[name] }));
import { queryD1, executeD1, batchD1 } from './d1';
beforeEach(() => { state.env = null; state.vars = {}; });
afterEach(() => vi.unstubAllGlobals());
const result = { success: true, results: [{ id: 'one' }], meta: { changes: 1, last_row_id: 3 } };
describe('D1 transport', () => {
  it('fails closed without configuration', async () => { await expect(queryD1('SELECT 1')).rejects.toThrow('unavailable'); });
  it('binds values and validates records returned by Workers', async () => {
    const bind = vi.fn(() => ({})); const prepare = vi.fn(() => ({ bind }));
    state.env = { APP_DB: { prepare, batch: async () => [result] } };
    expect(await queryD1('SELECT id WHERE owner=?', ["x' OR 1=1"], (value) => (value as { id: string }).id)).toEqual(['one']);
    expect(bind).toHaveBeenCalledWith("x' OR 1=1");
    expect(await executeD1('UPDATE test SET x=?', [1])).toEqual({ changes: 1, lastRowId: 3 });
  });
  it('rejects provider failure and malformed data instead of returning empty records', async () => {
    for (const raw of [{ success: false, results: [] }, { success: true, results: null }]) {
      state.env = { APP_DB: { prepare: () => ({ bind: () => ({}) }), batch: async () => [raw] } };
      await expect(queryD1('SELECT 1')).rejects.toThrow();
    }
  });
  it('refuses unproven transactional REST batches before network access', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(batchD1([{ sql: 'INSERT INTO a VALUES(1)' }, { sql: 'INSERT INTO b VALUES(2)' }])).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses explicit Node credentials and sends SQL parameters in the body', async () => {
    state.vars = { CLOUDFLARE_ACCOUNT_ID: 'account', CLOUDFLARE_API_TOKEN: 'test-only', APP_D1_DATABASE_ID: 'database' };
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ success: true, result: [result] }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await batchD1([{ sql: 'UPDATE x SET owner=?', params: ['uid'] }])).toEqual([{ changes: 1, lastRowId: 3 }]);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ sql: 'UPDATE x SET owner=?', params: ['uid'] });
  });
});
it('actual SQLite migration enforces unique ownership and atomic bookmark toggles', () => {
  const sql = readFileSync(new URL('../../../migrations/d1/0001_users.sql', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../../../migrations/d1/0003_chat_columns.sql', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../../../migrations/d1/0004_newsletter_privacy.sql', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../../../migrations/d1/0005_request_rate_limits.sql', import.meta.url), 'utf8');
  const code = `import sqlite3,sys\ndb=sqlite3.connect(':memory:')\ndb.executescript(sys.stdin.read())\nassert 'legacy_is_pro' not in [r[1] for r in db.execute('PRAGMA table_info(chat_messages)')]\nassert 'legacy_is_pro' in [r[1] for r in db.execute('PRAGMA table_info(users)')]\nassert 'user_id' in [r[1] for r in db.execute('PRAGMA table_info(newsletter_subscribers)')]\nassert 'unsubscribe_token_hash' in [r[1] for r in db.execute('PRAGMA table_info(newsletter_subscribers)')]\nassert 'request_count' in [r[1] for r in db.execute('PRAGMA table_info(request_rate_limits)')]\nq='INSERT INTO bookmarks(user_id,item_type,item_id,saved) VALUES(?,?,?,1) ON CONFLICT(user_id,item_type,item_id) DO UPDATE SET saved=1-bookmarks.saved RETURNING saved'\nassert db.execute(q,('a','business','same')).fetchone()[0]==1\nassert db.execute(q,('a','business','same')).fetchone()[0]==0\nassert db.execute(q,('b','business','same')).fetchone()[0]==1\nassert db.execute('SELECT count(*) FROM bookmarks WHERE user_id=? AND saved=1',('a',)).fetchone()[0]==0\nassert db.execute('SELECT count(*) FROM bookmarks WHERE user_id=? AND saved=1',('b',)).fetchone()[0]==1\nprint('schema and owner isolation passed')`;
  const run = spawnSync('python3', ['-c', code], { input: sql, encoding: 'utf8' });
  expect(run.status, run.stderr).toBe(0);
});

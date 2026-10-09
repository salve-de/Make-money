import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureCaseMedia, formatRows, type EnsureDeps, type MediaCounts } from './ensure-case-media';

const none: MediaCounts = { allowed: 0, allowedIcons: 0, held: 0, hasManifest: false };

function fake(over: Partial<EnsureDeps> & { state?: Record<string, MediaCounts>; afterFetch?: MediaCounts }) {
  const calls: string[] = [];
  const state = { ...(over.state ?? {}) };
  const deps: EnsureDeps = {
    run: async (script, args) => {
      calls.push(`${script.split('/').pop()} ${args[1]}`);
      if (script.includes('fetch-official')) state[args[1]] = over.afterFetch ?? { allowed: 2, allowedIcons: 1, held: 0, hasManifest: true };
      return { code: 0, output: '' };
    },
    hasStoreRecord: async () => false,
    count: async (id) => state[id] ?? none,
    refusal: () => null,
    log: () => {},
    ...over,
  };
  return { deps, calls };
}

test('取得済みの事例は取り直さない', async () => {
  const { deps, calls } = fake({ state: { a: { allowed: 3, allowedIcons: 1, held: 0, hasManifest: true } } });
  const rows = await ensureCaseMedia(['a'], { refresh: false, root: '/x' }, deps);
  assert.deepEqual(calls, []);
  assert.equal(rows[0].action, 'already');
});

test('--refresh の時だけ取り直す', async () => {
  const { deps, calls } = fake({ state: { a: { allowed: 3, allowedIcons: 1, held: 0, hasManifest: true } } });
  await ensureCaseMedia(['a'], { refresh: true, root: '/x' }, deps);
  assert.deepEqual(calls.map((c) => c.split(' ')[0]), ['fetch-official-assets.ts', 'auto-review.ts']);
});

test('無ければ 公式 → App Store（記録がある時だけ）→ 自動判定 の順に呼ぶ', async () => {
  const { deps, calls } = fake({ hasStoreRecord: async (id) => id === 'b' });
  await ensureCaseMedia(['a', 'b'], { refresh: false, root: '/x' }, deps);
  assert.deepEqual(calls.map((c) => c.split(' ')[0]), ['fetch-official-assets.ts', 'auto-review.ts', 'fetch-official-assets.ts', 'fetch-app-store-assets.ts', 'auto-review.ts']);
});

test('robots で断られた事例は飛ばし、理由を出す', async () => {
  const { deps, calls } = fake({ refusal: () => '公式サイトが robots.txt で取得を禁じている' });
  const rows = await ensureCaseMedia(['pinboard'], { refresh: false, root: '/x' }, deps);
  assert.deepEqual(calls, []);
  assert.equal(rows[0].action, 'refused');
  assert.match(formatRows(rows).join('\n'), /飛ばした（公式サイトが robots\.txt/);
});

test('保留が残っても止まらず、人の目で見ると事例IDつきで出す', async () => {
  const { deps } = fake({ afterFetch: { allowed: 1, allowedIcons: 1, held: 2, hasManifest: true } });
  const rows = await ensureCaseMedia(['a', 'b'], { refresh: false, root: '/x' }, deps);
  assert.equal(rows.length, 2);
  const text = formatRows(rows).join('\n');
  assert.match(text, /保留あり：人の目で見る a/);
  assert.match(text, /保留あり：人の目で見る b/);
  assert.match(text, /上げる命令/);
});

test('子の命令が失敗しても次の事例へ進む', async () => {
  const { deps } = fake({ run: async () => ({ code: 1, output: 'x' }) });
  const rows = await ensureCaseMedia(['a', 'b'], { refresh: false, root: '/x' }, deps);
  assert.equal(rows.length, 2);
  assert.match(rows[0].note ?? '', /終了コード 1/);
});

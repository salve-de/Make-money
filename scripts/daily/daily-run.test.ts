// 偽の呼び出しだけで、毎日の流れの通しを確かめる（本物の AI・公開・本番は呼ばない）
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { alertAbnormal, dayFile, lastSuccessDate, runDaily, type DayRecord, type Deps, type ExecResult, type Options } from './daily-run';

const SITE = 'https://example.test';
const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '' });

function fixture(published = 2) {
  const root = mkdtempSync(join(tmpdir(), 'daily-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  const details = Object.fromEntries(Array.from({ length: published }, (_, i) => [`old${i}`, 'h']));
  writeFileSync(join(root, 'data/catalog-release.json'), JSON.stringify({ publishedCount: published, details, summaries: { hash: 'abcdef123456789' } }));
  return root;
}
interface Script { discoverIds?: string; researchIds?: string; passed?: string[]; failures?: { id: string; reason: string }[]; withdrawn?: string[]; publishCode?: number; catalogTotal?: (published: boolean) => number; hasDiscover?: boolean; discoverCode?: number }
function make(root: string, s: Script = {}) {
  let clock = 1_700_000_000_000; const calls: string[] = []; let published = false; const issues: { title: string; body?: string }[] = []; const comments: number[] = []; const notices: string[] = [];
  const exec: Deps['exec'] = async (argv) => {
    const line = argv.join(' '); calls.push(line);
    if (line.startsWith('pnpm case:discover')) return { code: s.discoverCode ?? 0, stdout: s.discoverIds ? `DAILY_IDS=${s.discoverIds}\n` : '', stderr: s.discoverCode ? 'エラー' : '' };
    if (line.startsWith('pnpm case:research')) return ok(s.researchIds ? `DAILY_IDS=${s.researchIds}\n` : '');
    if (line.includes('case:run') && !line.includes('--publish')) {
      const id = argv[argv.indexOf('--run-id') + 1];
      mkdirSync(join(root, 'data/pipeline/case-run', id), { recursive: true });
      writeFileSync(join(root, 'data/pipeline/case-run', id, 'summary.json'), JSON.stringify({ passed: s.passed ?? [], failures: s.failures ?? [] }));
      // 本物の prepare と同じく、通った事例を手元の目録に入れる
      const rel = JSON.parse(readFileSync(join(root, 'data/catalog-release.json'), 'utf8'));
      for (const p of s.passed ?? []) rel.details[p] = 'h';
      writeFileSync(join(root, 'data/catalog-release.json'), JSON.stringify(rel));
      return ok();
    }
    if (line.includes('prepare-catalog-release')) return ok(`log\n${JSON.stringify({ dryRun: true, plan: { withdrawn: s.withdrawn ?? [] }, canApply: !(s.withdrawn ?? []).length })}`);
    if (line.includes('--publish')) { published = true; return { code: s.publishCode ?? 0, stdout: '', stderr: '' }; }
    if (line.includes('check-freshness')) return { code: 2, stdout: '', stderr: '' };
    if (line.startsWith('git diff --cached')) return { code: 1, stdout: '', stderr: '' }; // 変更あり
    if (line.startsWith('gh pr list')) return ok('[]');
    if (line.startsWith('gh issue list')) return ok(JSON.stringify(issues.map((x, i) => ({ number: i + 1, title: x.title }))));
    if (line.startsWith('gh issue create')) { issues.push({ title: argv[argv.indexOf('--title') + 1] }); return ok(); }
    if (line.startsWith('gh issue comment')) { comments.push(Number(argv[3])); return ok(); }
    return ok();
  };
  const ids = [...(s.passed ?? [])];
  const deps: Deps = {
    exec, now: () => (clock += 1000), sleep: async () => undefined, notify: async (_t, b) => { notices.push(b); },
    hasScript: (n) => (n === 'case:discover' || n === 'case:research' ? s.hasDiscover !== false : true),
    fetchJson: async (url) => {
      if (url.includes('/api/health')) return { status: 'ok', release: 'abcdef123456' };
      if (url.includes('/api/businesses')) {
        const id = decodeURIComponent(url.split('entity_id=')[1]);
        if (!published || !ids.includes(id)) throw new Error('404');
        return { data: { id, reader: { display: { listLine: { text: '一行' } } } } };
      }
      const total = s.catalogTotal ? s.catalogTotal(published) : 2 + (published ? ids.length : 0);
      return { data: [], total, generationCounts: { 1: total }, nextOffset: null };
    },
  };
  return { deps, calls, issues, comments, notices };
}
const opts = (root: string, over: Partial<Options> = {}): Options => ({ root, date: '2026-10-08', dryRun: false, force: false, ids: [], count: 10, next: 5, cap: 3, siteUrl: SITE, verifyWaitMs: 60_000, log: () => undefined, ...over });

test('通しの正常系: 発見→調査→仕上げ→公開→本番の確認、知らせなし', async () => {
  const root = fixture();
  const m = make(root, { discoverIds: 'n1', researchIds: 'n2', passed: ['n1', 'n2'], catalogTotal: () => 2 });
  // 公開後の手元の版は件数2のまま（偽の公開は版を変えない）ので、本番も2件で一致する
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.ok, true, JSON.stringify(rec.abnormal));
  assert.equal(rec.counts.published, 2);
  assert.ok(m.calls.some((c) => c.includes('case:run') && c.includes('--from publish --publish')));
  assert.equal((await alertAbnormal(rec, m.deps)).length, 0);
  assert.equal(m.issues.length, 0); assert.equal(m.notices.length, 0);
  const saved = JSON.parse(readFileSync(dayFile(root, '2026-10-08', false), 'utf8')) as DayRecord;
  assert.equal(saved.status, 'DONE'); assert.equal(saved.verify?.checks.find((c) => c.name === '鮮度の確認')?.status, 'skipped');
});

test('1日の上限: 4件見つかっても3件だけ仕上げ、残りは持ち越し', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'a,b,c,d', passed: ['a', 'b', 'c'], catalogTotal: () => 2 });
  const rec = await runDaily(opts(root), m.deps);
  assert.deepEqual(rec.deferred, ['d']);
  assert.ok(m.calls.some((c) => c.includes('--ids a,b,c ')));
});

test('失敗した日は issue が立ち、同じ理由が開いていればコメントを足す', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'x', passed: [], failures: [{ id: 'x', reason: '原文照合に落ちた' }] });
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.ok, false);
  await alertAbnormal(rec, m.deps);
  assert.equal(m.issues.length, 1); assert.match(m.issues[0].title, /^毎日の自動実行で異常: 2026-10-08・/); assert.ok(m.notices.length >= 1);
  await alertAbnormal(rec, m.deps);
  assert.equal(m.issues.length, 1); assert.ok(m.comments.length >= 1);
});

test('候補探しが失敗した日も記録され、異常になる', async () => {
  const root = fixture(); const m = make(root, { discoverCode: 1 });
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.stages.discover.status, 'failed'); assert.equal(rec.ok, false);
});

test('2日止まると見張りが知らせる', async () => {
  const root = fixture(); const m = make(root);
  mkdirSync(join(root, 'data/pipeline/daily'), { recursive: true });
  writeFileSync(join(root, 'data/pipeline/daily/2026-10-04.json'), JSON.stringify({ ok: true, dryRun: false }));
  assert.equal(lastSuccessDate(root, '2026-10-08'), '2026-10-04');
  const rec = await runDaily(opts(root), m.deps);
  assert.ok(rec.abnormal.some((a) => a.key === 'stall'));
  assert.equal(rec.ok, true, '止まりの知らせだけなら、今回の実行は成功として基準を更新する');
  // 2日前なら止まりとみなさない
  const root2 = fixture(); const m2 = make(root2);
  mkdirSync(join(root2, 'data/pipeline/daily'), { recursive: true });
  writeFileSync(join(root2, 'data/pipeline/daily/2026-10-06.json'), JSON.stringify({ ok: true, dryRun: false }));
  assert.ok(!(await runDaily(opts(root2), m2.deps)).abnormal.some((a) => a.key === 'stall'));
});

test('取り下げの判定が出ると公開が止まり、知らせが出る', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], withdrawn: ['old0'] });
  const rec = await runDaily(opts(root), m.deps);
  assert.ok(!m.calls.some((c) => c.includes('--publish')), '公開の命令が呼ばれた');
  assert.ok(rec.abnormal.some((a) => a.key === 'withdraw')); assert.equal(rec.counts.published, 0);
});

test('本番の件数が公開した版と合わないと異常', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 1 });
  const rec = await runDaily(opts(root), m.deps);
  assert.ok(rec.abnormal.some((a) => a.key === 'verify'));
});

test('途中で止まった日は、次の起動で終えた段を飛ばして続きから進む', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], publishCode: 1, catalogTotal: () => 2 });
  const first = await runDaily(opts(root), m.deps);
  assert.equal(first.stages.run.status, 'failed');
  const m2 = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 2 });
  const second = await runDaily(opts(root), m2.deps);
  assert.ok(!m2.calls.some((c) => c.startsWith('pnpm case:discover') || c.startsWith('pnpm case:research')), '終えた段をやり直した');
  assert.equal(second.stages.run.status, 'ok');
});

test('--dry-run は公開しない。発見と調査の命令が無い間は飛ばして続ける', async () => {
  const root = fixture(); const m = make(root, { hasDiscover: false, passed: [], catalogTotal: () => 2 });
  const rec = await runDaily(opts(root, { dryRun: true, ids: ['n1'] }), m.deps);
  assert.equal(rec.stages.discover.status, 'skipped');
  assert.ok(!m.calls.some((c) => c.includes('--publish')));
  assert.equal(lastSuccessDate(root), null, '公開なしの試しは成功の日に数えない');
});

test('公開に失敗した事例は、翌日の起動で公開だけやり直す(取りこぼさない)', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], publishCode: 1, catalogTotal: () => 2 });
  const day1 = await runDaily(opts(root), m.deps);
  assert.deepEqual(day1.pending, ['n1']);
  const m2 = make(root, { passed: [], catalogTotal: () => 2 });
  const day2 = await runDaily(opts(root, { date: '2026-10-09' }), m2.deps);
  assert.ok(m2.calls.some((c) => c.includes('--from publish --publish') && c.includes('--ids n1')));
  assert.deepEqual(day2.pending, []); assert.equal(day2.counts.published, 1);
});

test('上限を超えた分は翌日に持ち越して仕上げる', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'a,b,c,d', passed: ['a', 'b', 'c'], catalogTotal: () => 2 });
  await runDaily(opts(root), m.deps);
  const m2 = make(root, { passed: ['d'], catalogTotal: () => 2 });
  await runDaily(opts(root, { date: '2026-10-09' }), m2.deps);
  assert.ok(m2.calls.some((c) => c.includes('case:run') && c.includes('--ids d ')));
});

test('公開した日は、公開データを変更の申請に残す。公開なしの日は残さない', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 2 });
  await runDaily(opts(root), m.deps);
  assert.ok(m.calls.some((c) => c.startsWith('git commit')) && m.calls.some((c) => c.startsWith('gh pr create')));
  const root2 = fixture(); const m2 = make(root2, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 2 });
  await runDaily(opts(root2, { dryRun: true }), m2.deps);
  assert.ok(!m2.calls.some((c) => c.startsWith('git commit')));
});

test('公開の直後に本番の版が遅れて追いつく場合は、待ってから判定する', async () => {
  const root = fixture(); let n = 0;
  const m = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => (++n <= 2 ? 2 : 3) });
  writeFileSync(join(root, 'data/catalog-release.json'), JSON.stringify({ publishedCount: 3, details: { old0: 'h', old1: 'h' }, summaries: { hash: 'abcdef123456789' } }));
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.verify?.ok, true, JSON.stringify(rec.verify?.checks));
});

test('公開なしの試しで作った公開データも、次の本番の実行で公開される', async () => {
  const root = fixture(); const m = make(root, { passed: ['n1'], catalogTotal: () => 2 });
  await runDaily(opts(root, { dryRun: true, ids: ['n1'], date: '2026-10-07' }), m.deps);
  assert.ok(!m.calls.some((c) => c.includes('--publish')));
  const m2 = make(root, { passed: [], catalogTotal: () => 2 });
  const rec = await runDaily(opts(root, { date: '2026-10-08' }), m2.deps);
  assert.ok(m2.calls.some((c) => c.includes('--ids n1') && c.includes('--publish')));
  assert.deepEqual(rec.publishedIds, ['n1']);
});

test('公開のあとの記録(commit/申請)が失敗しても、同じ日の再開でやり直す', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 2 });
  const base = m.deps.exec; let failGit = true;
  m.deps.exec = async (argv, env) => (argv[0] === 'git' && argv[1] === 'commit' && failGit ? { code: 1, stdout: '', stderr: 'x' } : base(argv, env));
  const first = await runDaily(opts(root), m.deps);
  assert.equal(first.stages['record-data'].status, 'failed');
  failGit = false;
  const second = await runDaily(opts(root), m.deps);
  assert.equal(second.stages['record-data'].status, 'ok'); assert.equal(second.ok, true);
});

test('case:run が結果を書けずに落ちた時、前回の結果を使って公開しない', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1' });
  mkdirSync(join(root, 'data/pipeline/case-run/daily-2026-10-08'), { recursive: true });
  writeFileSync(join(root, 'data/pipeline/case-run/daily-2026-10-08/summary.json'), JSON.stringify({ passed: ['n1'], failures: [] })); // 前回の結果
  const base = m.deps.exec;
  m.deps.exec = async (argv, env) => (argv.join(' ').includes('case:run') ? { code: 1, stdout: '', stderr: '落ちた' } : base(argv, env));
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.stages.run.status, 'failed');
  assert.ok(!m.calls.some((c) => c.includes('--publish')));
});

test('公開した全件の画面の文を確かめる。鍵が無い(終了コード78)時は鮮度の確認だけ飛ばす', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1,n2', passed: ['n1', 'n2'], catalogTotal: () => 2 });
  const base = m.deps.fetchJson; const baseExec = m.deps.exec;
  m.deps.fetchJson = async (url) => { if (url.includes('entity_id=n2')) throw new Error('404'); return base(url); };
  m.deps.exec = async (argv, env) => (argv.join(' ').includes('check-freshness') ? { code: 78, stdout: '', stderr: '' } : baseExec(argv, env));
  const rec = await runDaily(opts(root), m.deps);
  assert.equal(rec.verify?.checks.find((c) => c.name === '新しい事例の詳細')?.status, 'problem');
  assert.equal(rec.verify?.checks.find((c) => c.name === '鮮度の確認')?.status, 'skipped');
});

test('記録の途中(commit済みで push が失敗)から再開しても、続きの段から進む', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'n1', passed: ['n1'], catalogTotal: () => 2 });
  const base = m.deps.exec; let failPush = true; let committed = false;
  m.deps.exec = async (argv, env) => {
    const line = argv.join(' ');
    if (line.startsWith('git commit')) committed = true;
    if (line.startsWith('git diff --cached')) return { code: committed ? 0 : 1, stdout: '', stderr: '' }; // commit 済みなら変更なし
    if (line.startsWith('git push') && failPush) return { code: 1, stdout: '', stderr: 'x' };
    return base(argv, env);
  };
  assert.equal((await runDaily(opts(root), m.deps)).stages['record-data'].status, 'failed');
  failPush = false;
  const second = await runDaily(opts(root), m.deps);
  assert.equal(second.stages['record-data'].status, 'ok'); assert.ok(m.calls.some((c) => c.startsWith('gh pr create')));
});

test('--force でも、今日の持ち越しと公開した記録は消えない', async () => {
  const root = fixture(); const m = make(root, { researchIds: 'a,b,c,d', passed: ['a', 'b', 'c'], catalogTotal: () => 2 });
  const first = await runDaily(opts(root), m.deps);
  assert.deepEqual(first.deferred, ['d']);
  const m2 = make(root, { passed: [], catalogTotal: () => 2 });
  const forced = await runDaily(opts(root, { force: true }), m2.deps);
  assert.deepEqual(forced.publishedIds, ['a', 'b', 'c']);
  assert.ok(forced.ids.includes('d'));
});

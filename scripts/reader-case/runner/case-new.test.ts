import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { codexLocked, makeCaller, pickAgent } from '../agent-call';
import { CODEX_ONLY_ENV, formatNewSummary, runNew, type Exec, type NewOptions } from '../case-new';

const row = (id: string, status: string, extra: Record<string, unknown> = {}) => JSON.stringify({ id, name: id, status, ...extra });

function setup(rows: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'case-new-'));
  mkdirSync(join(root, 'data/candidates'), { recursive: true });
  writeFileSync(join(root, 'data/candidates/queue.jsonl'), `${rows.join('\n')}\n`);
  return root;
}
const opts = (root: string, extra: Partial<NewOptions> = {}): NewOptions => ({ root, runId: 'r1', candidateIds: [], concurrency: 2, effort: 'medium', researchEffort: 'high', writeEffort: 'high', publish: false, log: () => {}, ...extra });

/** 偽の命令実行。呼んだ名前・引数・環境変数を記録する */
function fake(calls: { name: string; argv: string[]; env: Record<string, string> }[], handler: (name: string, argv: string[]) => { code?: number; stdout?: string } = () => ({})): Exec {
  return async (name, argv, env) => { calls.push({ name, argv, env }); const r = handler(name, argv); return { code: r.code ?? 0, stdout: r.stdout ?? '', stderr: '' }; };
}

test('case:new: 候補探し→調査→索引→画像→通し→検査の順で、どの段も Codex 固定で呼ぶ', async () => {
  const root = setup([row('c1', 'queued')]);
  const calls: { name: string; argv: string[]; env: Record<string, string> }[] = [];
  const exec = fake(calls, (name) => {
    if (name === 'discover') return { stdout: `{"runId":"x","added":["c1"]}\n` };
    if (name === 'research') { writeFileSync(join(root, 'data/candidates/queue.jsonl'), `${row('c1', 'done', { entityId: 'ent_c1' })}\n`); return {}; }
    if (name === 'media') return { stdout: '保留あり：ent_c1 2枚\n' };
    return {};
  });
  const s = await runNew(opts(root, { count: 1 }), exec, { indexIds: () => new Set() });
  assert.deepEqual(calls.map((c) => c.name), ['discover', 'research', 'index-apply', 'registry-sync', 'media', 'media-refresh', 'run', 'case-pages-check', 'case-tags-check', 'case-text-verify']);
  for (const c of calls) assert.equal(c.env.CASE_AGENT_LOCK, CODEX_ONLY_ENV.CASE_AGENT_LOCK);
  const argvOf = (n: string) => calls.find((c) => c.name === n)!.argv.join(' ');
  assert.match(argvOf('discover'), /--agent codex/);
  assert.match(argvOf('research'), /--agent codex.*--repair-agent codex.*--codex-effort high/);
  assert.match(argvOf('run'), /--agent codex.*--write-effort high/);
  assert.doesNotMatch(argvOf('run'), /--publish/);
  assert.deepEqual(s.passed, ['ent_c1']);
  assert.ok(s.ok);
  assert.deepEqual(s.humanLook, ['画像: 保留あり：ent_c1 2枚']);
  assert.match(formatNewSummary(s), /http:\/\/localhost:3070\/\?entity=ent_c1/);
});

test('case:new: 取り込み済みの候補は調べ直さず、見送りは理由つきで落ちた一覧に出る。公開は --publish の時だけ', async () => {
  const root = setup([row('c1', 'done', { entityId: 'ent_c1' }), row('c2', 'skipped', { skipReason: '薄い事例' })]);
  const calls: { name: string; argv: string[]; env: Record<string, string> }[] = [];
  const s = await runNew(opts(root, { candidateIds: ['c1', 'c2'], publish: true }), fake(calls), { indexIds: () => new Set(['ent_c1']) });
  assert.ok(!calls.some((c) => c.name === 'research' || c.name === 'index-apply'));
  assert.match(calls.find((c) => c.name === 'run')!.argv.join(' '), /--publish/);
  assert.deepEqual(s.failures.map((f) => [f.id, f.stage]), [['c2', 'research']]);
  assert.match(s.failures[0].reason, /薄い事例/);
});

test('case:new: case:run が落とした事例は落ちた一覧に理由つきで出て、状態は保存され続きから流せる', async () => {
  const root = setup([row('c1', 'done', { entityId: 'ent_c1' })]);
  mkdirSync(join(root, 'data/pipeline/case-run/r1-run'), { recursive: true });
  writeFileSync(join(root, 'data/pipeline/case-run/r1-run/summary.json'), JSON.stringify({ failures: [{ id: 'ent_c1', stage: 'display', reason: '照合に通らなかった' }] }));
  const calls: { name: string; argv: string[]; env: Record<string, string> }[] = [];
  const s = await runNew(opts(root, { candidateIds: ['c1'] }), fake(calls), { indexIds: () => new Set(['ent_c1']) });
  assert.deepEqual(s.passed, []);
  assert.equal(s.failures[0].stage, 'display');
  const state = JSON.parse(readFileSync(join(root, 'data/pipeline/case-new/r1/state.json'), 'utf8'));
  assert.deepEqual(state.entityIds, ['ent_c1']);
  // 同じ実行名で再開: 探す段は飛ばす（候補が状態に残っている）
  const calls2: { name: string; argv: string[]; env: Record<string, string> }[] = [];
  await runNew(opts(root, { from: 'run' }), fake(calls2), { indexIds: () => new Set(['ent_c1']) });
  assert.ok(!calls2.some((c) => c.name === 'discover' || c.name === 'media'));
});

test('Codex 固定: claude を選んでも codex になる（pickAgent・makeCaller）', () => {
  const before = process.env.CASE_AGENT_LOCK;
  try {
    process.env.CASE_AGENT_LOCK = 'codex';
    assert.ok(codexLocked());
    assert.equal(pickAgent('claude'), 'codex');
    assert.equal(pickAgent('auto'), 'codex');
    assert.equal(typeof makeCaller('claude', { model: 'opus' }), 'function');
  } finally { if (before === undefined) delete process.env.CASE_AGENT_LOCK; else process.env.CASE_AGENT_LOCK = before; }
  assert.equal(codexLocked(), false);
});

test('オーナーの指示の1枚（OWNER_RULES）が、Codex の全部の段の指示に入る', async () => {
  const { directPrompt } = await import('./agent-run');
  const { collectSystem } = await import('../case-research');
  const { discoverSystem } = await import('../case-discover');
  const root = new URL('../../..', import.meta.url).pathname;
  const marker = '### docs/owner/OWNER_RULES.md';
  const read = (f: string) => readFileSync(join(root, f), 'utf8');
  assert.ok(discoverSystem(root).includes(marker), '候補探し');
  assert.ok(collectSystem(root).includes(marker), '調べる（直しも同じ指示）');
  for (const stage of ['verify', 'analyze', 'audit'] as const) {
    assert.ok(directPrompt({ root, stage }, { attempts: 0, lastRejections: [] }, read).system.includes(marker), stage);
  }
  // 書く・照らす・読む・直すは case-write.test.ts で確かめる
});

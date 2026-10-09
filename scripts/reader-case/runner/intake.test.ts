/* eslint-disable @typescript-eslint/no-explicit-any -- テストは AI の応答を任意の形に組み替えるため */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Caller } from '../agent-call';
import { buildDedupIndex, claimTarget, extractJson, parseClaimedLine, priorityOf, readQueue, recencyScore, toCandidate, updateCandidates, writeQueue } from '../candidates-lib';
import { runDiscover } from '../case-discover';
import { runResearch, type Compact } from '../case-research';
import type { Exec } from '../case-run';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const keygen = (JSON.parse(readFileSync(join(repo, 'docs/research-record/keygen.example.json'), 'utf8')) as any[])[0];

function setupRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'intake-'));
  mkdirSync(join(root, 'data/candidates'), { recursive: true });
  mkdirSync(join(root, 'scripts/reader-case'), { recursive: true });
  copyFileSync(join(repo, 'scripts/reader-case/discover-prompt.md'), join(root, 'scripts/reader-case/discover-prompt.md'));
  copyFileSync(join(repo, 'scripts/reader-case/collect-prompt.md'), join(root, 'scripts/reader-case/collect-prompt.md'));
  writeFileSync(join(root, 'data/entities-index.json'), JSON.stringify([{ id: 'ent_old', name: 'Old Corp', url: 'https://www.oldcorp.com' }]));
  writeFileSync(join(root, 'data/CLAIMED_TARGETS.txt'), '# 予約\nClaimed Co — claimed.io [CLAIMED:x @ 2026-10-01]\nPlain Name (PLN)\n');
  try { symlinkSync(join(repo, 'node_modules'), join(root, 'node_modules')); } catch { /* 既にある */ }
  return root;
}

const raw = (name: string, url: string, quote = 'we made $10k MRR in 2025'): any => ({
  name, officialUrl: url, sources: [{ url: `${url}/blog/revenue`, quote, what: '月間売上' }],
  reason: `${name} は月1万ドルを自分のブログで公表している`, numberYear: 2025, certainty: 5, novelty: 3, modelTag: 'テスト',
});
const callerOf = (candidates: any[]): Caller => async () => ({ text: JSON.stringify({ candidates }), seconds: 0 });

test('部品: 予約の行の読み取り・優先度・JSON の取り出し', () => {
  assert.deepEqual(parseClaimedLine('Pulse AI — pulseapp.ai [CLAIMED:codex @ 2026-09-16]').domains, ['pulseapp.ai']);
  assert.ok(parseClaimedLine('Costco Wholesale Corporation (COSTCO)').names.includes('Costco Wholesale Corporation'));
  assert.deepEqual(parseClaimedLine('# コメント'), { names: [], domains: [] });
  assert.equal(priorityOf({ certainty: 5, recency: 5, novelty: 5 }), 100);
  assert.equal(recencyScore(2025, 2026), 5);
  assert.equal(recencyScore(2010, 2026), 1);
  assert.deepEqual(extractJson('前置き\n```json\n{"a":[1,2]}\n```\n後ろ'), { a: [1, 2] });
  assert.equal(extractJson('JSONなし'), undefined);
  assert.equal(toCandidate({ name: 'X', officialUrl: 'https://x.com', sources: [], reason: 'r' }, 'run').ok, false);
});

test('重複の索引: 既存の事例・予約の一覧・queue を社名とドメインで照らす', () => {
  const root = setupRoot();
  const t = toCandidate(raw('Queued', 'https://queued.dev'), 'r'); assert.ok(t.ok);
  const idx = buildDedupIndex(root, [(t as any).candidate]);
  assert.match(idx.check('Old Corporation', 'https://oldcorp.com/') ?? '', /同じ公式サイト/);
  assert.match(idx.check('Claimed Co', 'https://other.example') ?? '', /同じ社名/);
  assert.match(idx.check('Whatever', 'https://claimed.io') ?? '', /同じ公式サイト/);
  assert.match(idx.check('Plain Name', 'https://plain.example') ?? '', /同じ社名/);
  assert.match(idx.check('Queued', 'https://x.example') ?? '', /候補の一覧/);
  assert.equal(idx.check('Brand New', 'https://brand-new.io'), undefined);
});

test('case:discover: 重複・出典の引用が本文に無い候補は足さず、残りを優先度順に queue へ足す', async () => {
  const root = setupRoot();
  const caller = callerOf([
    raw('Old Corp', 'https://oldcorp.com'), // 既存の事例と同じ
    raw('Another', 'https://claimed.io'), // 予約の一覧と同じドメイン
    raw('Fake Quote', 'https://fake.dev', 'FAKE QUOTE'), // 引用が本文に無い
    raw('Good One', 'https://good.dev'),
    raw('Good One', 'https://good.dev'), // 同じ回の中の重複
    { name: 'No Source', officialUrl: 'https://nosource.dev', sources: [], reason: 'r' },
    raw('Second', 'https://second.dev'),
  ]);
  const check = async (_u: string, q: string) => (q === 'FAKE QUOTE' ? 'missing' as const : 'ok' as const);
  const s = await runDiscover({ root, count: 2, runId: 't1', concurrency: 1, rounds: 1, log: () => {} }, { caller, check });
  assert.deepEqual(s.added.map((c) => c.name).sort(), ['Good One', 'Second']);
  const q = readQueue(root);
  assert.equal(q.length, 2);
  assert.ok(q.every((c) => c.status === 'queued' && c.sources.length >= 1 && c.reason && c.priority > 0));
  const reasons = s.rejected.map((r) => r.reason).join('|');
  assert.match(reasons, /重複/); assert.match(reasons, /引用が出典の本文に無い/); assert.match(reasons, /出典/);
  const timing = readFileSync(join(root, 'data/pipeline/case-run.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(timing.some((t) => t.stage.startsWith('discover:ai')) && timing.some((t) => t.stage.startsWith('discover:verify')));
  // 2回目: 同じ候補は queue と照らして足されない
  const s2 = await runDiscover({ root, count: 1, runId: 't2', concurrency: 1, rounds: 1, log: () => {} }, { caller, check });
  assert.equal(s2.added.length, 0);
  assert.equal(readQueue(root).length, 2);
});

test('case:discover: 数字の出典を取得できない候補は足さない', async () => {
  const root = setupRoot();
  const s = await runDiscover({ root, count: 1, runId: 't3', concurrency: 1, rounds: 1, log: () => {} }, { caller: callerOf([raw('Unreachable', 'https://unreach.dev')]), check: async () => 'unreachable' });
  assert.equal(s.added.length, 0);
  assert.match(s.rejected[0]!.reason, /取得できず/);
});

// ---- case:research ---------------------------------------------------------------------

const compactFromKeygen = (): Compact => ({
  name: 'Keygen', tagline: keygen.tagline, description: keygen.description, sector: 'NICHE_SAAS', scale: 'SOLO', founder: keygen.founder, country: '未確認',
  architecturePattern: keygen.architecturePattern, tags: keygen.tags, foundedYear: 2016,
  caseTags: { field: '開発・IT', form: 'ソフト・アプリ', buyer: '開発者向け', features: [], basis: '公式サイトの説明にある、開発者向けの使用許諾の管理サービス' },
  facts: keygen.facts.map((f: any) => ({ ...f })),
  metrics: [...keygen.metrics.map((m: any) => ({ ...m })), { numberKind: 'REVENUE', amount: 10000, currency: 'USD', periodKind: 'MONTH', label: '月間の継続収入', asOf: '2025', quote: 'we made $10k MRR in 2025', sourceUrl: 'https://keygen.sh/blog/revenue', origin: 'SELF_REPORTED' }],
  sources: keygen.reaudit.sources, unknown: ['売上・利益の金額は公表なし'], conflicts: [],
});
/** どの URL を取っても、引用に使う文を全部含んだ本文を返す */
const bodyOf = (c: Compact): string => `${[...(c.facts ?? []), ...(c.metrics ?? [])].map((x) => String(x.quote)).join(' . ')} ${'padding text. '.repeat(40)}`;

/** 本物の add-entity-records を、試験用の作業場所で流す Exec（registry:sync だけは何もしない） */
function realExec(root: string): Exec {
  return (name, argv) => new Promise((res) => {
    if (argv[0] === 'pnpm') { res({ code: 0, stdout: '', stderr: '' }); return; }
    const args = argv.map((a) => (a.startsWith('scripts/') ? join(repo, a) : a));
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; }); child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => res({ code: code ?? 1, stdout, stderr }));
  });
}

function queued(root: string, names: string[]): string[] {
  const rows = names.map((n) => (toCandidate(raw(n, `https://${n.toLowerCase()}.sh`, 'we made $10k MRR in 2025'), 'r') as any).candidate);
  writeQueue(root, rows); return rows.map((r) => r.id);
}

test('case:research: 記録を作り、add-entity-records に通り、一覧に入り、queue が done になる', async () => {
  const root = setupRoot(); writeFileSync(join(root, 'data/entities-index.json'), '[]');
  const [id] = queued(root, ['Keygen']);
  const compact = compactFromKeygen();
  const body = bodyOf(compact) + ' we made $10k MRR in 2025';
  const caller: Caller = async () => ({ text: JSON.stringify(compact), seconds: 0 });
  const s = await runResearch({ root, ids: [id!], runId: 'r1', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller, exec: realExec(root), fetchText: async () => body });
  assert.equal(s.outcomes[0]!.status, 'recorded', JSON.stringify(s.outcomes));
  assert.equal(s.outcomes[0]!.unconfirmed, 0);
  assert.equal(s.applied.length, 1);
  const index = JSON.parse(readFileSync(join(root, 'data/entities-index.json'), 'utf8'));
  assert.equal(index.length, 1);
  assert.equal(index[0].id, s.outcomes[0]!.entityId);
  assert.ok(existsSync(join(root, 'data/entity-additions/keygen.json')));
  assert.equal(readQueue(root)[0]!.status, 'done');
  // タグは一覧の言葉で data/case-tags.json に入る
  const tagsFile = JSON.parse(readFileSync(join(root, 'data/case-tags.json'), 'utf8'));
  assert.equal(tagsFile[index[0].id].field, '開発・IT');
  assert.ok(s.idsFile && readFileSync(s.idsFile, 'utf8').includes(index[0].id));
  assert.match(readFileSync(join(root, 'data/CLAIMED_TARGETS.txt'), 'utf8'), /Keygen — keygen\.sh \[CLAIMED:case-research-r1/);
  const timing = readFileSync(join(root, 'data/pipeline/case-run.jsonl'), 'utf8');
  for (const st of ['research:fetch', 'research:ai', 'research:import', 'research:apply']) assert.match(timing, new RegExp(st));
});

test('case:research: 数字の出典が取れない・引用が本文に無い候補は、記録を作らず見送りと理由を queue に書く', async () => {
  const root = setupRoot();
  const ids = queued(root, ['Nofetch', 'Wrongquote']);
  let aiCalls = 0;
  const caller: Caller = async () => { aiCalls++; return { text: '{}', seconds: 0 }; };
  const fetchText = async (u: string) => (u.includes('nofetch') ? '' : `別の内容のページ。${'x '.repeat(200)}`);
  const s = await runResearch({ root, ids, runId: 'r2', concurrency: 2, apply: true, today: '2026-10-08', log: () => {} }, { caller, exec: realExec(root), fetchText });
  assert.equal(aiCalls, 0);
  assert.deepEqual(s.outcomes.map((o) => o.status), ['skipped', 'skipped']);
  const q = readQueue(root);
  assert.match(q.find((c) => c.name === 'Nofetch')!.skipReason!, /取得できない/);
  assert.match(q.find((c) => c.name === 'Wrongquote')!.skipReason!, /本文に無い/);
  assert.ok(!existsSync(join(root, 'data/entity-additions')) || readFileSync(join(root, 'data/entities-index.json'), 'utf8').length > 0);
  assert.equal(s.idsFile, undefined);
});

test('case:research: タグが一覧の言葉でなければ書かず、直し役に返す。直ればタグが入る', async () => {
  const root = setupRoot(); writeFileSync(join(root, 'data/entities-index.json'), '[]');
  const [id] = queued(root, ['Keygen']);
  const bad = compactFromKeygen();
  bad.caseTags = { field: '内装のAI', form: 'ソフト・アプリ', buyer: '開発者向け', features: [], basis: 'x' };
  const good = compactFromKeygen();
  let calls = 0;
  const caller: Caller = async () => ({ text: JSON.stringify(calls++ === 0 ? bad : good), seconds: 0 });
  const body = bodyOf(good) + ' we made $10k MRR in 2025';
  const s = await runResearch({ root, ids: [id!], runId: 'r2t', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller, exec: realExec(root), fetchText: async () => body });
  assert.equal(s.outcomes[0]!.status, 'recorded', JSON.stringify(s.outcomes));
  assert.equal(calls, 2);
  const tagsFile = JSON.parse(readFileSync(join(root, 'data/case-tags.json'), 'utf8'));
  assert.equal(tagsFile[s.outcomes[0]!.entityId!].field, '開発・IT');
});

test('case:research: AI が返した引用が本文に無い数字は外れ、数字が残らなければ見送り', async () => {
  const root = setupRoot();
  const [id] = queued(root, ['Keygen']);
  const compact = compactFromKeygen();
  compact.metrics![compact.metrics!.length - 1]!.quote = 'an invented quotation that is not on the page';
  const caller: Caller = async () => ({ text: JSON.stringify(compact), seconds: 0 });
  // 候補の出典の引用だけを含み、AI が挙げた metrics の引用は含まない本文
  const fetchText = async () => `we made $10k MRR in 2025 ${'filler. '.repeat(60)}`;
  const s = await runResearch({ root, ids: [id!], runId: 'r3', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller, exec: realExec(root), fetchText });
  assert.equal(s.outcomes[0]!.status, 'skipped');
  assert.match(s.outcomes[0]!.reason!, /数字の出典が残らない/);
  assert.equal(readQueue(root)[0]!.status, 'skipped');
});

test('case:research: 創業も転機も無い薄い記録は見送り、取り込み待ちのファイルを残さない', async () => {
  const root = setupRoot(); writeFileSync(join(root, 'data/entities-index.json'), '[]');
  const [id] = queued(root, ['Keygen']);
  const compact = compactFromKeygen();
  compact.facts = compact.facts!.filter((f: any) => ['DESCRIPTION', 'PRICING'].includes(f.kind));
  const caller: Caller = async () => ({ text: JSON.stringify(compact), seconds: 0 });
  const full = bodyOf(compactFromKeygen());
  const s = await runResearch({ root, ids: [id!], runId: 'r4', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller, exec: realExec(root), fetchText: async () => full });
  assert.equal(s.outcomes[0]!.status, 'skipped');
  assert.match(s.outcomes[0]!.reason!, /薄い/);
  assert.ok(!existsSync(join(root, 'data/entity-additions/keygen.json')));
});

test('case:research: 一覧にすでに同じ公式サイトの事例があれば見送り（重複）', async () => {
  const root = setupRoot();
  writeFileSync(join(root, 'data/entities-index.json'), JSON.stringify([{ id: 'ent_x', name: 'Other', url: 'https://keygen.sh' }]));
  const [id] = queued(root, ['Keygen']);
  const s = await runResearch({ root, ids: [id!], runId: 'r5', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller: async () => ({ text: '{}', seconds: 0 }), exec: realExec(root), fetchText: async () => 'x' });
  assert.match(s.outcomes[0]!.reason!, /重複/);
});

test('case:research --next: 優先度の高い順に選ぶ', async () => {
  const root = setupRoot();
  const rows = ['Lo', 'Hi', 'Mid'].map((n, i) => ({ ...(toCandidate(raw(n, `https://${n.toLowerCase()}.sh`), 'r') as any).candidate, priority: [10, 90, 50][i] }));
  writeQueue(root, rows);
  const { selectCandidates } = await import('../case-research');
  assert.deepEqual(selectCandidates(readQueue(root), [], 2).map((c) => c.name), ['Hi', 'Mid']);
});

test('公式サイトが無い事業も候補にできる（URL が書いてあって不正な時だけ落とす）', () => {
  const ok = toCandidate({ ...raw('Corner Shop', 'https://press.example.com'), officialUrl: '' }, 'r');
  assert.ok(ok.ok && (ok as any).candidate.url === '');
  assert.equal(toCandidate({ ...raw('Bad', 'https://press.example.com'), officialUrl: 'not a url' }, 'r').ok, false);
});

test('queue の更新は同時に動く別の命令と重ならず、どちらの追加も残る', async () => {
  const root = setupRoot();
  const worker = join(root, 'worker.ts');
  writeFileSync(worker, `import { updateCandidates, toCandidate } from ${JSON.stringify(join(repo, 'scripts/reader-case/candidates-lib.ts'))};
const [root, name] = process.argv.slice(2);
for (let i = 0; i < 5; i++) {
  const t = toCandidate({ name: name + i, officialUrl: 'https://' + name + i + '.dev', sources: [{ url: 'https://' + name + i + '.dev/a', quote: 'q' }], reason: 'r' }, 'r');
  if (t.ok) updateCandidates(root, (rows) => { rows.push(t.candidate); });
}`);
  const runOne = (name: string) => new Promise<number>((res) => { const c = spawn(process.execPath, ['--import', 'tsx', worker, root, name], { cwd: root, stdio: 'ignore' }); c.on('close', (code) => res(code ?? 1)); });
  const codes = await Promise.all(['alpha', 'beta', 'gamma', 'delta'].map(runOne));
  assert.deepEqual(codes, [0, 0, 0, 0]);
  assert.equal(readQueue(root).length, 20);
});

test('予約の一覧への追記は、読み直して無い時だけ（二重に予約しない）', () => {
  const root = setupRoot();
  const idx1 = buildDedupIndex(root, []); const idx2 = buildDedupIndex(root, []); // 別々の命令が同じ古い索引を持っている状況
  assert.equal(claimTarget(root, 'Twice', 'https://twice.dev', 'a', '2026-10-08', idx1), true);
  assert.equal(claimTarget(root, 'Twice', 'https://twice.dev', 'b', '2026-10-08', idx2), false);
  assert.equal(readFileSync(join(root, 'data/CLAIMED_TARGETS.txt'), 'utf8').split('\n').filter((l) => l.startsWith('Twice')).length, 1);
});

test('case:research: 同じ候補は同時に2つの命令で調べない（researching にして取る）', async () => {
  const root = setupRoot(); writeFileSync(join(root, 'data/entities-index.json'), '[]');
  const [id] = queued(root, ['Keygen']);
  updateCandidates(root, (rows) => { rows[0]!.status = 'researching'; rows[0]!.researchStartedAt = new Date().toISOString(); });
  let calls = 0;
  const s = await runResearch({ root, ids: [id!], runId: 'r6', concurrency: 1, apply: true, today: '2026-10-08', log: () => {} }, { caller: async () => { calls++; return { text: '{}', seconds: 0 }; }, exec: realExec(root), fetchText: async () => 'x' });
  assert.equal(s.outcomes.length, 0);
  assert.equal(calls, 0);
  assert.equal(readQueue(root)[0]!.status, 'researching');
});

test('case:research --no-apply: 一覧に入れない時は調査待ちのまま、ids ファイルも出さない', async () => {
  const root = setupRoot(); writeFileSync(join(root, 'data/entities-index.json'), '[]');
  const [id] = queued(root, ['Keygen']);
  const compact = compactFromKeygen();
  const s = await runResearch({ root, ids: [id!], runId: 'r7', concurrency: 1, apply: false, today: '2026-10-08', log: () => {} }, { caller: async () => ({ text: JSON.stringify(compact), seconds: 0 }), exec: realExec(root), fetchText: async () => bodyOf(compact) });
  assert.equal(s.outcomes[0]!.status, 'recorded');
  assert.equal(s.idsFile, undefined);
  assert.equal(readQueue(root)[0]!.status, 'queued');
});

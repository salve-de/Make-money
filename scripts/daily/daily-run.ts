/**
 * 毎日1回、人が何もしなくても回る流れ（pnpm daily:run）。
 *   候補探し(case:discover) → 調査(case:research) → 新しい事例を case:run で仕上げて公開 → 本番の確認 → 結果の記録
 *
 *   pnpm daily:run [--dry-run] [--force] [--ids a,b] [--count 10] [--next 5] [--cap 3] [--site-url URL] [--date YYYY-MM-DD]
 *   --dry-run: 公開しない（case:run に --publish を付けない）。本番の確認は読むだけなので行う
 *   --cap: 1日に仕上げる件数の上限（既定3）。超えた分は結果に「持ち越し」と残す
 *   --force: 今日すでに終えた段もやり直す
 *
 * 約束:
 *  - case:discover / case:research の呼び出しは package.json に無い間は飛ばす（別の担当の枝がメインに入るまで）。
 *    新しい事例のIDは、標準出力の「DAILY_IDS=a,b」の行か、環境変数 DAILY_IDS_FILE のファイル（1行に1つ）で受け取る。--ids でも渡せる。
 *  - 検査に通らない事例は出さない。公開中の事例の取り下げの判定が出たら公開を止めて知らせる（取り下げは自動でしない）。
 *  - 途中で止まっても、次の起動で今日の終えた段を飛ばして続きから進む。二重起動はロックで防ぐ。
 *  - 異常（失敗・止まり・取り下げの判定・本番の不一致）の時だけ、Mac の通知と GitHub の issue（同じ理由が開いていればコメント）で知らせる。
 *  - 結果は data/pipeline/daily/<日付>.json に1日1ファイル。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const DAILY_DIR = 'data/pipeline/daily';
export const DEFAULT_SITE = 'https://make-money-app.sato-business-0117.workers.dev';
export const STALL_DAYS = 2;

export interface ExecResult { code: number; stdout: string; stderr: string }
export interface Deps {
  exec: (argv: string[], env?: Record<string, string>) => Promise<ExecResult>;
  fetchJson: (url: string) => Promise<unknown>;
  /** Mac の通知 */
  notify: (title: string, body: string) => Promise<void>;
  now: () => number;
  /** 待つ（本番の目印のキャッシュ待ちに使う）。試験では待たない */
  sleep: (ms: number) => Promise<void>;
  /** package.json にその命令があるか */
  hasScript: (name: string) => boolean;
}
export interface Options {
  root: string; date: string; dryRun: boolean; force: boolean; ids: string[];
  count: number; next: number; cap: number; siteUrl: string;
  /** 公開した直後に、本番の版が追いつくまで待つ上限(ミリ秒)。本番の目印は最大3分キャッシュされる */
  verifyWaitMs?: number;
  log?: (t: string) => void;
}
export interface StageResult { status: 'ok' | 'skipped' | 'failed'; seconds: number; note?: string }
export interface DayRecord {
  date: string; startedAt: string; finishedAt?: string; dryRun: boolean; status: 'RUNNING' | 'DONE' | 'FAILED';
  stages: Record<string, StageResult>;
  ids: string[]; deferred: string[];
  /** 公開データは作ったが、まだ公開していない事例(公開なしの試しで作った分も含む)。次の起動で公開をやり直す。正本は data/pipeline/daily/pending.json */
  pending: string[];
  /** 今日公開した事例 */
  publishedIds: string[];
  counts: { discovered: number; researched: number; passed: number; published: number; failed: number };
  failures: { id: string; reason: string }[];
  verify?: { ok: boolean; checks: { name: string; status: 'ok' | 'problem' | 'skipped'; note: string }[]; generationCounts?: Record<string, number>; total?: number };
  abnormal: { key: string; text: string; soft?: boolean }[];
  ok: boolean; seconds: number;
}

const readJson = <T,>(file: string, fallback: T): T => { try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return fallback; } };
function writeAtomic(file: string, data: unknown): void {
  mkdirSync(join(file, '..'), { recursive: true });
  const tmp = `${file}.tmp`; writeFileSync(tmp, JSON.stringify(data, null, 1)); renameSync(tmp, file);
}
export const dayFile = (root: string, date: string, dry: boolean): string => join(root, DAILY_DIR, dry ? `${date}.dry-run.json` : `${date}.json`);
const daysBetween = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** 最後に成功した日（公開なしの試しは数えない）。無ければ null */
export function lastSuccessDate(root: string, before?: string): string | null {
  const dir = join(root, DAILY_DIR);
  if (!existsSync(dir)) return null;
  const days = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)).sort().reverse();
  for (const d of days) {
    if (before && d >= before) continue;
    const r = readJson<Partial<DayRecord>>(join(dir, `${d}.json`), {});
    if (r.ok === true && r.dryRun !== true) return d;
  }
  return null;
}

/** 標準出力・ファイルから新しい事例のIDを集める */
export function parseIds(stdout: string): string[] {
  const out: string[] = [];
  for (const m of stdout.matchAll(/^DAILY_IDS=(.*)$/gm)) out.push(...m[1].split(',').map((s) => s.trim()).filter(Boolean));
  return out;
}
const uniq = (a: string[]): string[] => [...new Set(a)];

/** prepare --dry-run の出力（JSON の1行）から取り下げの計画を読む */
export function parseWithdrawals(stdout: string): { withdrawn: string[]; canApply: boolean } | null {
  const line = stdout.split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) return null;
  try { const j = JSON.parse(line); return { withdrawn: j.plan?.withdrawn ?? [], canApply: j.canApply === true }; } catch { return null; }
}

function acquireLock(root: string): (() => void) | null {
  const lock = join(root, DAILY_DIR, 'daily-run.lock');
  mkdirSync(join(root, DAILY_DIR), { recursive: true });
  const take = (): boolean => { try { mkdirSync(lock); writeFileSync(join(lock, 'pid'), String(process.pid)); return true; } catch { return false; } };
  if (!take()) {
    const pid = Number(readFileSync(join(lock, 'pid'), 'utf8').trim() || 0);
    let alive = false;
    if (pid) { try { process.kill(pid, 0); alive = true; } catch { alive = false; } }
    if (alive) return null;
    rmSync(lock, { recursive: true, force: true });
    if (!take()) return null;
  }
  return () => rmSync(lock, { recursive: true, force: true });
}

/** 手元の公開版（data/catalog-release.json）から期待値を読む */
function localRelease(root: string): { published: number; ids: Set<string>; release: string; summariesHash: string } {
  const m = readJson<{ publishedCount?: number; details?: Record<string, string>; summaries?: { hash?: string } }>(join(root, 'data/catalog-release.json'), {});
  return { published: m.publishedCount ?? 0, ids: new Set(Object.keys(m.details ?? {})), release: (m.summaries?.hash ?? '').slice(0, 12), summariesHash: m.summaries?.hash ?? '' };
}
function expectedGenerations(root: string, hash: string): Record<string, number> | null {
  try {
    const rows = JSON.parse(gunzipSync(readFileSync(join(root, '.catalog-release', `${hash}.json.gz`))).toString('utf8')) as { generation?: number }[];
    const c: Record<string, number> = {};
    for (const r of rows) { const g = String(r.generation ?? 1); c[g] = (c[g] ?? 0) + 1; }
    return c;
  } catch { return null; }
}

interface CatalogPage { data: { id: string; reader?: { display?: { listLine?: { text?: string } } } }[]; total: number; generationCounts: Record<string, number>; nextOffset: number | null }

/** 本番の確認。読むだけ。 */
export async function verifyProduction(o: Options, d: Deps, publishedIds: string[], previousGen: Record<string, number> | undefined): Promise<NonNullable<DayRecord['verify']>> {
  const checks: NonNullable<DayRecord['verify']>['checks'] = [];
  const add = (name: string, status: 'ok' | 'problem' | 'skipped', note: string): void => { checks.push({ name, status, note }); };
  const local = localRelease(o.root);
  let total: number | undefined; let gen: Record<string, number> | undefined;
  try {
    const rows: CatalogPage['data'] = [];
    let offset: number | null = 0; let first: CatalogPage | null = null;
    const have = new Set<string>();
    // 今日公開した事例がすべて見つかるまで読み進める(見つからなければ最後まで。件数の上限は置かない)
    while (offset !== null && (first === null || publishedIds.some((id) => !have.has(id)))) {
      const page = await d.fetchJson(`${o.siteUrl}/api/catalog?pageSize=100&offset=${offset}`) as CatalogPage;
      first ??= page; rows.push(...page.data); for (const r of page.data) have.add(r.id); offset = page.nextOffset;
    }
    total = first!.total; gen = first!.generationCounts;
    const sum = Object.values(gen).reduce((a, b) => a + b, 0);
    if (sum !== total) add('件数の内訳', 'problem', `世代ごとの合計 ${sum} が総数 ${total} と合わない`); else add('件数の内訳', 'ok', `総数 ${total}、世代ごと ${JSON.stringify(gen)}`);
    // 公開した版と合うか。公開なしの試しは手元の版が先に進むことがあるので、件数の比較は実際に公開した日だけ行う
    if (o.dryRun) add('公開した版との件数', 'skipped', '公開なしの日は比べない');
    else if (total !== local.published) add('公開した版との件数', 'problem', `本番 ${total} 件、公開した版 ${local.published} 件`);
    else add('公開した版との件数', 'ok', `${total} 件で一致`);
    const exp = o.dryRun ? null : expectedGenerations(o.root, local.summariesHash);
    if (exp) { const same = JSON.stringify(Object.entries(exp).sort()) === JSON.stringify(Object.entries(gen).sort()); add('世代ごとの件数', same ? 'ok' : 'problem', same ? '公開した版と一致' : `本番 ${JSON.stringify(gen)}、公開した版 ${JSON.stringify(exp)}`); }
    else if (previousGen) {
      const dropped = Object.keys(previousGen).filter((g) => (gen![g] ?? 0) < previousGen[g]);
      add('世代ごとの件数', dropped.length ? 'problem' : 'ok', dropped.length ? `前回より減った世代: ${dropped.join(',')}` : '前回より減っていない（手元に版が無いため前回比のみ）');
    } else add('世代ごとの件数', 'skipped', '比べる相手が無い');
    // 新しい事例の詳細
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (!publishedIds.length) add('新しい事例の詳細', 'skipped', '今日公開した事例が無い');
    else {
      const bad = publishedIds.filter((id) => !byId.get(id)?.reader?.display?.listLine?.text);
      add('新しい事例の詳細', bad.length ? 'problem' : 'ok', bad.length ? `本番に無い、または画面の文が空: ${bad.join(', ')}` : `公開した ${publishedIds.length} 件すべてで画面の文が出ている`);
    }
  } catch (e) { add('本番の取得', 'problem', `本番の一覧を取れない: ${(e as Error).message}`); }
  try {
    const h = await d.fetchJson(`${o.siteUrl}/api/health`) as { release?: string; status?: string };
    if (local.release && !o.dryRun) add('版の目印', h.release === local.release ? 'ok' : 'problem', h.release === local.release ? `${h.release} で一致` : `本番 ${h.release}、公開した版 ${local.release}`);
    else add('版の目印', h.status === 'ok' ? 'ok' : 'problem', `本番の状態 ${h.status}、版 ${h.release}`);
  } catch (e) { add('版の目印', 'problem', `ヘルスを取れない: ${(e as Error).message}`); }
  const f = await d.exec(['node', 'scripts/with-r2-keychain-secrets.mjs', 'node', 'scripts/ops/check-freshness.mjs', '--site-url', o.siteUrl]);
  if (f.code === 0) add('鮮度の確認', 'ok', '正常');
  else if (f.code === 2 || f.code === 78) add('鮮度の確認', 'skipped', '鍵が無い・接続できないため確認できず（正常とは扱わない）');
  else add('鮮度の確認', 'problem', f.stdout.trim().split('\n').slice(-2).join(' / ').slice(0, 200));
  return { ok: !checks.some((c) => c.status === 'problem'), checks, generationCounts: gen, total };
}

/** 実行の本体。結果を返し、ファイルにも残す */
export async function runDaily(o: Options, d: Deps): Promise<DayRecord> {
  const log = o.log ?? ((t: string) => console.log(`[daily:run] ${t}`));
  const t0 = d.now();
  const file = dayFile(o.root, o.date, o.dryRun);
  const prev = readJson<DayRecord | null>(file, null);
  const resume = !o.force && prev && prev.status !== 'DONE' ? prev : null; // 終えた日は何もしない。止まった日だけ続きから
  const rec: DayRecord = resume ?? {
    date: o.date, startedAt: new Date(t0).toISOString(), dryRun: o.dryRun, status: 'RUNNING', stages: {}, ids: [], deferred: [], pending: [], publishedIds: [],
    counts: { discovered: 0, researched: 0, passed: 0, published: 0, failed: 0 }, failures: [], abnormal: [], ok: false, seconds: 0,
  };
  if (!o.force && prev?.status === 'DONE') { log(`${o.date} は終えている。何もしない（やり直すなら --force）`); return prev; }
  // 前の日の持ち越し(上限を超えた分・公開データは作ったが公開できていない分)を引き継ぐ
  const carry = o.dryRun ? null : lastCarry(o.root, o.date);
  if (!resume && carry) rec.ids = carry.deferred;
  rec.publishedIds ??= [];
  rec.pending = readPending(o.root); // 公開なしの試しで作った分も、ここから拾う
  if (resume) log(`今日の続きから再開（終えた段: ${Object.entries(rec.stages).filter(([, s]) => s.status === 'ok').map(([k]) => k).join(',') || 'なし'}）`);
  rec.status = 'RUNNING';
  // 再開では、終えた段の異常(一部の事例が落ちた記録)は残し、やり直す段の異常は付け直す
  rec.abnormal = rec.abnormal.filter((a) => a.key === 'stall' || (a.key === 'case-failed' && rec.stages.run?.status === 'ok'));
  const save = (): void => writeAtomic(file, rec);
  const flag = (key: string, text: string, soft = false): void => { if (!rec.abnormal.some((a) => a.key === key)) rec.abnormal.push({ key, text, ...(soft ? { soft: true } : {}) }); };

  // 見張り: 最後に成功した日が2日より前なら止まっているとみなす
  const last = lastSuccessDate(o.root, o.date);
  if (last && daysBetween(last, o.date) > STALL_DAYS) flag('stall', `毎日の自動実行が止まっていた（最後に成功したのは ${last}、${daysBetween(last, o.date)}日前）`, true); // 知らせるだけ。今回の実行が成功すれば、それが新しい基準になる
  save();

  const done = (name: string): boolean => !o.force && rec.stages[name]?.status === 'ok';
  const stage = async (name: string, body: () => Promise<{ status: 'ok' | 'skipped' | 'failed'; note?: string }>): Promise<void> => {
    if (done(name)) { log(`${name}: 今日は終えているので飛ばす`); return; }
    const s0 = d.now(); log(`${name}: 開始`);
    let r: { status: 'ok' | 'skipped' | 'failed'; note?: string };
    try { r = await body(); } catch (e) { r = { status: 'failed', note: (e as Error).message }; }
    rec.stages[name] = { ...r, seconds: Number(((d.now() - s0) / 1000).toFixed(1)) };
    if (r.status === 'failed') flag(`fail:${name}`, `${name} が失敗: ${r.note ?? ''}`);
    log(`${name}: ${r.status}${r.note ? `（${r.note}）` : ''}`); save();
  };
  const idsFile = join(o.root, DAILY_DIR, `${o.date}.ids`);
  const collect = (r: ExecResult): string[] => uniq([...parseIds(r.stdout), ...(existsSync(idsFile) ? readFileSync(idsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [])]);
  const env = { DAILY_IDS_FILE: idsFile };
  const tail = (r: ExecResult): string => `${r.stderr}\n${r.stdout}`.trim().split('\n').slice(-2).join(' / ').slice(0, 250);

  await stage('discover', async () => {
    if (!d.hasScript('case:discover')) return { status: 'skipped', note: 'case:discover がまだ無い' };
    const r = await d.exec(['pnpm', 'case:discover', '--count', String(o.count)], env);
    if (r.code !== 0) return { status: 'failed', note: tail(r) };
    const got = collect(r).filter((id) => !rec.ids.includes(id)); rec.counts.discovered = got.length; rec.ids = uniq([...rec.ids, ...got]); return { status: 'ok' };
  });
  await stage('research', async () => {
    if (!d.hasScript('case:research')) return { status: 'skipped', note: 'case:research がまだ無い' };
    const r = await d.exec(['pnpm', 'case:research', '--next', String(o.next)], env);
    if (r.code !== 0) return { status: 'failed', note: tail(r) };
    const got = collect(r); rec.ids = uniq([...rec.ids, ...got]); rec.counts.researched = got.length; return { status: 'ok' };
  });
  rec.ids = uniq([...o.ids, ...rec.ids]);

    let passed: string[] = [];
  await stage('run', async () => {
    const already = localRelease(o.root).ids;
    const pendingNow = rec.pending;
    const fresh = rec.ids.filter((id) => !already.has(id) && !pendingNow.includes(id));
    rec.deferred = fresh.slice(o.cap); const target = fresh.slice(0, o.cap);
    if (!target.length && !pendingNow.length) return { status: 'skipped', note: '新しい事例が無い' };
    const runId = `daily-${o.date}`;
    if (target.length) {
      rmSync(join(o.root, 'data/pipeline/case-run', runId, 'summary.json'), { force: true }); // 前の結果を誤って読まない
      const r1 = await d.exec(['pnpm', 'case:run', '--ids', target.join(','), '--run-id', runId]);
      const sum = readJson<{ passed?: string[]; failures?: { id: string; reason: string }[] } | null>(join(o.root, 'data/pipeline/case-run', runId, 'summary.json'), null);
      if (!sum) return { status: 'failed', note: `case:run の結果が読めない: ${tail(r1)}` };
      passed = sum.passed ?? [];
      rec.counts.passed += passed.length; rec.failures.push(...(sum.failures ?? []).map((f) => ({ id: f.id, reason: f.reason })));
      rec.counts.failed = new Set(rec.failures.map((f) => f.id)).size;
      if (rec.failures.some((f) => /withdrawals|撤回/.test(f.reason))) { flag('withdraw', '公開中の事例の取り下げの判定が出た（公開を止めた。取り下げは自動でしない）'); return { status: 'failed', note: '取り下げの判定で公開を止めた' }; }
      if (rec.counts.failed) flag('case-failed', `${rec.counts.failed} 件が検査に通らず落ちた（${rec.failures.slice(0, 3).map((f) => `${f.id}: ${f.reason}`).join(' / ').slice(0, 300)}）`);
      // 公開データは手元の目録に入った(公開なしの試しでも)。公開できなくても、次の起動で公開だけやり直せるよう残す
      rec.pending = uniq([...rec.pending, ...passed]); writePending(o.root, rec.pending); save();
      if (o.dryRun) return { status: 'ok', note: `公開なし。通った ${passed.length} 件` };
    }
    const toPublish = o.dryRun ? [] : rec.pending;
    if (!toPublish.length) return { status: 'ok', note: '通った事例が無いので公開しない' };
    // 公開の直前に取り下げの判定を見る。1件でも出たら公開しない
    const w = await d.exec(['node', '--import', 'tsx', 'scripts/prepare-catalog-release.ts', '--dry-run']);
    const plan = w.code === 0 ? parseWithdrawals(w.stdout) : null;
    if (!plan) return { status: 'failed', note: `取り下げの事前確認が読めない: ${tail(w)}` };
    if (plan.withdrawn.length || !plan.canApply) { flag('withdraw', `公開中の事例の取り下げの判定が出た（${plan.withdrawn.length} 件。公開を止めた。取り下げは自動でしない）`); return { status: 'failed', note: `取り下げの判定 ${plan.withdrawn.length} 件で公開を止めた` }; }
    const r2 = await d.exec(['pnpm', 'case:run', '--ids', toPublish.join(','), '--run-id', `${runId}-pub`, '--from', 'publish', '--publish']);
    if (r2.code !== 0) return { status: 'failed', note: `公開が失敗(次の起動でやり直す): ${tail(r2)}` };
    rec.publishedIds = uniq([...rec.publishedIds, ...toPublish]); rec.counts.published += toPublish.length; rec.pending = rec.pending.filter((x) => !toPublish.includes(x)); writePending(o.root, rec.pending); save();
    return { status: 'ok', note: `${toPublish.length} 件を公開` };
  });

  // 公開で変わった手元のデータ(目録・画面の文)を、変更の申請として残す。次の日にメインへ取り込んでも食い違わないようにする
  if (rec.publishedIds.length) await stage('record-data', async () => {
    const br = `auto/daily-${o.date}`;
    const steps: string[][] = [
      ['git', 'add', 'data'],
      ['git', 'commit', '-m', `毎日の自動実行: ${o.date} に公開した ${rec.publishedIds.length} 件の公開データ\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`],
      ['git', 'push', 'origin', `HEAD:refs/heads/${br}`],
      ['gh', 'pr', 'create', '--base', 'main', '--head', br, '--title', `毎日の自動実行: ${o.date} の公開データ(${rec.publishedIds.length}件)`, '--body', `公開した事例: ${rec.publishedIds.join(', ')}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`],
    ];
    for (const st of steps) { const r = await d.exec(st); if (r.code !== 0) return { status: 'failed', note: `${st.slice(0, 2).join(' ')} が失敗: ${tail(r)}` }; }
    return { status: 'ok', note: `${br} に残した` };
  });

  // 本番の確認は毎回やり直す（読むだけ）
  const prevGen = lastVerified(o.root, o.date)?.generationCounts;
  const s0 = d.now();
  rec.verify = await verifyProduction(o, d, rec.publishedIds, prevGen);
  // 公開した直後は、本番の目印のキャッシュ(最大3分)で古い版が返ることがある。追いつくまで待ってから不一致と決める
  const waitUntil = d.now() + (rec.publishedIds.length ? (o.verifyWaitMs ?? 200_000) : 0);
  while (!rec.verify.ok && d.now() < waitUntil) { await d.sleep(20_000); rec.verify = await verifyProduction(o, d, rec.publishedIds, prevGen); }
  rec.stages.verify = { status: rec.verify.ok ? 'ok' : 'failed', seconds: Number(((d.now() - s0) / 1000).toFixed(1)) };
  if (!rec.verify.ok) flag('verify', `本番の確認で不一致: ${rec.verify.checks.filter((c) => c.status === 'problem').map((c) => `${c.name}: ${c.note}`).join(' / ').slice(0, 400)}`);

  rec.finishedAt = new Date(d.now()).toISOString(); rec.seconds = Number(((d.now() - t0) / 1000 + (resume?.seconds ?? 0)).toFixed(1));
  rec.ok = rec.abnormal.every((a) => a.soft); rec.status = rec.ok ? 'DONE' : 'FAILED'; save();
  return rec;
}

const pendingFile = (root: string): string => join(root, DAILY_DIR, 'pending.json');
function readPending(root: string): string[] { return readJson<string[]>(pendingFile(root), []); }
function writePending(root: string, ids: string[]): void { writeAtomic(pendingFile(root), ids); }

/** 一番新しい前の日の記録から、引き継ぐもの(公開待ち・上限を超えた分) */
function lastCarry(root: string, before: string): { deferred: string[] } | null {
  const dir = join(root, DAILY_DIR);
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().reverse()) {
    if (f.slice(0, 10) >= before) continue;
    const r = readJson<Partial<DayRecord>>(join(dir, f), {});
    return { deferred: r.deferred ?? [] };
  }
  return null;
}

function lastVerified(root: string, before: string): DayRecord['verify'] | undefined {
  const dir = join(root, DAILY_DIR);
  if (!existsSync(dir)) return undefined;
  for (const f of readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().reverse()) {
    if (f.slice(0, 10) >= before) continue;
    const r = readJson<Partial<DayRecord>>(join(dir, f), {});
    if (r.verify?.generationCounts) return r.verify;
  }
  return undefined;
}

/** 異常の知らせ。Mac の通知と GitHub の issue（同じ理由が開いていればコメントを足す）。正常な日は何もしない */
export async function alertAbnormal(rec: DayRecord, d: Deps): Promise<string[]> {
  const sent: string[] = [];
  for (const a of rec.abnormal) {
    const title = `毎日の自動実行で異常: ${rec.date}・${a.text.slice(0, 40)}`;
    const keyText = `・${a.text.slice(0, 40)}`;
    await d.notify('Make-Money 毎日の自動実行', a.text.slice(0, 120)).catch(() => undefined);
    const list = await d.exec(['gh', 'issue', 'list', '--state', 'open', '--search', '毎日の自動実行で異常 in:title', '--json', 'number,title', '--limit', '50']);
    let existing: number | undefined;
    try { existing = (JSON.parse(list.stdout || '[]') as { number: number; title: string }[]).find((i) => i.title.includes(keyText))?.number; } catch { /* 読めなければ新しく立てる */ }
    const body = `日付: ${rec.date}\n理由: ${a.text}\n\n結果ファイル: data/pipeline/daily/${rec.date}.json\n失敗: ${rec.failures.map((f) => `${f.id}（${f.reason}）`).join('、') || 'なし'}`;
    const r = existing
      ? await d.exec(['gh', 'issue', 'comment', String(existing), '--body', body])
      : await d.exec(['gh', 'issue', 'create', '--title', title, '--body', body]);
    sent.push(existing ? `コメント #${existing}` : (r.code === 0 ? '新しい issue' : 'issue 失敗'));
  }
  return sent;
}

// ---- 実際の呼び出し ----
function realExec(root: string): Deps['exec'] {
  return (argv, env) => new Promise((res) => {
    const c = spawn(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    c.stdout.on('data', (x) => { stdout += x; process.stdout.write(x); }); c.stderr.on('data', (x) => { stderr += x; });
    c.on('error', (e) => res({ code: 127, stdout, stderr: String(e) }));
    c.on('close', (code) => res({ code: code ?? 1, stdout, stderr }));
  });
}

export function parseArgs(argv: string[], now = new Date()): Options {
  const val = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const num = (n: string, def: number): number => { const v = val(n); if (v === undefined) return def; const x = Number(v); if (!Number.isInteger(x) || x < 1) throw new Error(`${n} は1以上の整数`); return x; };
  const jst = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  return {
    root: resolve(fileURLToPath(new URL('../..', import.meta.url))), date: val('--date') ?? jst, dryRun: argv.includes('--dry-run'), force: argv.includes('--force'),
    ids: (val('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean), count: num('--count', 10), next: num('--next', 5), cap: num('--cap', 3),
    siteUrl: (val('--site-url') ?? process.env.DAILY_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, ''),
  };
}

async function main(): Promise<number> {
  const o = parseArgs(process.argv.slice(2));
  const pkg = readJson<{ scripts?: Record<string, string> }>(join(o.root, 'package.json'), {});
  const exec = realExec(o.root);
  const deps: Deps = {
    exec, now: Date.now, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), hasScript: (n) => !!pkg.scripts?.[n],
    fetchJson: async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(30_000) }); if (!r.ok) throw new Error(`${url} が ${r.status}`); return r.json(); },
    notify: async (title, body) => { await exec(['osascript', '-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`]); },
  };
  const release = acquireLock(o.root);
  if (!release) { console.log('[daily:run] 二重起動: 別の実行が動いているので、今回は何もしない'); return 0; }
  try {
    const rec = await runDaily(o, deps);
    console.log(`[daily:run] ${rec.date} ${rec.status}: 通った ${rec.counts.passed}、公開 ${rec.counts.published}、落ちた ${rec.counts.failed}、${rec.seconds} 秒 → ${dayFile(o.root, o.date, o.dryRun)}`);
    if (rec.abnormal.length) { for (const a of rec.abnormal) console.log(`[daily:run] 異常: ${a.text}`); if (!o.dryRun) console.log(`[daily:run] 知らせ: ${(await alertAbnormal(rec, deps)).join(', ')}`); }
    return rec.ok ? 0 : 1;
  } finally { release(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`[daily:run] ${(e as Error).message}`); process.exit(1); });
}

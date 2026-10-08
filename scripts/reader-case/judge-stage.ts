/**
 * case:run の「読み手の判定」段（judge）。公開データの作成（prepare）の後ろ、公開（publish）の前で、事例ごとに次を行う。
 *
 *  1. 手元で描いた画面（詳細・一覧・探す）の文を取る（screen-lines.tsx。データでなく、描いた画面の文字）。
 *  2. 機械で決まる検査をコードで判定する（judge-checks.ts）。円換算の付け直し・一覧の句点は機械が先に直す。
 *  3. 言い回しだけを、別系統の AI に 1文・1観点の「はい／いいえ／分からない」で聞く（judge-questions.ts。軽いモデル）。
 *  4. 引っかかった「行 × 観点」を1つずつ、書き手に直させる（重いモデル。1文・1観点・1回だけ）。直した文は、
 *     数字・年・名前が増減していないかを機械で確かめ、全部の検査をやり直して指摘が **減った時だけ** 採る。増減なし・増えたら戻す。
 *  5. 直しを採れなかった行は、その行だけ外す（一覧の文は外せない）。
 *  6. 事例ごと止めるのは、個人情報が画面に出る時と、作る側の言葉が外せない文（一覧・概要）に残る時だけ。
 *     嘘の数字（fact）と違法な手順（legal）は、この段では判定しない（前の段の照合と文の検査の担当）。
 *
 * 結果（行ごとの理由・直したか・外したか）は data/pipeline/reader-judge/<事例ID>.json に事例ごとに残す。
 * 事実の欄・分類の札・画面の崩れの指摘は、この段では直さず、結果に「直せない」として残す（事実の欄は別の担当）。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISPLAY_FILES, applyRepairs, blameRows, mergeEntity, newProblems, serialize,
  type DisplayFiles, type EntityDisplay, type LiveReader,
} from '../../src/shared/display-build';
import type { Caller } from './agent-call';
import type { Exec } from './case-run';
import { dropRows, normalizeDisplay, withCodeYen } from './display-lenient';
import { countByKind, countKeys, fixable, flagKey, loadTerms, machineChecks, screenChecks, type Flag, type Terms } from './judge-checks';
import {
  KIND_LABEL, applyMechanical, displayRows, invarianceProblems, loadMachineRules, makeCaseTextCheck,
  type CaseTextCheck, type Kind, type MachineRules, type RenderedScreen,
} from './judge-lib';
import { askRow, fileCache, newStats, type AskStats, type QuestionCache } from './judge-questions';

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE_ROOT = resolve(HERE, '../..');
const read = (file: string): string => readFileSync(join(CODE_ROOT, file), 'utf8');
const skill = (): string => read('.claude/skills/natural-japanese/SKILL.md').replace(/^---[\s\S]*?---\n/, '');

export type FindingStatus =
  | 'fixed-machine' // 機械で直した（円換算・句点）
  | 'fixed' // 書き手が直し、指摘が減ったので採った
  | 'dropped' // 直しを採れなかったので、その行を外した
  | 'unfixable' // この段では直せない（札・画面の崩れ・一覧の文・外すと検査に落ちる行・直す回数の上限）
  | 'resolved'; // 他の行の直し・外しで消えた

export interface FindingRecord extends Flag {
  status: FindingStatus; note?: string; before?: string; after?: string;
}
export interface JudgeCaseResult {
  id: string; name?: string; runId: string; startedAt: string; seconds: number;
  judge: { independent: boolean; label: string };
  screenLines: number;
  /** 「行 × 観点」の指摘の数。before は直す前、after は直した・外した後（どちらも同じ検査を当てた数） */
  before: { flags: number; byKind: Record<string, number> };
  after: { flags: number; byKind: Record<string, number> };
  fixedRows: number; droppedRows: number; machineFixedRows: number;
  /** 直した後に残る、画面の崩れ・札（この段では直せない）の数 */
  caseLevel: number;
  blocked: boolean; blockReasons: string[];
  findings: FindingRecord[];
  calls: { judge: number; judgeCached: number; writer: number }; costUsd: number;
  error?: string;
}
export interface JudgeSummary { results: JudgeCaseResult[]; failed: Array<{ id: string; reason: string }>; blocked: string[]; changedIds: string[] }

export interface JudgeOptions {
  root: string; ids: string[]; runId: string; concurrency: number; independent: boolean; judgeLabel: string;
  /** 1事例で書き手に直させる回数の上限 */
  maxFixes?: number;
  log?: (t: string) => void;
}
export interface JudgeDeps {
  exec: Exec; judge: Caller; writer: Caller;
  /** 試験用の差し替え */
  check?: CaseTextCheck; rules?: MachineRules; terms?: Terms; cache?: QuestionCache; now?: () => number;
}

function loadFiles(root: string): DisplayFiles {
  return Object.fromEntries(DISPLAY_FILES.map((f) => [f, JSON.parse(readFileSync(join(root, 'data', `${f}.json`), 'utf8'))])) as unknown as DisplayFiles;
}
function saveFiles(root: string, before: DisplayFiles, after: DisplayFiles): void {
  for (const f of DISPLAY_FILES) { const t = serialize(after[f]); if (t !== serialize(before[f])) writeFileSync(join(root, 'data', `${f}.json`), t); }
}
export const entityDisplayOf = (files: DisplayFiles, id: string): EntityDisplay => {
  const one = <T extends { entityId: string }>(list: T[]): T | undefined => list.find((x) => x.entityId === id);
  return { list: one(files['list-lines']), summary: one(files['summary-lines']), detail: files['detail-lines'].filter((l) => l.entityId === id), success: one(files['success-points']), chapters: one(files['case-chapters']) };
};
/** 外す行の鍵。分析欄は answer/note を分けず1行、成功の秘訣は head/body を分けず1点として外す */
const dk = (id: string): string => id.replace(/\.(answer|note|head|body)$/, '');
const NO_READER = { analysis: [] } as unknown as LiveReader;

/** 同時に動かす数を絞る */
export function limiter(n: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0; const queue: Array<() => void> = [];
  const next = (): void => { if (active < n && queue.length) { active += 1; queue.shift()!(); } };
  return <T,>(fn: () => Promise<T>) => new Promise<T>((res, rej) => {
    queue.push(() => { fn().then(res, rej).finally(() => { active -= 1; next(); }); });
    next();
  });
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

interface CaseState {
  id: string; name?: string; started: number; screen0: RenderedScreen; files0: DisplayFiles;
  judgeStats: AskStats; writerCalls: number; writerCost: number;
  before: Flag[]; findings: FindingRecord[];
  edits: Map<string, { before: string; after: string; kind: 'machine' | 'writer' }>;
  drops: Map<string, string>;
  failedFix: Map<string, string>;
  privacy: string[];
  error?: string;
}

export async function runJudge(opt: JudgeOptions, deps: JudgeDeps): Promise<JudgeSummary> {
  const { root, runId } = opt;
  const log = opt.log ?? ((t: string) => console.log(`[judge] ${t}`));
  const now = deps.now ?? Date.now;
  const check = deps.check ?? makeCaseTextCheck(root);
  const rules = deps.rules ?? loadMachineRules(root);
  const terms = deps.terms ?? loadTerms(root);
  const cache = deps.cache ?? fileCache(join(root, 'data/pipeline/reader-judge-cache.json'));
  const maxFixes = opt.maxFixes ?? 25;
  const work = join(root, 'data/pipeline/case-run', runId, 'judge');
  mkdirSync(work, { recursive: true });
  const writerSystem = `${read('scripts/reader-case/judge-fix-prompt.md')}\n\n${skill()}`;
  const failed: Array<{ id: string; reason: string }> = [];
  const nodeArgs = (script: string, ...a: string[]): string[] => ['--import', 'tsx', script, ...a];
  const aiSlot = limiter(Math.max(2, opt.concurrency * 2));

  async function render(ids: string[], tag: string): Promise<Map<string, RenderedScreen>> {
    const dir = join(work, `screens-${tag}`);
    mkdirSync(dir, { recursive: true });
    await deps.exec(`judge-render-${tag}`, nodeArgs('scripts/reader-case/screen-lines.tsx', '--ids', ids.join(','), '--out', dir));
    const out = new Map<string, RenderedScreen>();
    for (const id of ids) {
      const f = join(dir, `${id}.json`);
      out.set(id, existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as RenderedScreen) : { id, ok: false, detail: [], list: [], discover: [], error: '画面の文が書き出されなかった' });
    }
    return out;
  }
  async function prepare(ids: string[], tag: string): Promise<void> {
    const f = join(work, `ids.prepare-${tag}.txt`);
    writeFileSync(f, `${ids.join('\n')}\n`);
    const r = await deps.exec(`judge-prepare-${tag}`, ['pnpm', 'catalog:prepare', '--changed', f]);
    if (r.code !== 0) throw new Error(`公開データの作り直しが失敗（終了コード ${r.code}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-2).join(' / ').slice(0, 200)}`);
  }

  /** 全部の検査（機械 + 言い回しの問い）を当てる。AI の答えは文ごとに覚えるので、直していない行は聞き直さない */
  async function evaluate(st: CaseState, files: DisplayFiles): Promise<Flag[]> {
    const flags = machineChecks(files, { entityId: st.id, name: st.name, tags: st.screen0.tags, terms, rules }, entityDisplayOf(files, st.id));
    const rows = displayRows(st.id, files);
    const lists = await Promise.all(rows.map((r) => aiSlot(() => askRow(deps.judge, st.id, r.id, r.text, opt.judgeLabel, cache, st.judgeStats))));
    return [...flags, ...lists.flat()];
  }

  // ---- 1. 描く ----
  const startFiles = loadFiles(root);
  const screens0 = await render(opt.ids, 'before');
  const states: CaseState[] = [];
  for (const id of opt.ids) {
    const s = screens0.get(id)!;
    if (!s.ok) { failed.push({ id, reason: `画面の文を取れなかった: ${s.error ?? '理由不明'}（公開データの作成が通っているか）` }); continue; }
    states.push({
      id, name: s.name, started: now(), screen0: s, files0: startFiles, judgeStats: newStats(), writerCalls: 0, writerCost: 0,
      before: [], findings: [], edits: new Map(), drops: new Map(), failedFix: new Map(), privacy: [],
    });
  }
  log(`画面の文を取った: ${states.length}/${opt.ids.length} 件`);

  // ---- 2〜4. 検査 → 機械の直し → 1文ずつの直し（事例ごとに並列） ----
  const finals = new Map<string, DisplayFiles>();
  await pool(states, opt.concurrency, async (st) => {
    try {
      const { id } = st;
      const sc = screenChecks([...st.screen0.detail, ...st.screen0.list, ...st.screen0.discover]);
      st.privacy = sc.privacy;
      // 直す前の数（同じ検査を当てる）
      st.before = await evaluate(st, st.files0);
      const text0 = new Map(displayRows(id, st.files0).map((r) => [r.id, r.text]));
      // 機械で先に直す
      const mech = applyMechanical(id, st.files0);
      for (const c of mech.changes) st.edits.set(c.id, { before: c.before, after: c.after, kind: 'machine' });
      let cur = mech.files;
      let flags = mech.changes.length ? await evaluate(st, cur) : st.before;
      // 1文・1観点ずつ直す。指摘が減った時だけ採る
      const attempted = new Set<string>();
      let fixes = 0;
      for (;;) {
        const target = fixable(flags).find((f) => !attempted.has(flagKey(f)));
        if (!target || fixes >= maxFixes) break;
        attempted.add(flagKey(target));
        const rowId = target.rowId!;
        const rows = new Map(displayRows(id, cur).map((r) => [r.id, r.text]));
        const sentence = rows.get(rowId);
        if (!sentence) continue;
        fixes += 1;
        const reasons = flags.filter((f) => flagKey(f) === flagKey(target)).map((f) => f.reason);
        const res = await aiSlot(() => deps.writer({
          system: writerSystem, label: `${id} ${rowId} ${target.kind} 直し`,
          user: JSON.stringify({ kind: target.kind, viewpoint: KIND_LABEL[target.kind], reasons, sentence, screen: [...rows].filter(([k]) => k !== rowId).map(([, v]) => v) }),
        }));
        st.writerCalls += 1; st.writerCost += res.costUsd ?? 0;
        let cand = '';
        try {
          const t = res.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
          cand = withCodeYen(String((JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as { text?: unknown }).text ?? '').trim());
        } catch { st.failedFix.set(rowId, '直しの返答を読めなかった'); continue; }
        if (!cand || cand === sentence) { st.failedFix.set(rowId, '直らなかった（元の文のまま）'); continue; }
        const elsewhere = [...rows].filter(([k]) => k !== rowId).map(([, v]) => v).join('\n');
        const bad = invarianceProblems(sentence, cand, [...rows.values()], elsewhere);
        if (bad.length) { st.failedFix.set(rowId, `直しを採らなかった: ${bad.join(' / ')}`); continue; }
        const next = applyRepairs(cur, id, [{ id: rowId, text: cand }]);
        if (next.problems.length) { st.failedFix.set(rowId, `直しを置けなかった: ${next.problems[0].slice(0, 100)}`); continue; }
        const nextFlags = await evaluate(st, next.files);
        const a = countKeys(flags); const b = countKeys(nextFlags);
        if (b < a) {
          cur = next.files; flags = nextFlags;
          st.edits.set(rowId, { before: st.edits.get(rowId)?.before ?? text0.get(rowId) ?? sentence, after: cand, kind: 'writer' });
          st.failedFix.delete(rowId);
        } else st.failedFix.set(rowId, `直しを採らなかった: 指摘が減らなかった（${a} → ${b}）`);
      }
      // 直しを採れなかった行は外す対象（一覧の文は外せない。直す回数の上限で触れなかった行は外さない）
      for (const [rowId, why] of st.failedFix) {
        if (!flags.some((f) => f.rowId === rowId && attempted.has(flagKey(f)))) continue;
        if (rowId === 'list') continue;
        st.drops.set(dk(rowId), why);
      }
      finals.set(id, cur);
      st.findings = st.before.map((f) => ({ ...f, status: 'unfixable' as FindingStatus }));
      for (const f of sc.flags) st.findings.push({ ...f, status: 'unfixable', note: '画面の崩れはこの段では直せない' });
    } catch (e) { st.error = (e as Error).message; }
  });
  for (const st of states.filter((s) => s.error)) failed.push({ id: st.id, reason: st.error! });
  const live = states.filter((s) => !s.error);

  // ---- 5. 直しを実ファイルへ（文の検査に落ちた行は戻す）→ 外す → 公開データを作り直す ----
  const changedIds: string[] = [];
  let real = loadFiles(root);
  const baseline = check(real).problems;
  for (const st of live) {
    if (!st.edits.size && !st.drops.size) continue;
    let ok = false;
    for (let round = 0; round < 4; round += 1) {
      const fixes = [...st.edits].map(([rid, e]) => ({ id: rid, text: e.after }));
      let next = fixes.length ? applyRepairs(real, st.id, fixes) : { files: real, problems: [] as string[] };
      // 外す行
      let dropIds = new Set(st.drops.keys());
      if (dropIds.size) {
        const d = normalizeDisplay(dropRows(entityDisplayOf(next.files, st.id), dropIds, NO_READER));
        next = { files: mergeEntity(next.files, st.id, d), problems: next.problems };
      }
      const fresh = [...next.problems, ...newProblems(baseline, check(next.files).problems, st.id)];
      if (!fresh.length) { real = next.files; ok = true; break; }
      const bad = blameRows(fresh, fixes.map((f) => f.id), next.files, st.id);
      if (bad && bad.size) {
        for (const rid of bad) { const e = st.edits.get(rid); st.edits.delete(rid); if (e?.kind === 'writer') st.failedFix.set(rid, `直しが文の検査に落ちた: ${fresh[0].slice(0, 120)}`); }
      } else {
        // 外す側が原因: 外すのをやめる
        for (const k of dropIds) st.findings.filter((f) => f.rowId && dk(f.rowId) === k).forEach((f) => { f.note = `外すと文の検査に落ちるので残した: ${fresh[0].slice(0, 100)}`; });
        st.drops.clear(); dropIds = new Set();
      }
    }
    if (ok) changedIds.push(st.id);
    else { st.edits.clear(); st.drops.clear(); }
  }
  if (changedIds.length) {
    saveFiles(root, startFiles, real);
    try { await prepare(changedIds, 'judged'); } catch (e) {
      saveFiles(root, loadFiles(root), startFiles);
      for (const id of changedIds) failed.push({ id, reason: `${(e as Error).message}（直しは元に戻した）` });
      changedIds.length = 0;
      for (const st of live) { st.edits.clear(); st.drops.clear(); }
    }
  }

  // ---- 6. 直した後の画面で数え直す・止める事例を決める・結果を残す ----
  const afterIds = live.map((s) => s.id);
  const screens1 = changedIds.length ? await render(afterIds, 'after') : screens0;
  const filesNow = loadFiles(root);
  const results: JudgeCaseResult[] = [];
  const blocked: string[] = [];
  const dir = join(root, 'data/pipeline/reader-judge');
  mkdirSync(dir, { recursive: true });
  await pool(live, opt.concurrency, async (st) => {
    try {
      const after = await evaluate(st, filesNow);
      const s1 = screens1.get(st.id) ?? st.screen0;
      const screenAfter = screenChecks([...s1.detail, ...s1.list, ...s1.discover]);
      const afterKeys = new Set(fixable(after).map(flagKey));
      for (const f of st.findings) {
        if (!f.rowId) continue;
        const edit = st.edits.get(f.rowId); const drop = st.drops.get(dk(f.rowId));
        if (drop) { f.status = 'dropped'; f.note = drop; }
        else if (edit && !afterKeys.has(flagKey(f))) { f.status = edit.kind === 'machine' ? 'fixed-machine' : 'fixed'; f.before = edit.before; f.after = edit.after; }
        else if (!afterKeys.has(flagKey(f))) { f.status = 'resolved'; f.note = '他の行の直しまたは外しで消えた'; }
        else f.note = st.failedFix.get(f.rowId) ?? (f.rowId === 'list' ? '一覧の文は外せないので、そのまま残した' : '直す回数の上限で触れなかった、または外すと文の検査に落ちる');
      }
      // 事例ごと止める: 個人情報が画面に出る、作る側の言葉が外せない文（一覧・概要）に残る
      const reasons: string[] = [];
      for (const p of new Set(screenAfter.privacy)) reasons.push(`privacy: 画面に個人情報らしい文字列が出る（${p.slice(0, 4)}…）`);
      for (const f of fixable(after).filter((x) => x.kind === 'b' && (x.rowId === 'list' || x.rowId === 'summary'))) reasons.push(`builder: ${f.rowId} に作る側の言葉が残る（${f.reason.slice(0, 60)}）`);
      const mechanical = [...st.edits.values()].filter((e) => e.kind === 'machine').length;
      const result: JudgeCaseResult = {
        id: st.id, name: st.name, runId, startedAt: new Date(st.started).toISOString(), seconds: Number(((now() - st.started) / 1000).toFixed(1)),
        judge: { independent: opt.independent, label: opt.judgeLabel },
        screenLines: s1.detail.length + s1.list.length + s1.discover.length,
        before: { flags: countKeys(st.before), byKind: countByKind(st.before) },
        after: { flags: countKeys(after), byKind: countByKind(after) },
        fixedRows: [...st.edits.values()].filter((e) => e.kind === 'writer').length, droppedRows: st.drops.size, machineFixedRows: mechanical,
        caseLevel: after.filter((f) => !f.rowId).length + screenAfter.flags.length,
        blocked: reasons.length > 0, blockReasons: reasons.slice(0, 5),
        findings: st.findings,
        calls: { judge: st.judgeStats.calls, judgeCached: st.judgeStats.cached, writer: st.writerCalls },
        costUsd: Number((st.judgeStats.cost + st.writerCost).toFixed(4)),
      };
      if (result.blocked) blocked.push(st.id);
      results.push(result);
      writeFileSync(join(dir, `${st.id}.json`), `${JSON.stringify(result, null, 1)}\n`);
      appendFileSync(join(root, 'data/pipeline/reader-judge.jsonl'), `${JSON.stringify({ runId, id: st.id, seconds: result.seconds, before: result.before, after: result.after, fixed: result.fixedRows, dropped: result.droppedRows, machineFixed: mechanical, blocked: result.blocked, calls: result.calls, costUsd: result.costUsd })}\n`);
    } catch (e) { failed.push({ id: st.id, reason: `結果の集計に失敗: ${(e as Error).message}` }); }
  });
  cache.save();
  return { results, failed, blocked, changedIds };
}

export function formatJudge(s: JudgeSummary): string {
  const lines = [`読み手の判定: ${s.results.length} 件を判定、止める ${s.blocked.length} 件、失敗 ${s.failed.length} 件`];
  for (const r of s.results) lines.push(`  ${r.id}  引っかかる行×観点 ${r.before.flags} → ${r.after.flags}  機械で直した ${r.machineFixedRows}・書き手が直した ${r.fixedRows}・外した ${r.droppedRows}  ${r.seconds} 秒${r.blocked ? '  【止める】' : ''}`);
  return lines.join('\n');
}

export type { Kind };

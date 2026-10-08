/**
 * case:run の「読み手の判定」段（judge）。公開データの作成（prepare）の後ろで、事例ごとに次を行う。
 *
 *  1. 手元で描いた画面（詳細・一覧・探す）の文を取る（screen-lines.tsx。データでなく、描いた画面の文字）。
 *  2. 機械で先に直す・拾う: 円換算の付け直し、一覧の句点、重なった行（既存の部品）。辞書に落ちる言い回し・略語は機械が拾う。
 *  3. 文を書いた AI とは別の AI が、画面の全行を a〜h の観点で判定する（judge-prompt.md）。
 *  4. 引っかかった画面の層の行を、理由つきで書き手に返して1回だけ直させる。直した行は、数字・年・名前が増減していないかを機械で確かめる
 *     （paraphrase-check.ts ほか）。確かめに落ちた直しは採らない。
 *  5. 直した画面をもう一度描き、同じ判定役が読み直す。直しても残る行・直せなかった行は、その行だけ外す（一覧の文は外せない）。
 *  6. 事例ごと止めるのは、嘘の数字・作る側の言葉・違法な手順の指南・個人情報だけ（判定役が block を付け、外せない行に残った時）。
 *
 * 結果（行ごとの理由・直したか・外したか）は data/pipeline/reader-judge/<事例ID>.json に事例ごとに残す。
 * 事実の欄・分類の札・画面の作りの引っかかりは、この段では直さず（事実の欄は別の担当）、結果に「直せない」として残す。
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
import { dropRows, duplicateDrops, normalizeDisplay, withCodeYen } from './display-lenient';
import {
  KIND_LABEL, applyMechanical, buildJudgeUser, buildScreenLines, displayRows, invarianceProblems, loadMachineRules, machineFindings, makeCaseTextCheck,
  parseJudgeOutput, parseRepairOutput, type BlockKind, type CaseTextCheck, type JudgeIssue, type Kind, type MachineRules, type RenderedScreen, type ScreenLine,
} from './judge-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE_ROOT = resolve(HERE, '../..');
const read = (file: string): string => readFileSync(join(CODE_ROOT, file), 'utf8');
const skill = (): string => read('.claude/skills/natural-japanese/SKILL.md').replace(/^---[\s\S]*?---\n/, '');

export type FindingStatus =
  | 'fixed-machine' // 機械で直した（円換算・句点）
  | 'fixed' // 書き手が直し、確認に通った
  | 'dropped' // 直せない・直しても残ったので、その行を外した
  | 'unfixable' // この段では直せない（事実の欄・札・画面の作り・一覧の文）
  | 'rejected-fix'; // 書き手の直しを採らず（確認に落ちた）、その行を外した

export interface FindingRecord {
  source: 'ai' | 'machine';
  line?: number; text?: string; rowId?: string; kind: Kind; reason: string; fix?: string; block: BlockKind;
  status: FindingStatus; note?: string; before?: string; after?: string;
}
export interface JudgeCaseResult {
  id: string; name?: string; runId: string; startedAt: string; seconds: number;
  judge: { independent: boolean; label: string };
  screenLines: number;
  /** 引っかかる行（画面の行）の数。before は判定の最初、after は直し・外した後 */
  before: { flaggedLines: number; fixableLines: number; byKind: Record<string, number> };
  after: { flaggedLines: number; fixableLines: number; byKind: Record<string, number> };
  fixedRows: number; droppedRows: number; machineFixedRows: number;
  blocked: boolean; blockReasons: string[];
  findings: FindingRecord[];
  calls: { judge: number; writer: number }; costUsd: number;
  rejectedQuotes: number;
  error?: string;
}
export interface JudgeSummary { results: JudgeCaseResult[]; failed: Array<{ id: string; reason: string }>; blocked: string[]; changedIds: string[] }

export interface JudgeOptions { root: string; ids: string[]; runId: string; concurrency: number; independent: boolean; judgeLabel: string; log?: (t: string) => void }
export interface JudgeDeps {
  exec: Exec; judge: Caller; writer: Caller;
  /** 試験用の差し替え */
  check?: CaseTextCheck; rules?: MachineRules; now?: () => number;
}

const KIND_ORDER = Object.keys(KIND_LABEL);
const countBy = (kinds: Kind[]): Record<string, number> => Object.fromEntries(KIND_ORDER.map((k) => [k, kinds.filter((x) => x === k).length]).filter(([, n]) => (n as number) > 0));

function loadFiles(root: string): DisplayFiles {
  return Object.fromEntries(DISPLAY_FILES.map((f) => [f, JSON.parse(readFileSync(join(root, 'data', `${f}.json`), 'utf8'))])) as unknown as DisplayFiles;
}
function saveFiles(root: string, before: DisplayFiles, after: DisplayFiles): void {
  for (const f of DISPLAY_FILES) { const t = serialize(after[f]); if (t !== serialize(before[f])) writeFileSync(join(root, 'data', `${f}.json`), t); }
}
const entityDisplayOf = (files: DisplayFiles, id: string): EntityDisplay => {
  const one = <T extends { entityId: string }>(list: T[]): T | undefined => list.find((x) => x.entityId === id);
  return { list: one(files['list-lines']), summary: one(files['summary-lines']), detail: files['detail-lines'].filter((l) => l.entityId === id), success: one(files['success-points']), chapters: one(files['case-chapters']) };
};
/** 外す行の鍵。分析欄は answer/note を分けず1行、成功の秘訣は head/body を分けず1点として外す */
const dk = (id: string): string => id.replace(/\.(answer|note|head|body)$/, '');
const NO_READER = { analysis: [] } as unknown as LiveReader;
const FORBIDDEN_TAGS = /^(収集事例|収集|未分類|その他|test|テスト)$/;

interface Stats { calls: number; seconds: number; cost: number }
async function ask<T>(caller: Caller, system: string, user: string, label: string, parse: (text: string) => T, stats: Stats): Promise<T> {
  let last = '';
  for (let i = 0; i < 2; i += 1) {
    const res = await caller({ system, user: i ? `${user}\n\n前回の返答は使えなかった（${last}）。指定の形の JSON だけを返す。` : user, label });
    stats.calls += 1; stats.seconds += res.seconds; stats.cost += res.costUsd ?? 0;
    try { return parse(res.text); } catch (e) { last = (e as Error).message; }
  }
  throw new Error(`${label}: 返答を読めなかった（${last}）`);
}

/** 並列に流す（同時に動かす数を絞る） */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => { while (next < items.length) await fn(items[next++]); }));
}

interface CaseState {
  id: string; name?: string; started: number;
  screen0: RenderedScreen; lines0: ScreenLine[]; files0: DisplayFiles;
  stats: { judge: Stats; writer: Stats };
  findings: FindingRecord[];
  j1Issues: JudgeIssue[]; rejectedQuotes: number;
  /** 画面の層の行の id → 採った直し（機械の直しも含む） */
  edits: Map<string, { before: string; after: string; kind: 'machine' | 'writer'; rule?: string }>;
  /** 外す行（id → 理由・状態） */
  drops: Map<string, { why: string; status: 'dropped' | 'rejected-fix' }>;
  writerAccepted: Set<string>;
  screen1?: RenderedScreen; lines1?: ScreenLine[]; j2Issues?: JudgeIssue[];
  error?: string;
}

export async function runJudge(opt: JudgeOptions, deps: JudgeDeps): Promise<JudgeSummary> {
  const { root, runId } = opt;
  const log = opt.log ?? ((t: string) => console.log(`[judge] ${t}`));
  const now = deps.now ?? Date.now;
  const check = deps.check ?? makeCaseTextCheck(root);
  const rules = deps.rules ?? loadMachineRules(root);
  const work = join(root, 'data/pipeline/case-run', runId, 'judge');
  mkdirSync(work, { recursive: true });
  const judgeSystem = `${read('scripts/reader-case/judge-prompt.md')}\n\n${skill()}`;
  const writerSystem = `${read('scripts/reader-case/display-repair-prompt.md')}\n\n${read('scripts/reader-case/judge-repair-prompt.md')}\n\n${skill()}`;
  const failed: Array<{ id: string; reason: string }> = [];
  const nodeArgs = (script: string, ...a: string[]): string[] => ['--import', 'tsx', script, ...a];

  /** 手元で描いた画面の文を取る（描けない事例は理由つきで返す） */
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

  // ---- 1. 描く ----
  const startFiles = loadFiles(root);
  const screens0 = await render(opt.ids, 'before');
  const states: CaseState[] = [];
  for (const id of opt.ids) {
    const s = screens0.get(id)!;
    if (!s.ok) { failed.push({ id, reason: `画面の文を取れなかった: ${s.error ?? '理由不明'}（公開データの作成が通っているか）` }); continue; }
    states.push({
      id, name: s.name, started: now(), screen0: s, lines0: buildScreenLines(s, startFiles), files0: startFiles,
      stats: { judge: { calls: 0, seconds: 0, cost: 0 }, writer: { calls: 0, seconds: 0, cost: 0 } },
      findings: [], j1Issues: [], rejectedQuotes: 0, edits: new Map(), drops: new Map(), writerAccepted: new Set(),
    });
  }
  log(`画面の文を取った: ${states.length}/${opt.ids.length} 件`);

  // ---- 2〜4. 機械で先に直す → 判定 → 書き手に1回だけ直させる（事例ごとに並列） ----
  await pool(states, opt.concurrency, async (st) => {
    try {
      const { id } = st;
      const text0 = new Map(displayRows(id, st.files0).map((r) => [r.id, r.text]));
      // 機械で先に直す
      const mech = applyMechanical(id, st.files0);
      for (const c of mech.changes) st.edits.set(c.id, { before: c.before, after: c.after, kind: 'machine', rule: c.rule });
      const current = mech.files;
      // 重なった行（既存の部品）。残す1か所以外は外す
      for (const d of duplicateDrops(id, current, entityDisplayOf(current, id))) {
        if (!st.drops.has(d.id)) st.drops.set(d.id, { why: `機械: ${d.why}`.slice(0, 200), status: 'dropped' });
      }
      const droppedByMachine = new Set(st.drops.keys());
      // 札の機械の確認（直せない）
      const tags = st.screen0.tags ?? [];
      if (!tags.length) st.findings.push({ source: 'machine', kind: 'g', reason: '分類の札が1つも無い', block: 'none', status: 'unfixable' });
      for (const t of tags.filter((x) => FORBIDDEN_TAGS.test(x))) st.findings.push({ source: 'machine', kind: 'g', reason: `作る側の札「${t}」が画面に出る`, block: 'none', status: 'unfixable', text: t });
      // 機械の辞書で拾える引っかかり
      const problems = new Map<string, string[]>();
      const add = (rowId: string, p: string): void => { problems.set(rowId, [...(problems.get(rowId) ?? []), p]); };
      for (const m of machineFindings(id, current, rules)) {
        if (droppedByMachine.has(dk(m.rowId))) continue;
        add(m.rowId, `${m.kind} ${KIND_LABEL[m.kind]}: ${m.reason}`);
        st.findings.push({ source: 'machine', rowId: m.rowId, kind: m.kind, reason: m.reason, block: 'none', status: 'unfixable', text: text0.get(m.rowId) });
      }
      // 判定役が画面の全行を読む
      const parsed = await ask(deps.judge, judgeSystem, buildJudgeUser(st.screen0, st.lines0), `${id} 読み手の判定`, (t) => parseJudgeOutput(t, st.lines0), st.stats.judge);
      st.j1Issues = parsed.issues; st.rejectedQuotes = parsed.rejected;
      for (const i of parsed.issues) {
        const line = st.lines0[i.line - 1];
        st.findings.push({ source: 'ai', line: i.line, text: line.text, rowId: line.rowId, kind: i.kind, reason: i.reason, fix: i.fix, block: i.block, status: 'unfixable' });
        if (line.rowId && !droppedByMachine.has(dk(line.rowId))) add(line.rowId, `${i.kind} ${KIND_LABEL[i.kind]}: 「${i.quote}」${i.reason}（直し方: ${i.fix}）${i.also.length ? `（重なる先: ${i.also.map((n) => st.lines0[n - 1]?.text.slice(0, 30)).join(' / ')}）` : ''}`);
      }
      // 書き手に1回だけ返す
      const rowsNow = new Map(displayRows(id, current).map((r) => [r.id, r.text]));
      const send = [...problems.keys()].filter((r) => rowsNow.has(r)).map((rid) => ({ id: rid, text: rowsNow.get(rid)!, problems: problems.get(rid)! }));
      if (send.length) {
        const ids = new Set(send.map((r) => r.id));
        const user = JSON.stringify({ screen: st.lines0.map((l) => l.text), rows: send });
        const fixes = await ask(deps.writer, writerSystem, user, `${id} 直し`, (t) => parseRepairOutput(t, ids), st.stats.writer);
        const elsewhere = (rid: string): string => [...rowsNow].filter(([k]) => k !== rid).map(([, v]) => v).join('\n');
        for (const row of send) {
          const fix = fixes.find((f) => f.id === row.id);
          const cand = fix ? withCodeYen(fix.text) : '';
          const bad = !fix ? ['直した文が返らなかった']
            : cand === row.text ? ['直らなかった（元の文のまま）']
              : [...invarianceProblems(row.text, cand, st.lines0.map((l) => l.text), elsewhere(row.id)),
                ...(machineFindings(id, applyRepairs(current, id, [{ id: row.id, text: cand }]).files, rules).filter((m) => m.rowId === row.id).map((m) => `辞書にまだ落ちる: ${m.reason}`))];
          if (!bad.length) { st.edits.set(row.id, { before: text0.get(row.id) ?? row.text, after: cand, kind: 'writer' }); st.writerAccepted.add(row.id); }
          else if (row.id === 'list') st.findings.filter((f) => f.rowId === 'list').forEach((f) => { f.note = `直しを採らなかった: ${bad.join(' / ')}`; });
          else st.drops.set(dk(row.id), { why: `直しを採らなかった: ${bad.join(' / ')}`, status: 'rejected-fix' });
        }
      }
    } catch (e) { st.error = (e as Error).message; }
  });
  for (const st of states.filter((s) => s.error)) failed.push({ id: st.id, reason: st.error! });
  const live = states.filter((s) => !s.error);

  // ---- 3. 直しを実ファイルへ（1件ずつ。文の検査に落ちた行は戻す）→ 公開データを作り直す → 描き直す ----
  const changedIds: string[] = [];
  let real = loadFiles(root);
  const baseline = check(real).problems;
  for (const st of live) {
    if (!st.edits.size) continue;
    for (let round = 0; round < 4; round += 1) {
      const fixes = [...st.edits].map(([id, e]) => ({ id, text: e.after }));
      if (!fixes.length) break;
      const next = applyRepairs(real, st.id, fixes);
      const res = check(next.files);
      const fresh = [...next.problems, ...newProblems(baseline, res.problems, st.id)];
      if (!fresh.length) { real = next.files; changedIds.push(st.id); break; }
      const bad = blameRows(fresh, fixes.map((f) => f.id), next.files, st.id);
      const targets = bad && bad.size ? [...bad] : fixes.map((f) => f.id);
      for (const rid of targets) {
        const e = st.edits.get(rid);
        st.edits.delete(rid); st.writerAccepted.delete(rid);
        if (e?.kind === 'writer') st.drops.set(dk(rid), { why: `直しが文の検査に落ちた: ${fresh[0].slice(0, 120)}`, status: 'rejected-fix' });
      }
    }
  }
  if (changedIds.length) {
    saveFiles(root, startFiles, real);
    try { await prepare(changedIds, 'repaired'); } catch (e) {
      // 戻して、直した事例を失敗にする
      let back = loadFiles(root);
      for (const id of changedIds) back = mergeEntity(back, id, entityDisplayOf(startFiles, id));
      saveFiles(root, loadFiles(root), back);
      for (const id of changedIds) failed.push({ id, reason: `${(e as Error).message}（直しは元に戻した）` });
      changedIds.length = 0;
      live.length = 0;
    }
  }

  // ---- 5. 直した画面を同じ判定役が読み直す ----
  const reread = live.filter((s) => s.writerAccepted.size);
  if (reread.length) {
    const screens1 = await render(reread.map((s) => s.id), 'after');
    const filesNow = loadFiles(root);
    await pool(reread, opt.concurrency, async (st) => {
      try {
        const s = screens1.get(st.id)!;
        if (!s.ok) throw new Error(`直した後の画面の文を取れなかった: ${s.error}`);
        st.screen1 = s; st.lines1 = buildScreenLines(s, filesNow);
        const parsed = await ask(deps.judge, judgeSystem, buildJudgeUser(s, st.lines1), `${st.id} 読み手の判定（直した後）`, (t) => parseJudgeOutput(t, st.lines1!), st.stats.judge);
        st.j2Issues = parsed.issues;
      } catch (e) { st.error = (e as Error).message; }
    });
    for (const st of reread.filter((s) => s.error)) { failed.push({ id: st.id, reason: st.error! }); }
  }
  const alive = live.filter((s) => !s.error);

  // ---- 6. 直しても残る行を外す・止める事例を決める ----
  const blocked: string[] = [];
  const results: JudgeCaseResult[] = [];
  const droppedIds: string[] = [];
  let afterDrop = loadFiles(root);
  const baselineAfter = check(afterDrop).problems;
  for (const st of alive) {
    // 直しても残った行 = 直し後の判定で、直した行に指摘が残ったもの
    for (const i of st.j2Issues ?? []) {
      const rid = st.lines1?.[i.line - 1]?.rowId;
      if (rid && st.writerAccepted.has(rid) && !st.drops.has(dk(rid))) st.drops.set(dk(rid), { why: `直しても読み手の判定に残った（${i.kind} ${KIND_LABEL[i.kind]}: ${i.reason}）`.slice(0, 200), status: 'dropped' });
    }
    // 外せない行（一覧の文）は外さない
    st.drops.delete('list');
    let dropIds = new Set(st.drops.keys());
    if (dropIds.size) {
      for (let round = 0; round < 3; round += 1) {
        const d = normalizeDisplay(dropRows(entityDisplayOf(afterDrop, st.id), dropIds, NO_READER));
        const next = mergeEntity(afterDrop, st.id, d);
        const fresh = newProblems(baselineAfter, check(next).problems, st.id);
        if (!fresh.length) { afterDrop = next; droppedIds.push(st.id); break; }
        // 外したことで検査に落ちる時は、外すのをやめる（行は残し、結果に残す）
        for (const rid of dropIds) { st.findings.filter((f) => f.rowId && dk(f.rowId) === rid).forEach((f) => { f.note = `外すと文の検査に落ちるので残した: ${fresh[0].slice(0, 100)}`; }); st.drops.delete(rid); }
        dropIds = new Set();
        break;
      }
    }
    // 事例ごと止めるか
    const final = (st.j2Issues ?? st.j1Issues);
    const lines = st.j2Issues ? st.lines1! : st.lines0;
    const reasons: string[] = [];
    for (const i of final.filter((x) => x.block !== 'none')) {
      const rid = lines[i.line - 1]?.rowId;
      if (rid && st.drops.has(dk(rid))) continue; // 外した行の指摘は解消
      reasons.push(`${i.block}: ${lines[i.line - 1]?.text.slice(0, 50)}（${i.reason}）`);
    }
    // 結果の組み立て
    const flaggedBefore = new Set<number>();
    for (const f of st.findings.filter((x) => x.line)) flaggedBefore.add(f.line!);
    for (const f of st.findings.filter((x) => x.source === 'machine' && x.rowId)) st.lines0.filter((l) => l.rowId === f.rowId).forEach((l) => flaggedBefore.add(l.n));
    const kindsBefore: Kind[] = st.findings.map((f) => f.kind);
    const fixableBefore = new Set([...flaggedBefore].filter((n) => st.lines0[n - 1]?.rowId));
    // 直した後に残る行
    let remainKinds: Kind[]; let remainLines: Set<number>; let remainFixable: Set<number>;
    if (st.j2Issues) {
      const rem = st.j2Issues.filter((i) => { const rid = st.lines1![i.line - 1]?.rowId; return !(rid && st.drops.has(dk(rid))); });
      remainKinds = rem.map((i) => i.kind); remainLines = new Set(rem.map((i) => i.line));
      remainFixable = new Set(rem.filter((i) => st.lines1![i.line - 1]?.rowId).map((i) => i.line));
    } else {
      const rem = st.findings.filter((f) => f.source === 'ai' && !(f.rowId && st.drops.has(dk(f.rowId))) && !(f.rowId && st.edits.get(f.rowId)));
      remainKinds = rem.map((f) => f.kind); remainLines = new Set(rem.map((f) => f.line!)); remainFixable = new Set(rem.filter((f) => f.rowId).map((f) => f.line!));
    }
    for (const f of st.findings.filter((x) => x.source === 'machine' && x.kind === 'g')) { remainKinds.push('g'); void f; }
    // 状態を付ける
    for (const f of st.findings) {
      if (!f.rowId) { f.status = 'unfixable'; f.note ??= f.kind === 'g' ? '分類の札はこの段では直せない' : '事実の欄・見出し・画面の作りの行は、この段では直さない（事実の欄は別の担当）'; continue; }
      const drop = st.drops.get(dk(f.rowId)); const edit = st.edits.get(f.rowId);
      if (drop) { f.status = drop.status; f.note = drop.why; }
      else if (edit) { f.status = edit.kind === 'machine' ? 'fixed-machine' : 'fixed'; f.before = edit.before; f.after = edit.after; if (edit.rule) f.note = edit.rule; }
      else { f.status = 'unfixable'; f.note ??= f.rowId === 'list' ? '一覧の文は外せないので、そのまま残した' : '直せなかった'; }
    }
    for (const [rid, e] of st.edits) if (e.kind === 'machine' && !st.findings.some((f) => f.rowId === rid)) st.findings.push({ source: 'machine', rowId: rid, kind: 'e', reason: e.rule ?? '機械の直し', block: 'none', status: 'fixed-machine', before: e.before, after: e.after });
    const result: JudgeCaseResult = {
      id: st.id, name: st.name, runId, startedAt: new Date(st.started).toISOString(), seconds: Number(((now() - st.started) / 1000).toFixed(1)),
      judge: { independent: opt.independent, label: opt.judgeLabel },
      screenLines: st.lines0.length,
      before: { flaggedLines: flaggedBefore.size, fixableLines: fixableBefore.size, byKind: countBy(kindsBefore) },
      after: { flaggedLines: remainLines.size + (remainKinds.filter((k) => k === 'g').length ? 1 : 0), fixableLines: remainFixable.size, byKind: countBy(remainKinds) },
      fixedRows: [...st.edits.values()].filter((e) => e.kind === 'writer').length, droppedRows: st.drops.size, machineFixedRows: [...st.edits.values()].filter((e) => e.kind === 'machine').length,
      blocked: reasons.length > 0, blockReasons: reasons.slice(0, 5),
      findings: st.findings, calls: { judge: st.stats.judge.calls, writer: st.stats.writer.calls }, costUsd: Number((st.stats.judge.cost + st.stats.writer.cost).toFixed(4)),
      rejectedQuotes: st.rejectedQuotes,
    };
    if (result.blocked) blocked.push(st.id);
    results.push(result);
  }
  if (droppedIds.length) {
    saveFiles(root, loadFiles(root), afterDrop);
    try { await prepare([...new Set(droppedIds)], 'dropped'); } catch (e) { for (const id of droppedIds) failed.push({ id, reason: (e as Error).message }); }
  }
  // 結果を事例ごとに残す
  const dir = join(root, 'data/pipeline/reader-judge');
  mkdirSync(dir, { recursive: true });
  for (const r of results) {
    writeFileSync(join(dir, `${r.id}.json`), `${JSON.stringify(r, null, 1)}\n`);
    appendFileSync(join(root, 'data/pipeline/reader-judge.jsonl'), `${JSON.stringify({ runId, id: r.id, seconds: r.seconds, before: r.before, after: r.after, fixed: r.fixedRows, dropped: r.droppedRows, machineFixed: r.machineFixedRows, blocked: r.blocked, calls: r.calls, costUsd: r.costUsd })}\n`);
  }
  return { results, failed, blocked, changedIds: [...new Set([...changedIds, ...droppedIds])] };
}

export function formatJudge(s: JudgeSummary): string {
  const lines = [`読み手の判定: ${s.results.length} 件を判定、止める ${s.blocked.length} 件、失敗 ${s.failed.length} 件`];
  for (const r of s.results) lines.push(`  ${r.id}  引っかかる行 ${r.before.flaggedLines}（直せる ${r.before.fixableLines}）→ ${r.after.flaggedLines}（直せる ${r.after.fixableLines}）  機械で直した ${r.machineFixedRows}・書き手が直した ${r.fixedRows}・外した ${r.droppedRows}  ${r.seconds} 秒${r.blocked ? '  【止める】' : ''}`);
  return lines.join('\n');
}

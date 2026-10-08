/**
 * 読み手の判定（case:run の judge 段）の部品。AI を呼ばない純粋な処理と、試験で差し替えられる小さな入出力だけを置く。
 * 流れの本体は judge-stage.ts。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DISPLAY_FILES, applyRepairs, extractNumbers, lostNumbers, newProblems, parseCheckOutput, repairRows, serialize,
  type DisplayFiles,
} from '../../src/shared/display-build';
import { describeHit, findNoise, findUnnatural, loadNaturalRules } from '../architecture/natural-japanese.mjs';
import { describeUnclear, findUnclear, loadClarityRules } from '../architecture/reader-clarity.mjs';
import { withCodeYen } from './display-lenient';
import { newFactTokens } from './paraphrase-check';

// ---------- 観点 ----------
export const KINDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = {
  a: '不自然・言いさし', b: '作る側の言葉', c: '重複・呼び名のゆれ', d: '説明のない固有名詞・略語',
  e: '円の二重・ゆれ', f: '意味が取れない・食い違い・金額が欠けた', g: '札', h: '画面の崩れ',
};
export type BlockKind = 'none' | 'fact' | 'builder' | 'legal' | 'privacy';

/** 画面から取った文（scripts/reader-case/screen-lines.tsx の出力） */
export interface RenderedScreen { id: string; ok: boolean; name?: string; tags?: string[]; detail: string[]; list: string[]; discover: string[]; error?: string }

export interface ScreenLine { n: number; section: 'detail' | 'list' | 'discover'; text: string; rowId?: string }

// ---------- 画面の行 → 画面の層の行 ----------
const norm = (s: string): string => s.replace(/\s+/g, '');

/** その事例の、画面の層の行（一覧・概要・分析欄・成功の秘訣・章）。id は build-display の repairRows と同じ形 */
export function displayRows(entityId: string, files: DisplayFiles): Array<{ id: string; text: string }> {
  return repairRows(entityId, files, () => ['行']).map((r) => ({ id: r.id, text: r.text }));
}

/** 詳細・一覧・探す画面の文に行番号を振り、画面の層の行に当たる行にはその id を付ける */
export function buildScreenLines(screen: RenderedScreen, files: DisplayFiles): ScreenLine[] {
  const rows = displayRows(screen.id, files).map((r) => ({ ...r, key: norm(r.text) })).filter((r) => r.key.length >= 6);
  const out: ScreenLine[] = [];
  const push = (section: ScreenLine['section'], list: string[]): void => {
    let prev = '';
    for (const text of list) {
      if (text === prev) continue; // 一覧は同じ行が二重に出る（スマホ用と表用）。判定には1回だけ見せる
      prev = text;
      const k = norm(text);
      const hit = k.length < 6 ? undefined : rows
        .filter((r) => k.includes(r.key) || (k.length >= 10 && r.key.includes(k)))
        .sort((a, b) => b.key.length - a.key.length)[0];
      out.push({ n: out.length + 1, section, text, ...(hit ? { rowId: hit.id } : {}) });
    }
  };
  push('detail', screen.detail);
  push('list', screen.list);
  push('discover', screen.discover);
  return out;
}

// ---------- 機械で先に直す・拾う ----------
export interface RowChange { id: string; before: string; after: string; rule: string }

/** 文の機械的な直し。円換算をコードで付け直す（二重・入れ子・ゆれを消す）、一覧の1文の句点を外す（他の事例とそろえる） */
export function mechanicalText(rowId: string, text: string): { text: string; rules: string[] } {
  const rules: string[] = [];
  let t = withCodeYen(text);
  if (t !== text) rules.push('円換算をコードで付け直した');
  if (rowId === 'list' && /。$/.test(t) && t.indexOf('。') === t.length - 1) { t = t.slice(0, -1); rules.push('一覧の文の句点を外した'); }
  return { text: t, rules };
}

/** 画面の層の全行に機械の直しを当てる。直した行と、直した後の files を返す */
export function applyMechanical(entityId: string, files: DisplayFiles): { files: DisplayFiles; changes: RowChange[] } {
  const fixes: Array<{ id: string; text: string }> = [];
  const changes: RowChange[] = [];
  for (const r of displayRows(entityId, files)) {
    const m = mechanicalText(r.id, r.text);
    if (m.text !== r.text && m.text.trim()) { fixes.push({ id: r.id, text: m.text }); changes.push({ id: r.id, before: r.text, after: m.text, rule: m.rules.join('・') }); }
  }
  return { files: fixes.length ? applyRepairs(files, entityId, fixes).files : files, changes };
}

export interface MachineRules {
  natural: ReturnType<typeof loadNaturalRules>;
  clarity: ReturnType<typeof loadClarityRules>;
  language: Array<{ re: RegExp; reason: string; suggest: string }>;
}
export function loadMachineRules(root: string): MachineRules {
  const language = existsSync(join(root, 'data/reader-language.json'))
    ? (JSON.parse(readFileSync(join(root, 'data/reader-language.json'), 'utf8')) as Array<{ pattern: string; reason: string; suggest: string }>)
    : [];
  return {
    natural: loadNaturalRules(join(root, 'data/natural-japanese.json')),
    clarity: loadClarityRules(join(root, 'data/reader-clarity.json')),
    language: language.flatMap((l) => { try { return [{ re: new RegExp(l.pattern), reason: l.reason, suggest: l.suggest }]; } catch { return []; } }),
  };
}

export interface MachineFinding { rowId: string; kind: Kind; reason: string }
/** 機械の辞書で拾える引っかかり（不自然な言い回し・読む人に要らない情報・意味が取れない言い方・略語）。AI には頼らない */
export function machineFindings(entityId: string, files: DisplayFiles, rules: MachineRules): MachineFinding[] {
  const out: MachineFinding[] = [];
  for (const r of repairRows(entityId, files, (text, ctx) => {
    const hits = [
      ...findUnnatural(text, rules.natural).map((h) => `a|${describeHit(h)}`),
      ...findNoise(text, ctx).map((p: string) => `b|${p}`),
      ...findUnclear(text, rules.clarity).map((h) => `f|${describeUnclear(h)}`),
      ...rules.language.filter((l) => l.re.test(text)).map((l) => `d|${l.reason}（言い換え: ${l.suggest}）`),
    ];
    return hits;
  })) {
    for (const p of r.problems) { const [kind, ...rest] = p.split('|'); out.push({ rowId: r.id, kind: kind as Kind, reason: rest.join('|') }); }
  }
  return out;
}

// ---------- 判定役の入出力 ----------
export interface JudgeIssue { line: number; quote: string; kind: Kind; reason: string; fix: string; also: number[]; block: BlockKind }

export function buildJudgeUser(screen: RenderedScreen, lines: ScreenLine[]): string {
  return JSON.stringify({ tags: screen.tags ?? [], lines: lines.map((l) => ({ n: l.n, section: l.section, text: l.text })) });
}

function jsonOf(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try { return JSON.parse(t); } catch { /* 前後に文があれば、最初の { から最後の } までを読む */ }
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('JSON として読めない');
}

/** 判定役の返答を検査して取り出す。引用がその行に一字一句ある指摘だけを採る（作り話の指摘は数えて捨てる） */
export function parseJudgeOutput(text: string, lines: readonly ScreenLine[]): { issues: JudgeIssue[]; rejected: number } {
  const raw = (jsonOf(text) as { issues?: unknown }).issues;
  if (!Array.isArray(raw)) throw new Error('issues の配列が無い');
  const byN = new Map(lines.map((l) => [l.n, l]));
  const issues: JudgeIssue[] = [];
  let rejected = 0;
  for (const x of raw as Array<Record<string, unknown>>) {
    const line = Number(x.line); const quote = String(x.quote ?? '').trim(); const kind = String(x.kind ?? '') as Kind;
    const l = byN.get(line);
    if (!l || !quote || !(KINDS as readonly string[]).includes(kind) || !norm(l.text).includes(norm(quote))) { rejected += 1; continue; }
    const block = (['fact', 'builder', 'legal', 'privacy'] as const).find((b) => b === x.block) ?? 'none';
    issues.push({ line, quote, kind, reason: String(x.reason ?? '').slice(0, 200), fix: String(x.fix ?? '').slice(0, 200), also: Array.isArray(x.also) ? x.also.map(Number).filter((n) => byN.has(n)) : [], block });
  }
  return { issues, rejected };
}

export function parseRepairOutput(text: string, ids: ReadonlySet<string>): Array<{ id: string; text: string }> {
  const raw = (jsonOf(text) as { rows?: unknown }).rows;
  if (!Array.isArray(raw)) throw new Error('rows の配列が無い');
  return (raw as Array<{ id?: unknown; text?: unknown }>)
    .filter((r) => typeof r.id === 'string' && typeof r.text === 'string' && ids.has(r.id))
    .map((r) => ({ id: r.id as string, text: String(r.text).trim() }));
}

// ---------- 直しの不変の確認 ----------
const MARKS = /本人申告|本人|公式|第三者|報道|推測|推論|保存ページ/g;
const marksOf = (t: string): string => [...new Set(t.match(MARKS) ?? [])].sort().join('・');

/**
 * 直した文が、言い回しだけの直しか。数字・年・名前（paraphrase-check.ts の語）が増えていない、元の数字が消えていない、
 * 出どころの印（本人申告・公式など）が変わっていない。context は画面のほかの文（元の文に無くても画面に既にある語は増やしたことにしない）。
 */
export function invarianceProblems(before: string, after: string, context: readonly string[], elsewhere: string): string[] {
  const problems: string[] = [];
  const added = newFactTokens(after, before, context);
  if (added.length) problems.push(`元の文にも画面にも無い語が増えた: ${added.slice(0, 5).join('、')}`);
  const lost = lostNumbers(before, after, elsewhere);
  if (lost.length) problems.push(`元の数字が消えた: ${lost.slice(0, 5).join('、')}`);
  if (marksOf(before) !== marksOf(after)) problems.push(`出どころの印が変わった（${marksOf(before) || 'なし'} → ${marksOf(after) || 'なし'}）`);
  if (!after.trim()) problems.push('文が空');
  return problems;
}

// ---------- 文の検査（case-text:verify）を一時コピーの data/ で ----------
export interface CheckResult { ok: boolean; problems: string[] }
export type CaseTextCheck = (files: DisplayFiles) => CheckResult;

export function makeCaseTextCheck(root: string): CaseTextCheck {
  return (files) => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-check-'));
    try {
      mkdirSync(join(dir, 'data'));
      for (const f of DISPLAY_FILES) writeFileSync(join(dir, 'data', `${f}.json`), serialize(files[f]));
      for (const f of ['item-contract.json', 'reader-language.json', 'natural-japanese.json', 'reader-clarity.json']) copyFileSync(join(root, 'data', f), join(dir, 'data', f));
      const r = spawnSync(process.execPath, [join(root, 'scripts/architecture/check-case-text-standard.mjs')], { cwd: dir, encoding: 'utf8' });
      const output = `${r.stdout}\n${r.stderr}`;
      const problems = parseCheckOutput(output);
      if (r.status !== 0 && !problems.length) problems.push(`検査が読み取れない形で落ちた: ${output.trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`);
      return { ok: r.status === 0, problems };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  };
}

export { newProblems, extractNumbers };

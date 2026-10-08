/**
 * 読み手の判定（judge 段）の「機械で決まる検査」。AI は呼ばず、コードだけで判定する。
 *
 * 観点（a〜h）のうち、機械で決まるもの:
 *  a 文が途中で切れている（括弧の閉じ忘れ・文末が助詞や読点で終わる）、辞書に落ちる不自然な言い回し
 *  b 作る側の言葉（辞書・定型の注記・調査メモ口調）
 *  c 同じ数字・同じ話の重複（既存の部品）、呼び名のゆれ（data/reader-terms.json の aliases）
 *  d 略語の初出に説明が無い（略語の一覧 + data/reader-terms.json の固有名詞の初出）
 *  e 円の二重・入れ子・同じ外貨で円が違う・外貨に円が付いていない
 *  f 指す相手が消えた（章の先頭が「同じ〜」「この〜」で始まる）、金額が欠けた（「〜から契約できる」に数字が無い）、意味が取れない言い回しの辞書
 *  g 札（作る側の札・札が無い）  ※この段では直せない
 *  h 画面の崩れ（undefined・NaN・[object Object]・記号だけの行）  ※この段では直せない
 *
 * 1つの指摘 = 1行 × 1観点。直す・採る・外すの数え方はすべてこの単位。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DisplayFiles, EntityDisplay } from '../../src/shared/display-build';
import { KNOWN_ACRONYMS, missingYen } from '../reader-view/rules.mjs';
import { yenDoubles, yenVariants, MAKER_NOTES } from '../reader-view/structure-rules.mjs';
import { duplicateDrops } from './display-lenient';
import { displayRows, machineFindings, type Kind, type MachineRules } from './judge-lib';

export interface Flag {
  /** 画面の層の行の id。事例ぜんたいの指摘（札・画面の崩れ）は無し */
  rowId?: string;
  kind: Kind;
  /** 検査の名前（結果の集計と固定の検査集で使う） */
  code: string;
  reason: string;
  source: 'machine' | 'ai';
}

/** 事例の中の呼び名・固有名詞の辞書（data/reader-terms.json） */
export interface Terms {
  /** 同じものを指す呼び名の組。1つの事例の画面に2つ以上出たら、ゆれ（c） */
  aliases: string[][];
  /** 初めて出た所で、説明が要る固有名詞。explain は説明とみなす語の正規表現 */
  terms: Array<{ term: string; explain: string }>;
}
export function loadTerms(root: string): Terms {
  const f = join(root, 'data/reader-terms.json');
  if (!existsSync(f)) return { aliases: [], terms: [] };
  return JSON.parse(readFileSync(f, 'utf8')) as Terms;
}

export interface CheckContext { entityId: string; name?: string; tags?: string[]; terms: Terms; rules: MachineRules }

const LIST_ID = 'list';
const norm = (s: string): string => s.replace(/\s+/g, '');

/** 文末が助詞・読点で終わる、括弧が閉じていない: 言いさし（a） */
function cutOff(text: string, rowId: string): string | null {
  const t = text.trim();
  const pairs: Array<[string, string]> = [['「', '」'], ['（', '）'], ['(', ')'], ['『', '』']];
  for (const [o, c] of pairs) {
    const open = t.split(o).length - 1; const close = t.split(c).length - 1;
    if (open !== close) return `括弧 ${o}${c} が閉じていない`;
  }
  if (/[、，,・]$/.test(t)) return '文が読点や中黒で終わっている';
  // 一覧と見出しの行は体言止めでよい。本文の行が助詞で終わる時だけ言いさしとみなす
  if (rowId !== LIST_ID && /(?:は|が|を|に|で|と|の|や|から|まで|より|へ|も)$/.test(t)) return '文が助詞で終わっていて、言いさしに見える';
  return null;
}

const CUE = /^(同じ|この|その|あの|前述の|上記の|先の|先ほど|これら|それら|同社|同サービス|同製品)/;
const AMOUNT_CUE = /(?:から|より)(?:契約|利用|始め|購入|申し込|使え|加入|導入)(?:できる|可能|でき|する)/;
const MONEY = /[0-9０-９][0-9０-９,，.．]*\s*(?:億|万|千|[kKMB])?\s*(?:円|ドル|ユーロ|ポンド|ルピー)|[$€£₹]\s?[0-9]/;
const BROKEN = /(undefined|NaN|\[object Object\]|\bnull\b|\{\{|\}\})/;
const PERSONAL = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|0\d{1,4}-\d{1,4}-\d{3,4})/;
const ACRONYM = /(?<![A-Za-z0-9])([A-Z]{2,6})(?![A-Za-z0-9])/g;

/** 章の先頭の行か（指す相手が前に無い） */
const firstOfGroup = (rowId: string): boolean => rowId === 'list' || rowId === 'summary' || /^chapters\.[^.]+\.0$/.test(rowId) || rowId === 'success.0.head';

const dropKeyToRowIds = (key: string, rows: Array<{ id: string }>): string[] =>
  rows.filter((r) => r.id === key || r.id.startsWith(`${key}.`)).map((r) => r.id);

/**
 * 事例の画面の層ぜんぶに機械の検査を当てる。AI は使わない。
 * @param entityDisplay 重複の検査に渡す、その事例の画面の層
 */
export function machineChecks(files: DisplayFiles, ctx: CheckContext, entityDisplay: EntityDisplay): Flag[] {
  const { entityId } = ctx;
  const rows = displayRows(entityId, files);
  const flags: Flag[] = [];
  const add = (rowId: string | undefined, kind: Kind, code: string, reason: string): void => {
    if (!flags.some((f) => f.rowId === rowId && f.kind === kind && f.code === code)) flags.push({ rowId, kind, code, reason, source: 'machine' });
  };

  // 既存の辞書（不自然・作る側の言葉・意味が取れない言い方・略語の言い換え）
  for (const m of machineFindings(entityId, files, ctx.rules)) add(m.rowId, m.kind, `dict-${m.kind}`, m.reason);

  const seen = new Set<string>();
  const explained = new Set<string>();
  const nameNorm = norm(ctx.name ?? '');
  const allYen: string[] = [];
  for (const r of rows) allYen.push(r.text);

  for (const r of rows) {
    const { id, text } = r;
    // a 言いさし
    const cut = cutOff(text, id);
    if (cut) add(id, 'a', 'cut-off', cut);
    // b 作る側の注記
    if (MAKER_NOTES.test(text)) add(id, 'b', 'maker-note', '作る側の定型の注記が文に出ている');
    // e 円の二重・入れ子、円が付いていない外貨
    for (const d of yenDoubles(text)) add(id, 'e', 'yen-double', `円換算が二重または円が先の並び: ${d}`);
    for (const s of missingYen(text)) add(id, 'e', 'yen-missing', `外貨に円換算が付いていない: ${s.slice(0, 40)}`);
    // d 略語の初出に説明が無い
    for (const m of text.matchAll(ACRONYM)) {
      const w = m[1];
      if (KNOWN_ACRONYMS.has(w) || nameNorm.includes(w) || /^(USD|INR|EUR|GBP|JPY)$/.test(w)) continue;
      const before = text.slice(Math.max(0, m.index - 12), m.index);
      const after = text.slice(m.index + w.length, m.index + w.length + 3);
      if (/[A-Za-z0-9]\s$/.test(before) || /^\s[A-Z]/.test(after) || /[A-Za-z]、$/.test(before) || /^、[A-Z]/.test(after)) continue; // 固有名の一部・社名の並び
      const explainedHere = /^\s?[（(]/.test(text.slice(m.index + w.length, m.index + w.length + 2)) || (/[（(]$/.test(before) && /^[）)]/.test(after));
      if (explainedHere) { explained.add(w); continue; }
      if (explained.has(w)) continue; // 前の行で説明済み
      if (seen.has(w)) continue; // 初出だけを見る
      seen.add(w);
      add(id, 'd', 'acronym-unexplained', `略語 ${w} の初出に説明が無い`);
    }
    // d 固有名詞の初出の説明（辞書にある語だけ）
    for (const t of ctx.terms.terms) {
      if (!text.includes(t.term) || nameNorm.includes(norm(t.term)) || seen.has(`T:${t.term}`)) continue;
      seen.add(`T:${t.term}`);
      if (!new RegExp(t.explain).test(text)) add(id, 'd', 'term-unexplained', `「${t.term}」の初出に説明が無い（${t.explain} など）`);
    }
    // f 指す相手が消えた、金額が欠けた
    if (firstOfGroup(id) && CUE.test(text.trim())) add(id, 'f', 'dangling-cue', `文頭の「${text.trim().match(CUE)![1]}」が指す相手が、前の行に無い`);
    const hasMoney = MONEY.test(text);
    if (AMOUNT_CUE.test(text) && !hasMoney) add(id, 'f', 'amount-missing', '「〜から契約できる」と書きながら、金額が無い');
    // 料金の欄の文で、金額も「無料」も無い（何にいくらかかるかが読み取れない）
    if (/^chapters\.price\./.test(id) || /pricing/i.test(id)) {
      if (!hasMoney && !/無料|無償|フリー|0円|ゼロ/.test(text)) add(id, 'f', 'price-missing', '料金の欄の文に、金額も「無料」も無い');
    }
  }

  // c 同じ数字・同じ話の重複（既存の部品）。残す側ではなく、外す側の行に指摘を付ける
  for (const d of duplicateDrops(entityId, files, entityDisplay)) {
    for (const rid of dropKeyToRowIds(d.id, rows)) add(rid, 'c', 'duplicate', d.why.slice(0, 120));
  }
  // c 呼び名のゆれ（同じものを別の語で呼ぶ）。多く使われていない側の語がある行に付ける
  for (const group of ctx.terms.aliases) {
    const used = group.map((w) => ({ w, rows: rows.filter((r) => r.text.includes(w)) })).filter((x) => x.rows.length);
    if (used.length < 2) continue;
    used.sort((a, b) => b.rows.length - a.rows.length);
    for (const minor of used.slice(1)) for (const r of minor.rows) add(r.id, 'c', 'alias-drift', `「${minor.w}」は画面では「${used[0].w}」と呼ぶ`);
  }
  // e 同じ外貨の額に違う円が付いている（画面ぜんたいで）
  for (const v of yenVariants(allYen)) {
    for (const r of rows) if (r.text.includes(v.foreign)) add(r.id, 'e', 'yen-variant', `${v.foreign} の円換算が行によって違う（${v.yens.join(' / ')}）`);
  }
  // g 札
  const tags = ctx.tags ?? [];
  if (!tags.length) add(undefined, 'g', 'tag-none', '分類の札が1つも無い');
  for (const t of tags.filter((x) => /^(収集事例|収集|未分類|その他|test|テスト)$/.test(x))) add(undefined, 'g', 'tag-maker', `作る側の札「${t}」が画面に出る`);
  return flags;
}

/** 描いた画面の文の崩れ（h）と個人情報（止める）。直せない */
export function screenChecks(lines: readonly string[]): { flags: Flag[]; privacy: string[] } {
  const flags: Flag[] = [];
  const privacy: string[] = [];
  for (const t of lines) {
    if (BROKEN.test(t)) flags.push({ kind: 'h', code: 'screen-broken', reason: `画面に壊れた表示が出る: ${t.slice(0, 40)}`, source: 'machine' });
    else if (t.trim() && !/[぀-ヿ一-鿿A-Za-z0-9]/.test(t)) flags.push({ kind: 'h', code: 'screen-symbols', reason: `記号だけの行が出る: ${t.slice(0, 20)}`, source: 'machine' });
    const p = t.match(PERSONAL);
    if (p) privacy.push(p[0]);
  }
  return { flags, privacy };
}

/** 直せる指摘の数え方（行 × 観点）。事例ぜんたいの指摘（札・画面の崩れ）は数えない */
export const fixable = (flags: readonly Flag[]): Flag[] => flags.filter((f) => f.rowId);
export const flagKey = (f: Flag): string => `${f.rowId ?? ''}|${f.kind}`;
export const countKeys = (flags: readonly Flag[]): number => new Set(fixable(flags).map(flagKey)).size;
export function countByKind(flags: readonly Flag[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of new Set(fixable(flags).map(flagKey))) { const kind = k.split('|')[1]; out[kind] = (out[kind] ?? 0) + 1; }
  return out;
}

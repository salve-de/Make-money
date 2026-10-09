/**
 * 書いた事例の文を、プログラムで照らす。見るのは嘘を防ぐ所だけ（文の良し悪しは見ない。オーナーの決定）。
 *   1. 今の正本の検査（全章・です／ます・外貨の円概算・一覧の1行の推定語・使えない出典）＝ pnpm case-pages:check と同じ
 *   2. 「数字と出典」の URL が、渡した出典（本文を取れた物）の中にあるか（出典を作らない）
 *   3. 本文の数字と年が、出典の本文か集めた事実にあるか（「推測」「推定」「計算」と書いた文は外す。印が付いているので嘘ではない）
 *   4. 「Nドル（約M円）」の M が、1ドル＝150円の概算から大きく外れていないか
 */
import { checkMarkdown, heldSources, bodyLines, type Violation as PageViolation } from '../case-pages/lib';
import { claimNumbers, sourceNumbers } from '../reader-case/number-parse';
import type { CaseInput } from './input';

export interface WriteViolation { rule: PageViolation['rule'] | 'unknown-source' | 'number-not-in-sources' | 'year-not-in-sources' | 'yen-off' | 'lead-no-amount'; where: string; detail: string }

const LABELED = /推測|推定|計算|概算/;
const LOOSE = /約|超|弱|強|ほど|前後|近く|余り|あまり|以上|以下|未満/;
const USD_JPY = 150;
const norm = (u: string) => u.trim().replace(/\/+$/, '');

/** 「2,400万」「2.2億」「1億2,500万」「450」を数にする */
export function jaAmount(s: string): number {
  const t = s.replace(/[,，\s]/g, '');
  const m = t.match(/^(?:([\d.]+)億)?(?:([\d.]+)万)?(?:([\d.]+)千)?([\d.]+)?$/);
  if (!m) return NaN;
  return (Number(m[1] ?? 0) * 1e8) + (Number(m[2] ?? 0) * 1e4) + (Number(m[3] ?? 0) * 1e3) + Number(m[4] ?? 0);
}

/** 「1.6万ドル（約2,400万円）」の組を拾い、円の概算がドル×150 の 0.7〜1.4 倍に入らない物を返す */
export function yenOff(line: string): string[] {
  const out: string[] = [];
  const re = /(?<![\d.,千万億])([\d.,]+(?:[千万億][\d.,]*)*)\s*(?:(?:米|US|ＵＳ)\s*)?ドル(?:弱|強|超|ほど|前後)?\s*[（(]\s*約\s*([\d.,]+(?:[千万億][\d.,]*)*)\s*円/g;
  for (const m of line.matchAll(re)) {
    const usd = jaAmount(m[1]);
    const yen = jaAmount(m[2]);
    if (!Number.isFinite(usd) || !Number.isFinite(yen) || usd === 0) continue;
    const r = yen / (usd * USD_JPY);
    if (r < 0.7 || r > 1.4) out.push(`${m[0]}）は1ドル＝${USD_JPY}円の概算 約${Math.round(usd * USD_JPY).toLocaleString()}円 と合わない`);
  }
  return out;
}

const YEN_AFTER_FOREIGN = /(?<=(?:ドル|ユーロ|ポンド|ルピー|ペソ|フラン|ウォン)(?:弱|強|超|ほど|前後)?\s*)[（(]\s*約[^）)]*?円[）)]/g;

/** 円の額（「約510万円」「1,430万円」「2.2億円」） */
const YEN_AMOUNT = /[\d.,]+\s*[万億千]?\s*円/;
/** 稼ぎを表す語（売上・収入・集めた額など） */
const EARNING = /売上|売り上げ|収入|集め|稼|利益|営業利益|月商|年商|購読料/;

/**
 * 本文に円の稼ぎの数字があるのに、一覧の1行に円の額が無い（1行から稼ぎの数字が抜けた）。
 * 1行の文の良し悪しは見ず、数字が抜けたことだけを拾う
 */
export function leadMissingAmount(page: { listLine: string }, lines: Array<{ where: string; text: string }>): WriteViolation[] {
  if (YEN_AMOUNT.test(page.listLine)) return [];
  const hit = lines.filter((l) => l.where !== '一覧の1行').flatMap((l) => l.text.split(/(?<=。)/)).find((t) => YEN_AMOUNT.test(t) && EARNING.test(t) && !LABELED.test(t));
  return hit ? [{ rule: 'lead-no-amount', where: '一覧の1行', detail: `本文に稼ぎの数字（${hit.trim().slice(0, 50)}）があるのに、一覧の1行に円の額が無い。いちばん規模が伝わる確かめた稼ぎの数字を、円の概算つきで1行に入れる` }] : [];
}

export function verifyDraft(md: string, input: CaseInput, rights: Record<string, { decision?: string }> = {}): WriteViolation[] {
  const { page, violations } = checkMarkdown(md);
  const out: WriteViolation[] = [...violations];
  if (!page) return out;
  out.push(...heldSources(page, rights));

  const usable = new Set(input.sources.filter((s) => !s.error).map((s) => norm(s.url)));
  for (const s of page.sources) {
    if (!usable.has(norm(s.url))) out.push({ rule: 'unknown-source', where: `出典${s.no}`, detail: `${s.url} は渡した出典（本文を読めた物）に無い。渡した出典だけを使う` });
  }

  const corpus = [...input.sources.filter((s) => !s.error).map((s) => s.text), ...input.facts.map((f) => `${f.text} ${f.statedAt ?? ''} ${f.eventPeriod ?? ''}`)].join('\n');
  const base = sourceNumbers(corpus);
  // 表の見出しに「(K)」「in thousands」とある出典は、単位の無い数を千倍でも読む（Pinboard の売上表など）
  const pool = /\(\s*\$?\s*K\s*\)|in thousands/i.test(corpus) ? [...base, ...base.map((n) => n * 1000)] : base;
  const years = new Set((corpus.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/g) ?? []));
  const near = (v: number, tol: number) => pool.some((p) => p !== 0 && Math.abs(v - p) / Math.abs(p) <= tol);

  out.push(...leadMissingAmount(page, bodyLines(page)));
  for (const { where, text } of bodyLines(page)) {
    for (const y of yenOff(text)) out.push({ rule: 'yen-off', where, detail: y });
    // 文ごとに見る（印の付いた文だけを外す）
    for (const sentence of text.split(/(?<=。)/)) {
      if (LABELED.test(sentence)) continue;
      // 外貨の後ろの円の概算（「40〜150ドル（約6,000〜2万2,500円）」の幅も）は出典の数字でないので照らさない（換算は yenOff が見る）
      const { numbers, years: ys } = claimNumbers(sentence.replace(YEN_AFTER_FOREIGN, ''));
      const tol = LOOSE.test(sentence) ? 0.05 : 0.01;
      for (const n of numbers) if (!near(n, tol)) out.push({ rule: 'number-not-in-sources', where, detail: `「${n.toLocaleString()}」が出典の本文にも集めた事実にも見当たらない（文: ${sentence.trim().slice(0, 60)}）。出典の数字に直すか、計算・推測なら文に「（推測）」等の印を付ける` });
      for (const y of ys) if (!years.has(y)) out.push({ rule: 'year-not-in-sources', where, detail: `${y}年が出典の本文にも集めた事実にも見当たらない（文: ${sentence.trim().slice(0, 60)}）` });
    }
  }
  return out;
}

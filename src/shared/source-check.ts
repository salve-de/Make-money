/**
 * 原文照合の関門（画面に出す前に、事実・数字・章の行を出典の原文と機械で照らす）。純粋な部品。
 * 2026-10-07 オーナー決定: 誤りは「出さないルールの厳格化」ではなく、原文照合の関門と自動やり直しで防ぐ。
 * 入出力（出典の取得・台帳・やり直し）は scripts/reader-case/source-check.ts が持つ。
 *
 * 見ること（どれか1つでも外れたら不合格）:
 *  - 引用が原文に実在する（照合役のAIが返した引用を、取得した本文で確かめ直す）
 *  - 数字が引用（数字の主張）または原文（事実の文・章の行）に実在する（「$1.35M」「1.35 million」「135万」を同じ値として扱う）
 *  - 年が原文に実在する。数字の主張は、時点（年・月）が引用の近くにあるか、出典の公開日と一致して「投稿時点」などと書いてある
 *  - 何の数字か: 売上（measure=REVENUE）なのに、原文が直接の支払い・取扱高・アンケートの区分などを言っている
 */
import { metricWhen, PARTIAL_SCOPE, type IntegrityMetric } from './fact-integrity';

export type CheckReason =
  | 'NO_SOURCE_TEXT'
  | 'QUOTE_NOT_IN_SOURCE'
  | 'AMOUNT_NOT_IN_QUOTE'
  | 'NUMBER_NOT_IN_SOURCE'
  | 'YEAR_NOT_IN_SOURCE'
  | 'WHEN_NOT_CONFIRMED'
  | 'KIND_MISMATCH';

export const REASON_LABELS: Record<CheckReason, string> = {
  NO_SOURCE_TEXT: '出典の本文が取れない（403・ログインの壁・削除・画面を後から描くページなど）',
  QUOTE_NOT_IN_SOURCE: '照合の引用が原文に無い',
  AMOUNT_NOT_IN_QUOTE: '数字が引用に無い',
  NUMBER_NOT_IN_SOURCE: '文の数字が原文に無い',
  YEAR_NOT_IN_SOURCE: '文の年が原文に無い',
  WHEN_NOT_CONFIRMED: '数字の時点（年・月）が原文で裏づけられない',
  KIND_MISMATCH: '何の数字かが原文と合わない（売上と呼べない数字）',
};

export interface CheckResult { ok: boolean; reasons: CheckReason[]; detail: string[] }

const MIN_TEXT = 200;
const clean = (s: string) => s.normalize('NFKC').replace(/[­​]/g, '').replace(/\s+/g, ' ');
const squash = (s: string) => clean(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, '');

const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, lakh: 1e5, lakhs: 1e5, crore: 1e7, crores: 1e7, cr: 1e7, 千: 1e3, 万: 1e4, 億: 1e8 };
const UNIT = 'thousand|million|billion|lakhs?|crores?|cr|mm|bn|k|m|b|千|万|億';
const SOURCE_NUMBER = new RegExp(`(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(${UNIT})?(?![a-z])`, 'gi');
const RANGE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:-|–|to|〜|~)\\s*\\$?(\\d+(?:\\.\\d+)?)\\s*(${UNIT})(?![a-z])`, 'gi');
/** 「1億1,800万」「2万1,600」「1万2千」を1つの数にまとめる */
const joinJa = (t: string) => t
  .replace(/(\d+)億([\d,]+)万/g, (_, a, b) => String(Number(a) * 1e8 + Number(b.replace(/,/g, '')) * 1e4))
  .replace(/(\d+)万(\d+)千/g, (_, a, b) => String(Number(a) * 1e4 + Number(b) * 1e3))
  .replace(/(\d+)万([\d,]{3,})(?![\d,]*[万億])/g, (_, a, b) => String(Number(a) * 1e4 + Number(b.replace(/,/g, ''))));

/** 原文（英語・日本語）に出てくる数の値。「$1.35M」→1350000、「70K」→70000、「1万2千」→12000、「650,000」→650000 */
export function sourceNumbers(text: string): number[] {
  const t = joinJa(clean(text));
  const out = new Set<number>();
  // 「5 to 10 million」「$5-10M」の前の数にも単位を掛ける
  for (const m of t.matchAll(RANGE)) { const k = MULT[m[3].toLowerCase()] ?? MULT[m[3]] ?? 1; out.add(Number(m[1]) * k); out.add(Number(m[2]) * k); }
  // 「464 464」「1 575」のように空白で桁を区切る書き方（フランス語圏など）も1つの数にまとめる
  for (const m of t.matchAll(/(?<![\d,.])(\d{1,3}(?:[ \u00a0]\d{3})+)(?![\d,])/g)) out.add(Number(m[1].replace(/[ \u00a0]/g, '')));
  // 「$0.10 per million queries」「a million users」のように数字を付けず単位だけで言う書き方は、1単位として読む
  for (const m of t.matchAll(/\b(?:per|a|one|every|each)\s+(thousand|million|billion)\b/gi)) out.add(MULT[m[1].toLowerCase()]);
  for (const m of t.matchAll(SOURCE_NUMBER)) {
    const base = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(base)) continue;
    out.add(base);
    if (m[2]) out.add(base * (MULT[m[2].toLowerCase()] ?? MULT[m[2]] ?? 1));
  }
  return [...out];
}

const near = (a: number, b: number) => b === 0 ? a === 0 : Math.abs(a - b) / Math.abs(b) <= 0.01;
export const hasNumber = (pool: readonly number[], v: number) => pool.some((p) => near(v, p));

const YEAR = /(?<!\d)((?:19|20)\d{2})(?!\d)/g;
const YEN = /円/;

/** 日本語の文の、照らすべき数（年・円換算・12以下の小さい数を除く）と年 */
export function claimNumbers(text: string): { numbers: number[]; years: string[] } {
  // 円換算（画面の層が足した概算。原文には無い）は外す: 「約750〜1,500円」「約3万／6万円」「（約2.4億円）」
  const t = joinJa(clean(text).replace(/約?[\d,.]+(?:千|万|億)?(?:\s*[〜~／/・、]\s*約?[\d,.]+(?:千|万|億)?)*円/g, ' '));
  const years = [...new Set([...t.matchAll(YEAR)].map((m) => m[1]))];
  const numbers: number[] = [];
  for (const m of t.matchAll(/(?<![A-Za-z\d])(\d+(?:,\d{3})*(?:\.\d+)?)(?!\d)\s*(千|万|億|[kKmM](?![A-Za-z]))?\s*(円|年|月|日|か月|ヶ月)?(?![A-Za-z])/g)) {
    const raw = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(raw)) continue;
    if (m[3] === '年' || (m[3] === '月' && raw <= 12) || (m[3] === '日' && raw <= 31)) continue; // 日付の部品
    if (m[3] && YEN.test(m[3])) continue; // 円換算は原文に無い（画面の層が足した概算）
    const value = raw * (m[2] ? (MULT[m[2]] ?? MULT[m[2].toLowerCase()] ?? 1) : 1);
    // 12以下の小さい数は読み流す。ただし料金（$9、月9ドル）は誤りが致命的なので照らす
    const money = /^\s*(?:ドル|ユーロ|ポンド)/.test(t.slice((m.index ?? 0) + m[0].length)) || t[(m.index ?? 0) - 1] === '$' || /[$€£]/.test(t.slice(Math.max(0, (m.index ?? 0) - 2), m.index ?? 0));
    if ((value <= 12 && !money) || /^(19|20)\d{2}$/.test(m[1])) continue;
    numbers.push(value);
  }
  return { numbers, years };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** 売上と呼べない数字を言う原文の語（直接の支払い・寄付・取扱高・アンケートの区分など） */
const NOT_REVENUE = /(direct payments?|payments totaling|donations?|\bgmv\b|gross merchandise|transaction volume|in sales volume|survey|revenue tier|tier of)/i;

function precedingYear(source: string, quote: string): string | null {
  const s = clean(source); const i = s.toLowerCase().indexOf(clean(quote).slice(0, 40).toLowerCase());
  if (i < 0) return null;
  const before = [...s.slice(Math.max(0, i - 5000), i).matchAll(YEAR)];
  return before.at(-1)?.[1] ?? null;
}

function windowAround(source: string, quote: string, size = 500): string {
  const s = clean(source); const q = clean(quote).slice(0, 40);
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? '' : s.slice(Math.max(0, i - size), i + q.length + size);
}

/** 数字の主張（metrics の1件）を、照合の引用と出典の本文で確かめる */
export function checkMetric(m: IntegrityMetric, quote: string, sourceText: string, publishedAt?: string): CheckResult {
  const reasons: CheckReason[] = []; const detail: string[] = [];
  if (clean(sourceText).length < MIN_TEXT) return { ok: false, reasons: ['NO_SOURCE_TEXT'], detail: [] };
  if (!quote.trim() || !squash(sourceText).includes(squash(quote))) reasons.push('QUOTE_NOT_IN_SOURCE');
  if (!hasNumber(sourceNumbers(quote), m.amount)) { reasons.push('AMOUNT_NOT_IN_QUOTE'); detail.push(`${m.amount} が引用「${quote.slice(0, 60)}」に無い`); }
  const when = metricWhen(m);
  if (!when) { reasons.push('WHEN_NOT_CONFIRMED'); detail.push('時点（年）が無い'); }
  else {
    const around = `${quote} ${windowAround(sourceText, quote)}`;
    const year = when.slice(0, 4);
    const month = when.length > 4 ? Number(when.slice(5)) : 0;
    // 引用の近く、または引用より前で最後に出てくる年（年ごとに書く記事の見出し）が同じなら、時点は原文にある
    const yearHere = around.includes(year) || precedingYear(sourceText, quote) === year;
    // 出典の公開日と同じ時点（その記事が伝える出来事・その時点の表示）。投稿日を出来事の日付にした誤りは、公開日と違う時点として落ちる
    const byPublished = !!publishedAt?.startsWith(year) && (!month || publishedAt.startsWith(when));
    const monthHere = !month || byPublished || new RegExp(`(${MONTHS[month - 1]}|${year}[-/.]0?${month}(?!\\d)|${month}月)`, 'i').test(around);
    if (!(yearHere || byPublished) || !monthHere) { reasons.push('WHEN_NOT_CONFIRMED'); detail.push(`時点 ${when} が引用の近く（前後500字）に無い${publishedAt ? `（出典の公開 ${publishedAt}）` : ''}`); }
  }
  if (m.measure === 'REVENUE' && (PARTIAL_SCOPE.test(`${m.period} ${m.label ?? ''} ${m.basis ?? ''}`) || NOT_REVENUE.test(clean(quote)))) {
    reasons.push('KIND_MISMATCH'); detail.push(`売上として扱っているが、原文は「${clean(quote).match(NOT_REVENUE)?.[0] ?? '売上の一部'}」`);
  }
  return { ok: reasons.length === 0, reasons, detail };
}

/** 事実の文・章の行を、出典の本文で確かめる（文の数と年が原文にあるか。引用があれば引用の実在も） */
export function checkText(text: string, sourceText: string, opts: { quote?: string; publishedAt?: string } = {}): CheckResult {
  const reasons: CheckReason[] = []; const detail: string[] = [];
  if (clean(sourceText).length < MIN_TEXT) return { ok: false, reasons: ['NO_SOURCE_TEXT'], detail: [] };
  if (opts.quote !== undefined && (!opts.quote.trim() || !squash(sourceText).includes(squash(opts.quote)))) reasons.push('QUOTE_NOT_IN_SOURCE');
  const pool = sourceNumbers(sourceText);
  const { numbers, years } = claimNumbers(text);
  const body0 = clean(sourceText);
  // 文の数も年も1つも本文に無い時は、文の誤りより先に「本文が取れていない」（後から描くページ・別のページ）を疑う。
  // 合格にはしない。取り直し（Web アーカイブ・別の出典）に回す
  if (numbers.length + years.length >= 2 && !numbers.some((n) => hasNumber(pool, n)) && !years.some((y) => body0.includes(y))) {
    return { ok: false, reasons: ['NO_SOURCE_TEXT'], detail: ['文の数と年が1つも本文に無い（本文が取れていない疑い）'] };
  }
  const missing = numbers.filter((n) => !hasNumber(pool, n));
  if (missing.length) { reasons.push('NUMBER_NOT_IN_SOURCE'); detail.push(`原文に無い数 ${missing.join('、')}`); }
  const body = clean(sourceText);
  const missingYears = years.filter((y) => !body.includes(y) && !opts.publishedAt?.startsWith(y));
  if (missingYears.length) { reasons.push('YEAR_NOT_IN_SOURCE'); detail.push(`原文に無い年 ${missingYears.join('、')}`); }
  return { ok: reasons.length === 0, reasons, detail };
}

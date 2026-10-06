/**
 * 文中の数字を値に直して照合する純粋関数。リード審査（lead-standard.ts）と、分析の受け入れ検査（scripts/reader-case/analysis-lib.ts）が使う。
 * 「出典の事実・数値に同じ値があるか」だけを見る。値が合っても意味が合うとは限らないので、意味の確認は審査役が行う。
 */
const FULL = /[０-９．，％]/g;
const toHalf = (s: string): string => s.replace(FULL, (c) => (c === '．' ? '.' : c === '，' ? ',' : c === '％' ? '%' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
const UNIT: Record<string, number> = { 億: 1e8, 万: 1e4, 千: 1e3, k: 1e3, K: 1e3, m: 1e6, M: 1e6, b: 1e9, B: 1e9 };
const NUMBER = /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(億|万|千|[kKmMbB](?![A-Za-z])|%)?/g;

const APPROX_BEFORE = /(約|およそ|ほぼ|概ね)[$＄¥￥€£月年]?$/;
/** 「約」で丸めた数字を、材料の値と照合する時の許容（相対）。丸め（約$6万 と 61,392ドル）を通し、桁違いは通さない */
export const APPROX_TOLERANCE = 0.1;

interface Token { value: number; approx: boolean }
function tokens(text: string, withBare: boolean): Token[] {
  const half = toHalf(text);
  const out: Token[] = [];
  for (const m of half.matchAll(NUMBER)) {
    const base = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(base)) continue;
    const approx = APPROX_BEFORE.test(half.slice(Math.max(0, (m.index ?? 0) - 4), m.index ?? 0));
    out.push({ value: base * (m[2] && UNIT[m[2]] ? UNIT[m[2]] : 1), approx });
    // 材料側だけ、単位を外した読みも持つ（本文が「65万人」、元データが 65 の場合など）
    if (withBare && m[2] && UNIT[m[2]]) out.push({ value: base, approx });
  }
  return out;
}

/** 文の中の数字を値にして返す（「65万人」→650000、「$10K」→10000、「2.9%」→2.9）。 */
export function numbersIn(text: string, withBare = false): number[] {
  return tokens(text, withBare).map((t) => t.value);
}

export const sameNumber = (a: number, b: number): boolean => Math.abs(a - b) <= Math.max(1e-9, Math.abs(a) * 1e-9);

/**
 * 文中の数字のうち、材料の値の中に無いもの。1桁の整数（単位なし）は件数・回数の言い回しとして数えない。
 * 「約」が付いた数字は、材料の値と APPROX_TOLERANCE 以内なら同じとみなす。
 */
export function numbersMissingFrom(text: string, evidence: readonly number[]): number[] {
  return tokens(text, false)
    .filter((t) => !(Number.isInteger(t.value) && t.value < 10)
      && !evidence.some((e) => sameNumber(e, t.value) || (t.approx && Math.abs(e - t.value) <= Math.abs(e) * APPROX_TOLERANCE)))
    .map((t) => t.value);
}

/** 出典の事実の文と数値（金額・期間の文）から、照合に使う値を集める */
export function evidenceNumbers(
  facts: readonly { id: string; text: string }[],
  metrics: readonly { id: string; amount: number; period?: string }[],
  ids?: readonly string[],
): number[] {
  const want = ids ? new Set(ids) : null;
  return [
    ...facts.filter((f) => !want || want.has(f.id)).flatMap((f) => numbersIn(f.text, true)),
    ...metrics.filter((m) => !want || want.has(m.id)).flatMap((m) => [m.amount, ...numbersIn(m.period ?? '', true)]),
  ];
}

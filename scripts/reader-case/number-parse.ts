/**
 * 数の読み取り（取り込みの数字の決まりで使う）。原文照合の部品（申請 #175 の src/shared/source-check.ts）と同じ規則の写し。
 * #175 の統合後は、この写しを消して src/shared/source-check.ts の同名の関数を読む（二重に持ち続けない）。
 */
/** 売上の一部・売上でない数字を言う語（#175 の src/shared/fact-integrity.ts の PARTIAL_SCOPE と同じ） */
export const PARTIAL_SCOPE = /(直接の支払い|支払いだけ|寄付|取扱高|流通(総)?額|GMV|アンケート|区分|別事業|前身|一部の|のみの売上|を除く|を含まない)/;

const clean = (s: string) => s.normalize('NFKC').replace(/[­​]/g, '').replace(/\s+/g, ' ');

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
export function claimNumbers(text: string, opts: { keepYen?: boolean } = {}): { numbers: number[]; years: string[] } {
  // 円換算（画面の層が足した概算。原文には無い）は外す: 「約750〜1,500円」「約3万／6万円」「（約2.4億円）」
  // keepYen（収集の層）: 外すのは括弧の中の「約…円」だけ。「年商は5000万円」のような元から円の数字は照らす
  const base = clean(text);
  const t = joinJa(opts.keepYen
    ? base.replace(/[（(]約[^）)]*円[^）)]*[）)]/g, ' ')
    : base.replace(/約?[\d,.]+(?:千|万|億)?(?:\s*[〜~／/・、]\s*約?[\d,.]+(?:千|万|億)?)*円/g, ' '));
  const years = [...new Set([...t.matchAll(YEAR)].map((m) => m[1]))];
  const numbers: number[] = [];
  for (const m of t.matchAll(/(?<![A-Za-z\d])(\d+(?:,\d{3})*(?:\.\d+)?)\s*(千|万|億)?\s*(円|年|月|日|か月|ヶ月)?(?![A-Za-z])/g)) {
    const raw = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(raw)) continue;
    if (m[3] === '年' || (m[3] === '月' && raw <= 12) || (m[3] === '日' && raw <= 31)) continue; // 日付の部品
    if (m[3] && YEN.test(m[3]) && !opts.keepYen) continue; // 円換算は原文に無い（画面の層が足した概算）
    const value = raw * (m[2] ? MULT[m[2]] : 1);
    if (value <= 12 || /^(19|20)\d{2}$/.test(m[1])) continue;
    numbers.push(value);
  }
  return { numbers, years };
}


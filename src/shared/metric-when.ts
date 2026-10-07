/** 数字の時点を取り出す小さな部品（一覧の数字の選び方と、数字の約束の検査で同じものを使う） */
const DATE = /((?:19|20)\d{2})(?:\s*[-年/.]\s*(\d{1,2})(?!\d))?/g;

/** 数字の時点（'YYYY' か 'YYYY-MM'）。statedAt を優先し、無ければ period の最後の日付（「A〜B」なら終わりの側）。無ければ null */
export function metricWhen(m: { period: string; statedAt?: string }): string | null {
  for (const text of [m.statedAt, m.period]) {
    if (!text) continue;
    const hits = [...text.normalize('NFKC').matchAll(DATE)];
    const last = hits.at(-1);
    if (!last) continue;
    const month = last[2] ? Number(last[2]) : 0;
    return month >= 1 && month <= 12 ? `${last[1]}-${String(month).padStart(2, '0')}` : last[1];
  }
  return null;
}


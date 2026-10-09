import type { FacetRow } from './entity-filter';

/**
 * /api/catalog/facets の送り方。1万件でも軽いよう、事例ごとに配列1本にして、言葉は一覧の番号で送る。
 * 行 = [規模, 利益率, 初期資金(円。未確認は null), 強み, [言葉の番号, ...]]
 */
export type FacetWireRow = [string, number, number | null, string, number[]];
export interface FacetWire { generation: string; words: string[]; rows: FacetWireRow[] }

export function encodeFacets(generation: string, rows: readonly FacetRow[]): FacetWire {
  const words: string[] = [];
  const index = new Map<string, number>();
  const idOf = (word: string) => {
    let i = index.get(word);
    if (i === undefined) { i = words.length; words.push(word); index.set(word, i); }
    return i;
  };
  return { generation, words, rows: rows.map((r) => [r.scale, r.margin, r.capital, r.moat, r.words.map(idOf)]) };
}

/** 形が違えば null（件数を出さないだけで、画面は止めない） */
export function decodeFacets(payload: unknown): FacetRow[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const { words, rows } = payload as Partial<FacetWire>;
  if (!Array.isArray(words) || !Array.isArray(rows) || !words.every((w) => typeof w === 'string')) return null;
  const out: FacetRow[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 5) return null;
    const [scale, margin, capital, moat, ids] = row;
    if (typeof scale !== 'string' || typeof margin !== 'number' || (capital !== null && typeof capital !== 'number') || typeof moat !== 'string' || !Array.isArray(ids)) return null;
    const rowWords: string[] = [];
    for (const i of ids) { const w = typeof i === 'number' ? words[i] : undefined; if (w === undefined) return null; rowWords.push(w); }
    out.push({ scale, margin, capital, moat, words: rowWords });
  }
  return out;
}

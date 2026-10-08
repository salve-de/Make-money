import type { CasePage } from '../../src/shared/case-page';
import type { ReaderCase, ReaderSource } from '../../src/shared/reader-case';

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/**
 * 章ごとの文（case-page）がある事例の reader。画面の章は display.casePage が持つので、reader の事実は概要の1件だけ。
 * 数値は、出典と照合済みの旧版（base）が持つものをそのまま残す（一覧の売上の欄のため）。旧版が無ければ数値なし。
 * 古い監査の受領証・推論・旧版の編集文は持ち込まない。
 */
const numbersOf = (text: string) => new Set((text.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => n.length >= 2 || n.includes('.')));

/** 一覧の1行を支える出典。1行に出てくる数字を最も多くラベルに含む出典を選ぶ（共通の数字が無ければ先頭） */
export function headlineSource(page: CasePage): CasePage['sources'][number] {
  const want = numbersOf(page.listLine);
  let best = page.sources[0];
  let bestHit = 0;
  for (const source of page.sources) {
    const have = numbersOf(source.label);
    const hit = [...want].filter((n) => have.has(n)).length;
    if (hit > bestHit) { best = source; bestHit = hit; }
  }
  return best;
}

export function buildCasePageReader(page: CasePage, base?: ReaderCase): ReaderCase {
  const first = headlineSource(page);
  const own: ReaderSource = { id: 'case-page-1', publisher: hostOf(first.url), url: first.url, kind: 'ARTICLE' };
  const metrics = base?.metrics ?? [];
  const need = new Set(metrics.map((m) => m.sourceId));
  const sources = [...(base?.sources.filter((s) => need.has(s.id)) ?? []), own];
  return {
    sources,
    facts: [{ id: 'case-page-summary', kind: 'DESCRIPTION', text: page.listLine, sourceId: own.id, attribution: 'ARTICLE' }],
    metrics,
    unknowns: [],
    summaryFactId: 'case-page-summary',
    analysis: [],
    display: { casePage: page },
  };
}

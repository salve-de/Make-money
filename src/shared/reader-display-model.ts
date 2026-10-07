/**
 * 詳細画面の並べ方（章立て・物語の段・主要な数字・事実の分類の食い違い検査）。表示の判断だけを持つ純粋な関数。
 * 画面の文字は ui-strings.ts と reader の中身だけから作る。ここは「どれをどこに置くか」だけを決める。
 */
import { pickListMetric, pickProfitMetric } from './display-text';
import { CHAPTER_TITLES } from './ui-strings';
import type { AnalysisItem, ReaderAnalysis, ReaderCase, ReaderFact, ReaderMetric } from './reader-case';

/** 推論の項目をどの章に置くか。章は材料がある時だけ出る。 */
export const ANALYSIS_CHAPTERS: ReadonlyArray<{ id: string; title: string; items: readonly AnalysisItem[] }> = [
  { id: 'what', title: CHAPTER_TITLES.what, items: ['BUSINESS_MODEL', 'PRICING', 'CUSTOMER', 'CUSTOMER_PAIN'] },
  { id: 'first', title: CHAPTER_TITLES.first, items: ['FIRST_CUSTOMERS'] },
  { id: 'growth', title: CHAPTER_TITLES.growth, items: ['CHANNELS', 'REFERRAL', 'COMPETITION', 'INCUMBENT_BLINDSPOT', 'WHY_IT_WORKED'] },
  { id: 'left', title: CHAPTER_TITLES.left, items: ['REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH'] },
  { id: 'needs', title: CHAPTER_TITLES.needs, items: ['CAPITAL_AND_TEAM', 'TOOLS', 'DEPENDENCIES', 'LOCK_IN'] },
  { id: 'now', title: CHAPTER_TITLES.now, items: ['TIMELINE', 'PIVOTS', 'FAILURE_CAUSE', 'LESSON'] },
];

/** 一般論になりやすい項目。事実（basis）に結ばれている時だけ出す。 */
const GROUNDED_ONLY: ReadonlySet<AnalysisItem> = new Set(['WHY_IT_WORKED', 'INCUMBENT_BLINDSPOT', 'LESSON']);

export function isDisplayableAnalysis(a: ReaderAnalysis): boolean {
  if (a.item === 'HEADLINE' || a.item === 'STORY') return false;
  return !GROUNDED_ONLY.has(a.item) || a.basis.length > 0;
}

export interface AnalysisChapter { id: string; title: string; entries: ReaderAnalysis[] }

export function analysisChapters(reader: ReaderCase): AnalysisChapter[] {
  return ANALYSIS_CHAPTERS.map((c) => ({
    id: c.id,
    title: c.title,
    entries: c.items.flatMap((item) => reader.analysis.filter((a) => a.item === item && isDisplayableAnalysis(a))),
  })).filter((c) => c.entries.length > 0);
}

const STORY_STAGES = ['前夜', '隙', '突破', '金が回る仕組み'] as const;

/** 物語を 前夜・隙・突破・金が回る仕組み の段に分ける。分けられなければ空（本文を1つの段落として出す）。 */
export function splitStory(text: string): Array<{ stage: string; text: string }> {
  const re = new RegExp(`(${STORY_STAGES.join('|')})[：:]`, 'g');
  const marks = [...text.matchAll(re)];
  if (marks.length < 2) return [];
  return marks.map((m, i) => ({
    stage: m[1],
    text: text.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).trim(),
  })).filter((s) => s.text.length > 0);
}

/** 冒頭の主要な数字の帯。売上・利益に加え、無ければ別の種類を優先順で最大3件。 */
export function keyMetrics(reader: ReaderCase, max = 3): ReaderMetric[] {
  const out: ReaderMetric[] = [];
  const add = (m: ReaderMetric | null) => { if (m && !out.some((x) => x.id === m.id)) out.push(m); };
  const main = pickListMetric(reader);
  add(main);
  add(pickProfitMetric(reader));
  for (const measure of ['USERS', 'PRICE', 'FUNDING', 'EXIT_VALUE', 'COST'] as const) {
    if (out.length >= max) break;
    if (out.some((m) => m.measure === measure)) continue;
    add(reader.metrics.find((m) => m.measure === measure) ?? null);
  }
  return out.slice(0, max);
}

/** 同じ種類・同じ通貨の中での棒の長さ（0〜1）。数値と図が食い違わないよう、同じ amount だけから出す。 */
export function barRatio(metric: ReaderMetric, all: readonly ReaderMetric[]): number {
  const peers = all.filter((m) => m.measure === metric.measure && m.currency === metric.currency && m.unit === metric.unit && m.label === metric.label);
  const max = Math.max(...peers.map((m) => Math.abs(m.amount)));
  if (!(max > 0)) return 0;
  return Math.abs(metric.amount) / max;
}

const MONEY_WORD = /[0-9０-９]|円|ドル|\$|万|億|資金|出資|投資|調達|融資|ラウンド|資本|ファンド/;
const EXIT_WORD = /売却|買収|譲渡|M&A|事業譲渡|上場|IPO|クローズ|終了|閉鎖|株式/;
const FUNDING_WORD = /調達|出資|投資|資金|融資|ラウンド|シード|資本|ファンド|ベンチャー|VC|助成|補助金|ブートストラップ|自己資金/;
const PRICE_WORD = /[0-9０-９]|円|ドル|\$|料金|価格|無料|プラン|月額|年額|課金|有料/;

/**
 * 事実の種類（kind）と本文が食い違うと疑える時の見かけの種類を返す。食い違いが無ければ元の kind。
 * 例: 種類が「調達」なのに本文が仕入先の管理の説明なら、「その他」に置く（調達の欄に並べない）。
 */
export function displayFactKind(fact: Pick<ReaderFact, 'kind' | 'text'>): ReaderFact['kind'] {
  const t = fact.text;
  switch (fact.kind) {
    case 'FUNDING': return FUNDING_WORD.test(t) && MONEY_WORD.test(t) ? 'FUNDING' : 'OTHER';
    case 'EXIT': return EXIT_WORD.test(t) ? 'EXIT' : 'OTHER';
    case 'PRICING': return PRICE_WORD.test(t) ? 'PRICING' : 'OTHER';
    default: return fact.kind;
  }
}

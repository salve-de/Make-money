import type { CaseArticle } from '../../src/shared/case-article';
import type { ReaderCase, ReaderSource } from '../../src/shared/reader-case';
import { headlineSource } from '../case-pages/reader';

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/**
 * 事例の記事（case-article）がある事例の reader。記事の章は display.caseArticle が持つので、reader の事実は概要の1件だけ。
 * 旧版（base）の数値・出典・推論は持ち込まない（旧データを新しい記事の根拠に使わない）。数値は無し。
 * entityName は呼び出し側の記録用で、reader の中身には使わない。
 */
export function buildCaseArticleReader(article: CaseArticle, entityName?: string): ReaderCase {
  void entityName;
  const first = headlineSource(article);
  const own: ReaderSource = { id: 'case-article-1', publisher: hostOf(first.url), url: first.url, kind: 'ARTICLE' };
  return {
    sources: [own],
    facts: [{ id: 'case-article-summary', kind: 'DESCRIPTION', text: article.listLine, sourceId: own.id, attribution: 'ARTICLE' }],
    metrics: [],
    unknowns: [],
    summaryFactId: 'case-article-summary',
    analysis: [],
    display: { caseArticle: article },
  };
}

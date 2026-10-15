import React from 'react';

import { CASE_ARTICLE_TOPIC_IDS, type CaseArticle, type CaseArticleTopicId } from '@/shared/case-article';
import { UI } from '@/shared/ui-strings';
import { ArticleBlock, blockSpacing, CiteMarks, hostOf, topicCites } from './CaseArticleBlocks';
import { CaseArticleNav } from './CaseArticleNav';
import { Fold } from './ReaderOverview';

const TOPIC_TITLES: Record<CaseArticleTopicId, string> = {
  overview: UI.CASE_ARTICLE_OVERVIEW,
  mechanism: UI.CASE_ARTICLE_MECHANISM,
  revenue: UI.CASE_ARTICLE_REVENUE,
  acquisition: UI.CASE_ARTICLE_ACQUISITION,
  operations: UI.CASE_ARTICLE_OPERATIONS,
  history: UI.CASE_ARTICLE_HISTORY,
};

const KPI_COLUMNS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' };

const topicAnchor = (id: string) => `section-article-${id}`;
const SOURCES_ANCHOR = 'section-article-sources';

/**
 * 事例の記事（case-article）の詳細。見出し → 見出しの下の文 → 数字の帯 → 画像欄 → 章の目次 → 各章 → 出典。
 * 章の中身は種類の決まったブロックをデータから描くだけで、事例ごとの手書きはしない。データに無い分類は目次にも章にも出さない。
 */
export function CaseArticleView({ article, media }: { article: CaseArticle; media?: React.ReactNode }) {
  const topics = CASE_ARTICLE_TOPIC_IDS.flatMap((id) => article.topics.filter((t) => t.id === id).slice(0, 1));
  const navItems = [
    ...topics.map((t) => ({ id: topicAnchor(t.id), label: TOPIC_TITLES[t.id] })),
    { id: SOURCES_ANCHOR, label: UI.CASE_ARTICLE_SOURCES },
  ];
  return (
    <>
      <div data-case-article="head" className="px-2.5 pb-3 pt-3 sm:px-3">
        <h2 className="m-0 text-[20px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{article.headline}</h2>
        <p className="mt-2 text-sm leading-relaxed text-term-fg [overflow-wrap:anywhere]">{article.lead}</p>
        {article.kpis.length > 0 && (
          <dl data-case-article="kpis" className={`m-0 mt-3 grid gap-px border border-term-line bg-term-line ${KPI_COLUMNS[Math.min(article.kpis.length, 4)]}`}>
            {article.kpis.map((k) => (
              <div key={k.label} className="min-w-0 bg-term-bg px-2.5 py-2">
                <dt className="text-xs leading-snug text-term-label [overflow-wrap:anywhere]">{k.label}</dt>
                <dd className="m-0 mt-0.5 [overflow-wrap:anywhere]">
                  <span className="term-num block text-[18px] font-semibold leading-tight text-term-fg-strong">{k.value}</span>
                  {k.yen && <span className="block text-xs text-term-label">{k.yen}</span>}
                  {k.period && <span className="mt-0.5 block text-xs text-term-label">{k.period}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {media}
      <CaseArticleNav items={navItems} label={UI.CASE_ARTICLE_NAV} />
      {topics.map((t) => (
        <Fold key={t.id} id={topicAnchor(t.id)} title={TOPIC_TITLES[t.id]} defaultOpen>
          {/* 中のブロックは、画面の幅でなくこの欄の幅に合わせて並びを変える（詳細の欄は画面より狭い） */}
          <div className="@container max-w-[56rem] pt-1.5">
            {t.title && <h3 data-case-article-title className="m-0 mb-4 text-[17px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{t.title}</h3>}
            {t.lead && (
              <p className="m-0 mb-3 text-[15px] font-semibold leading-relaxed text-term-fg-strong [overflow-wrap:anywhere]">
                {t.lead.text}
              </p>
            )}
            {t.blocks.map((b, i) => (
              <div key={i} className={blockSpacing(b, t.blocks[i - 1])}>
                <ArticleBlock block={b} article={article} />
              </div>
            ))}
            <CiteMarks cites={topicCites(t)} sources={article.sources} />
          </div>
        </Fold>
      ))}
      <Fold id={SOURCES_ANCHOR} title={UI.CASE_ARTICLE_SOURCES} defaultOpen>
        <ol className="m-0 grid list-none grid-cols-1 gap-1.5 p-0">
          {article.sources.map(({ no, label, url }) => (
            <li key={no} id={`case-article-source-${no}`} data-source={url} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-1.5 text-sm">
              <span className="term-num text-xs text-term-label">{no}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-term-fg underline underline-offset-2 hover:text-term-fg-strong">{label}</a>
                <span className="ml-1.5 text-xs text-term-label">{hostOf(url)}</span>
              </span>
            </li>
          ))}
        </ol>
      </Fold>
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';

import type { CaseArticle, CaseArticleBlock, CaseArticleFigure } from '@/shared/case-article';
import { UI } from '@/shared/ui-strings';

type Source = CaseArticle['sources'][number];
type Cites = ReadonlyArray<number>;

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** ブロック1つが根拠にしている出典の番号。 */
function blockCites(block: CaseArticleBlock): Cites {
  switch (block.type) {
    case 'facts':
    case 'rates':
    case 'table':
      return block.rows.flatMap((r) => r.cites);
    case 'steps':
    case 'timeline':
    case 'list':
      return block.items.flatMap((x) => x.cites);
    case 'paragraph':
      return block.cites;
    default:
      return [];
  }
}

/** 章の全体（最初の文と各ブロック）が根拠にしている出典の番号。重なりを除いて小さい順。 */
export function topicCites(topic: CaseArticle['topics'][number]): number[] {
  const all = [...(topic.lead?.cites ?? []), ...topic.blocks.flatMap(blockCites)];
  return [...new Set(all)].sort((a, b) => a - b);
}

/**
 * 章の終わりに1回だけ出す出典の番号。行ごとには出さない（同じ番号が何十回も並んで本文が読みにくくなるため）。
 * 番号は下の出典の一覧と同じで、押すと出典のページを新しいタブで開く。
 */
export function CiteMarks({ cites, sources }: { cites: Cites; sources: ReadonlyArray<Source> }) {
  const found = cites.map((no) => sources.find((s) => s.no === no)).filter((s): s is Source => Boolean(s));
  if (found.length === 0) return null;
  return (
    <p data-case-article-cites className="mt-3 flex flex-wrap items-center justify-end gap-x-0.5 text-xs text-term-label">
      <span className="mr-1">{UI.CASE_ARTICLE_SOURCES}</span>
      {found.map((s) => (
        <a key={s.no} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label} data-cite={s.no} className="term-num inline-flex min-h-8 min-w-6 items-center justify-center rounded-sm px-1 text-term-label hover:bg-term-line hover:text-term-fg-strong">
          {s.no}
        </a>
      ))}
    </p>
  );
}

const wrap = '[overflow-wrap:anywhere]';

/** 図。幅いっぱいに出し、押すと <dialog> で拡大する（Esc・閉じるボタンで閉じ、閉じたら元のボタンへフォーカスを戻す）。 */
function FigureView({ figure }: { figure: CaseArticleFigure }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
  }, [open]);
  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
    openerRef.current?.focus();
  };
  return (
    <figure data-case-article-figure={figure.id} className="m-0">
      <button ref={openerRef} type="button" title={UI.CASE_ARTICLE_ZOOM} onClick={() => setOpen(true)} className="block w-full cursor-zoom-in border border-term-line bg-term-panel p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} className="mx-auto block h-auto max-w-full" />
      </button>
      <dialog
        ref={dialogRef}
        aria-label={figure.alt}
        onClose={() => { setOpen(false); openerRef.current?.focus(); }}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        // 詳細パネルは Esc で閉じる。図を閉じる Esc が、詳細まで閉じないようにする
        onKeyDown={(e) => { if (e.key === 'Escape') e.stopPropagation(); }}
        className="m-auto max-h-[96vh] w-[min(96vw,960px)] max-w-none overflow-auto border border-term-line bg-term-panel p-2 text-term-fg backdrop:bg-black/70"
      >
        {open && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} className="block h-auto w-full min-w-[680px]" />
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={close} className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-sub hover:border-term-accent-line hover:text-term-accent lg:min-h-8">
                {UI.CASE_ARTICLE_CLOSE}
              </button>
            </div>
          </>
        )}
      </dialog>
    </figure>
  );
}

/** ブロック1つを種類に応じて描く。種類ごとの見た目はここだけに置き、事例ごとの手書きはしない。 */
export function ArticleBlock({ block, article }: { block: CaseArticleBlock; article: CaseArticle }) {
  switch (block.type) {
    case 'facts':
      return (
        <dl className="m-0">
          {block.rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 border-b border-term-line-soft py-2 first:pt-0 last:border-b-0">
              <dt className="text-xs leading-relaxed text-term-label">{r.label}</dt>
              <dd className={`m-0 text-sm leading-relaxed text-term-fg ${wrap} ${block.variant === 'amount' ? 'term-num text-right' : ''}`}>
                {r.text}
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'paragraph':
      return (
        <p className={`${block.tone === 'note' ? 'text-xs leading-relaxed text-term-label' : 'text-sm leading-relaxed text-term-fg'} ${wrap}`}>
          {block.text}
        </p>
      );
    case 'steps':
      return (
        <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0">
          {block.items.map((x, i) => (
            <li key={x.title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-1.5">
              <span className="term-num text-sm text-term-accent">{i + 1}</span>
              <div className={`min-w-0 ${wrap}`}>
                <p className="text-sm font-semibold leading-snug text-term-fg-strong">{x.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-term-fg">
                  {x.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'rates':
      return (
        <div>
          {block.caption && <p className="mb-1 text-xs text-term-label">{block.caption}</p>}
          <ul className="m-0 list-none p-0">
            {block.rows.map((r) => (
              <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-term-line-soft py-2 first:pt-0 last:border-b-0">
                <div className={`min-w-0 text-sm leading-relaxed text-term-fg ${wrap}`}>
                  {r.label}
                  {r.note && <p className="mt-0.5 text-xs leading-relaxed text-term-label">{r.note}</p>}
                </div>
                <div className={`max-w-[11rem] text-right ${wrap}`}>
                  <p className="term-num text-sm font-semibold text-term-fg-strong">{r.value}</p>
                  {r.yen && <p className="text-xs text-term-label">{r.yen}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {block.caption && <caption className="mb-1 text-left text-xs text-term-label">{block.caption}</caption>}
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={c} scope="col" className={`border-b border-term-line px-1.5 py-1.5 text-xs font-normal text-term-label first:pl-0 last:pr-0 ${i === 0 ? 'text-left' : 'whitespace-nowrap text-right'}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r) => (
                <tr key={r.label} className="border-b border-term-line-soft align-top last:border-b-0">
                  <th scope="row" className={`min-w-[5rem] px-1.5 py-2 pl-0 text-left text-sm font-normal leading-relaxed text-term-fg ${wrap}`}>
                    {r.label}
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={`${c.text}-${i}`} className="term-num whitespace-nowrap px-1.5 py-2 text-right leading-relaxed text-term-fg last:pr-0">
                      {c.text}
                      {c.yen && <span className="block text-xs text-term-label">{c.yen}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'timeline':
      return (
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
          {block.items.map((x) => (
            <li key={`${x.when}${x.text}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-2 text-sm">
              <span className="term-num text-xs text-term-label">{x.when}</span>
              <span className={`min-w-0 text-term-fg ${wrap}`}>
                {x.title && <strong className="block font-semibold text-term-fg-strong">{x.title}</strong>}
                {x.text}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`m-0 grid grid-cols-1 gap-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-term-label`}>
          {block.items.map((x) => (
            <li key={`${x.lead ?? ''}${x.text}`} className={`text-sm leading-relaxed text-term-fg ${wrap}`}>
              {x.lead && <strong className="font-semibold text-term-fg-strong">{x.lead}</strong>}
              {x.lead && ' '}
              {x.text}
            </li>
          ))}
        </Tag>
      );
    }
    case 'subheading':
      return <h3 className="m-0 pt-1 text-sm font-semibold text-term-fg-strong">{block.text}</h3>;
    case 'figure': {
      const figure = article.figures.find((f) => f.id === block.figureId);
      return figure ? <FigureView figure={figure} /> : null;
    }
  }
}

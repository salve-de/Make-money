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
        <a key={s.no} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label} data-cite={s.no} className="term-num inline-flex min-h-11 min-w-9 items-center justify-center rounded-sm px-1 text-term-label hover:bg-term-line hover:text-term-fg-strong lg:min-h-8 lg:min-w-6">
          {s.no}
        </a>
      ))}
    </p>
  );
}

const wrap = '[overflow-wrap:anywhere]';

/** 章の中のまとまりの見出し（小見出し・表の題）。 */
const groupHeading = `m-0 border-l-2 border-term-label pl-2.5 text-[15px] font-semibold leading-snug text-term-fg-strong ${wrap}`;
/** 行の区切り。まとまりの中だけに線を引き、最初と最後の外側には引かない。 */
const row = 'border-b border-term-line-soft py-2.5 first:pt-0 last:border-b-0 last:pb-0';
/** 詳細の欄が広い時（約608px以上）に、行頭の見出しを左の列、説明を右の列に分ける。 */
const WIDE_SPLIT = '@[38rem]:grid-cols-[14rem_minmax(0,1fr)]';
const FLOW_COLUMNS: Record<number, string> = { 2: '@[38rem]:grid-cols-2', 3: '@[38rem]:grid-cols-3', 4: '@[38rem]:grid-cols-4' };

/** 「8万3,637ドル」「7億353万SEK」の先頭の数と、後ろの単位を読む。読めなければ null。 */
export function readAmount(text: string): { amount: number; unit: string } | null {
  const m = text.replace(/[,，\s]/g, '').replace(/^約/, '').match(/^(?:(\d+(?:\.\d+)?)億)?(?:(\d+(?:\.\d+)?)万)?(\d+(?:\.\d+)?)?(.*)$/);
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) return null;
  return { amount: Number(m[1] ?? 0) * 1e8 + Number(m[2] ?? 0) * 1e4 + Number(m[3] ?? 0), unit: m[4] };
}

/** 棒で比べられる行か（全部の値が同じ単位の数として読める時だけ）。比べられなければ null を返し、数字だけの行で出す。 */
function barAmounts(rows: ReadonlyArray<{ value: string }>): number[] | null {
  const read = rows.map((r) => readAmount(r.value));
  if (read.some((x) => x === null) || new Set(read.map((x) => x?.unit)).size !== 1) return null;
  const amounts = read.map((x) => x?.amount ?? 0);
  return Math.max(...amounts) > 0 ? amounts : null;
}

const numberBox = 'term-num inline-flex h-6 w-6 shrink-0 items-center justify-center border border-term-line bg-term-head text-xs text-term-sub';

/**
 * 番号つきの行。flow は順番に起きる流れ（番号を縦の線でつなぎ、広い時は横に並べて矢印でつなぐ）。
 * flow でない時は、番号つきの項目として縦に並べる。
 */
function Numbered({ items, flow }: { items: ReadonlyArray<{ title?: string; text: string }>; flow: boolean }) {
  const across = flow && items.length >= 2 && items.length <= 4 && items.every((x) => !x.title);
  if (across) {
    return (
      <ol data-case-article-flow className={`m-0 grid list-none grid-cols-1 p-0 @[38rem]:gap-px @[38rem]:border @[38rem]:border-term-line @[38rem]:bg-term-line ${FLOW_COLUMNS[items.length]}`}>
        {items.map((x, i) => (
          <li
            key={x.text}
            className={`relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 pb-3 last:pb-0 @[38rem]:block @[38rem]:bg-term-bg @[38rem]:p-3 @[38rem]:last:pb-3 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0.5 [&:not(:last-child)]:before:left-3 [&:not(:last-child)]:before:top-6.5 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-term-line @[38rem]:[&:not(:last-child)]:before:hidden @[38rem]:[&:not(:last-child)]:after:absolute @[38rem]:[&:not(:last-child)]:after:right-0 @[38rem]:[&:not(:last-child)]:after:top-3 @[38rem]:[&:not(:last-child)]:after:z-10 @[38rem]:[&:not(:last-child)]:after:translate-x-1/2 @[38rem]:[&:not(:last-child)]:after:bg-term-bg @[38rem]:[&:not(:last-child)]:after:py-0.5 @[38rem]:[&:not(:last-child)]:after:text-xs @[38rem]:[&:not(:last-child)]:after:leading-5 @[38rem]:[&:not(:last-child)]:after:text-term-label @[38rem]:[&:not(:last-child)]:after:content-['→']`}
          >
            <span className={numberBox}>{i + 1}</span>
            <p className={`m-0 text-sm leading-relaxed text-term-fg @[38rem]:mt-2 ${wrap}`}>{x.text}</p>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="m-0 list-none p-0">
      {items.map((x, i) => (
        <li key={`${x.title ?? ''}${x.text}`} className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 ${row}`}>
          <span className={numberBox}>{i + 1}</span>
          <div className={`grid min-w-0 grid-cols-1 gap-x-4 gap-y-0.5 ${x.title ? '@[38rem]:grid-cols-[12.25rem_minmax(0,1fr)]' : ''} ${wrap}`}>
            {x.title && <p className="m-0 text-sm font-semibold leading-relaxed text-term-fg-strong">{x.title}</p>}
            <p className="m-0 text-sm leading-relaxed text-term-fg">{x.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

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

/**
 * ブロックの前に空ける間隔。小見出し・題つきの表は新しいまとまりの始まりなので、線を引いて大きく空ける。
 * 補足は前の表に寄せる。小見出しの直後は詰める。
 */
export function blockSpacing(block: CaseArticleBlock, prev: CaseArticleBlock | undefined): string {
  if (!prev) return '';
  if (prev.type === 'subheading') return 'mt-2.5';
  if (block.type === 'subheading' || (block.type === 'rates' && block.caption)) return 'mt-5 border-t border-term-line pt-4';
  if (block.type === 'paragraph' && block.tone === 'note') return 'mt-2';
  return 'mt-5';
}

/** ブロック1つを種類に応じて描く。種類ごとの見た目はここだけに置き、事例ごとの手書きはしない。 */
export function ArticleBlock({ block, article }: { block: CaseArticleBlock; article: CaseArticle }) {
  switch (block.type) {
    case 'facts':
      return (
        <dl className="m-0">
          {block.rows.map((r) => (
            <div key={r.label} className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 ${row}`}>
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
      return <Numbered items={block.items} flow={false} />;
    case 'rates': {
      const amounts = block.bars ? barAmounts(block.rows) : null;
      const max = amounts ? Math.max(...amounts) : 0;
      return (
        <div>
          {block.caption && <h4 className={`${groupHeading} mb-2.5`}>{block.caption}</h4>}
          {amounts ? (
            <ul data-case-article-bars className="m-0 grid list-none grid-cols-[max-content_minmax(2.5rem,1fr)_max-content] gap-x-3 p-0">
              {block.rows.map((r, i) => (
                <li key={r.label} className={`col-span-3 grid grid-cols-subgrid items-center ${row}`}>
                  <span className="term-num text-xs text-term-label">{r.label}</span>
                  <span aria-hidden="true" className="block h-2 bg-term-line-soft">
                    <span data-value={amounts[i]} style={{ width: `${(amounts[i] / max) * 100}%` }} className={`block h-full min-w-0.5 ${amounts[i] === max ? 'bg-term-fg-strong' : 'bg-term-label'}`} />
                  </span>
                  <span className="text-right">
                    <span className="term-num block text-sm font-semibold text-term-fg-strong">{r.value}</span>
                    {r.yen && <span className="block text-xs text-term-label">{r.yen}</span>}
                  </span>
                  {r.note && <p className={`col-span-2 col-start-2 m-0 mt-0.5 text-xs leading-relaxed text-term-label ${wrap}`}>{r.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="m-0 max-w-[34rem] list-none p-0">
              {block.rows.map((r) => (
                <li key={r.label} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 ${row}`}>
                  <div className={`min-w-0 text-sm leading-relaxed text-term-fg-strong ${wrap}`}>
                    {r.label}
                    {r.note && <p className="m-0 mt-0.5 text-xs leading-relaxed text-term-label">{r.note}</p>}
                  </div>
                  <div className={`max-w-[11rem] text-right ${wrap}`}>
                    <p className="term-num m-0 text-sm font-semibold text-term-fg-strong">{r.value}</p>
                    {r.yen && <p className="m-0 text-xs text-term-label">{r.yen}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
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
        <ul className="m-0 list-none p-0">
          {block.items.map((x) => (
            <li key={`${x.when}${x.text}`} className={`grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 text-sm leading-relaxed ${row}`}>
              <span className="term-num pt-0.5 text-xs text-term-label">{x.when}</span>
              <span className={`min-w-0 text-term-fg ${wrap}`}>
                {x.title && <strong className="block font-semibold text-term-fg-strong">{x.title}</strong>}
                {x.text}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'list': {
      if (block.ordered) return <Numbered items={block.items.map((x) => ({ title: x.lead, text: x.text }))} flow />;
      // 全部の行に行頭の見出しがある時は、見出しを1行に立て、説明をその下（広い時は右）に置く。流し読みで見出しだけ拾える
      if (block.items.every((x) => x.lead)) {
        return (
          <ul data-case-article-leads className="m-0 list-none p-0">
            {block.items.map((x) => (
              <li key={`${x.lead}${x.text}`} className={`grid grid-cols-1 gap-x-4 gap-y-0.5 text-sm leading-relaxed ${WIDE_SPLIT} ${row} ${wrap}`}>
                <strong className="font-semibold text-term-fg-strong">{x.lead}</strong>
                <span className="text-term-fg">{x.text}</span>
              </li>
            ))}
          </ul>
        );
      }
      return (
        <ul className="m-0 grid list-disc grid-cols-1 gap-1.5 pl-5 marker:text-term-label">
          {block.items.map((x) => (
            <li key={`${x.lead ?? ''}${x.text}`} className={`text-sm leading-relaxed text-term-fg ${wrap}`}>
              {x.lead && <strong className="font-semibold text-term-fg-strong">{x.lead}</strong>}
              {x.lead && ' '}
              {x.text}
            </li>
          ))}
        </ul>
      );
    }
    case 'subheading':
      return <h4 className={groupHeading}>{block.text}</h4>;
    case 'figure': {
      const figure = article.figures.find((f) => f.id === block.figureId);
      return figure ? <FigureView figure={figure} /> : null;
    }
  }
}

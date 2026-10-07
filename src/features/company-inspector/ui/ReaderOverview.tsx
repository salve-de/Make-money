import React from 'react';

import type { AnalysisItem, ReaderAnalysis, ReaderCase, ReaderFact, ReaderMetric } from '@/shared/reader-case';
import { detailLineFor } from '@/shared/detail-lines';
import { isAbsenceOnly, stripAbsence } from '@/shared/absence-text';
import { successPointsFor } from '@/shared/success-points';
import { caseChaptersFor, type ChapterId, type ChapterRow } from '@/shared/case-chapters';
import { listLineFor } from '@/shared/list-lines';
import { summaryRestFor } from '@/shared/summary-lines';
import { formatMetricAmount, metricListLabel, metricOriginLabel, pickListMetric, plainAnalysisText, plainFactText, withYenApprox } from '@/shared/display-text';
import { ANALYSIS_LABELS, UI } from '@/shared/ui-strings';

/**
 * 詳しい欄の上半分。外部の見やすさの原理に合わせた作り:
 * - 結論を先頭に（強い一行）→ 主要な数字の帯 → 4段の物語 → まとまりごとの推測（項目名は細く・中身を主役に）
 * - 事実は実線、推測は点線の左罫と「推測」の印で見分ける（色だけに頼らない）
 * 推論は必ず言葉の印を付けて出す（確度は出さない。事実の要約は印なし）（OWNER_INTENT 3章）。
 */

/** 推論の印。薄灰色の言葉。ESTIMATE=「推定」、FACT_SUMMARY=印なし、未指定の旧データ=従来どおり（式あり=推定、無し=推測）。 */
function InferenceMark({ analysis }: { analysis: ReaderAnalysis }) {
  if (analysis.presentation === 'FACT_SUMMARY') return null;
  const estimate = analysis.presentation === 'ESTIMATE' || (analysis.presentation === undefined && Boolean(analysis.formula));
  return <span className="text-xs text-term-muted">{estimate ? UI.ESTIMATED_MARK : UI.ANALYSIS_MARK}</span>;
}

/** 帯に出した推論・事実。下の一覧で同じものを2回出さないために使う。 */
export type OverviewUsage = { items: Set<AnalysisItem>; factIds: Set<string> };

const byItem = (reader: ReaderCase, item: AnalysisItem) => reader.analysis.find((a) => a.item === item);

/**
 * 推移の線に使う点。同じ種類・通貨・期間の型・呼び名で、日付が付いた数値だけを古い順に。
 * 日付の無い点や意味の違う点を混ぜると、実際と逆向きの線になりうるので入れない。3点未満なら線は引かない。
 */
function seriesFor(reader: ReaderCase, lead: ReaderMetric): ReaderMetric[] {
  const points = reader.metrics
    .filter((m) => m.measure === lead.measure && m.currency === lead.currency && m.unit === lead.unit && m.periodKind === lead.periodKind && m.label === lead.label && m.origin !== 'ESTIMATED' && m.statedAt)
    .sort((a, b) => (a.statedAt ?? '').localeCompare(b.statedAt ?? ''));
  const dates = new Set(points.map((m) => m.statedAt));
  return points.length >= 3 && dates.size === points.length ? points : [];
}

/** 数字の横の小さな推移の線（軸・枠なし）。最後の点だけ色を付けて大きな数字とひも付ける。 */
function Sparkline({ points }: { points: number[] }) {
  const w = 72;
  const h = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const last = xy[xy.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="var(--term-sub)" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.25" fill="var(--term-accent)" />
    </svg>
  );
}

/** 帯の1マス。事実は実線の上罫、推測は点線の上罫。 */
function StripCell({ label, mark, inferred, children, attrs }: { label: string; mark?: React.ReactNode; inferred: boolean; children: React.ReactNode; attrs?: Record<string, string> }) {
  return (
    <div {...attrs} className={`min-w-0 border-t-2 ${inferred ? 'border-dashed border-term-accent-line' : 'border-solid border-term-sub'} bg-term-panel px-2.5 pb-2 pt-1.5`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-term-label">
        <span>{label}</span>
        {mark}
      </div>
      {children}
    </div>
  );
}

function AnalysisCell({ analysis }: { analysis: ReaderAnalysis }) {
  // 帯の推論は編集文を通らないので、外貨の金額に円換算の概算をここで添える（料金の事実の欄と同じ）
  const text = withYenApprox(stripAbsence(plainAnalysisText(analysis.text)));
  if (text === '') return null;
  return (
    <StripCell label={ANALYSIS_LABELS[analysis.item]} mark={ANALYSIS_LABELS[analysis.item].includes('推') ? undefined : <InferenceMark analysis={analysis} />} inferred attrs={{ 'data-analysis': analysis.id }}>
      <p className="text-sm lg:text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{text}</p>
    </StripCell>
  );
}

/** 帯に何を出すかを先に決める。下の一覧から同じものを外すのにも使う（描画中に状態を書き換えない）。 */
export function planKeyStrip(reader: ReaderCase) {
  const usage: OverviewUsage = { items: new Set(), factIds: new Set() };
  const lead = pickListMetric(reader);
  const metric = lead && lead.origin !== 'ESTIMATED' ? lead : null;
  const analyses: ReaderAnalysis[] = [];
  const take = (item: AnalysisItem) => {
    const a = byItem(reader, item);
    if (a) { usage.items.add(item); analyses.push(a); }
  };
  if (!metric) take('REVENUE_ESTIMATE');
  // 料金の欄には、金額が書いてある事実だけを出す（売り方の説明文を「料金」と名乗らせない）
  const priceFact: ReaderFact | undefined = reader.facts.find((f) => f.kind === 'PRICING' && f.id !== reader.summaryFactId && /[0-9０-９]/.test(f.text) && /(円|ドル|ルピー|ユーロ|ポンド|\$|USD|INR|EUR|GBP|無料|¥|€|£)/.test(f.text));
  if (priceFact) usage.factIds.add(priceFact.id);
  else take('PRICING');
  take('TAKE_HOME');
  return { metric, priceFact, analyses, usage };
}

const YEN_PER: Record<string, number> = { USD: 150, EUR: 165, GBP: 195, INR: 1.75 };

/** 外貨の売上は、円のおおよその額を添える（為替は固定の目安: 1ドル=150円など）。 */
function yenApprox(m: ReaderMetric): string | null {
  const rate = m.currency ? YEN_PER[m.currency] : undefined;
  return rate ? `約${formatMetricAmount({ amount: Math.round(m.amount * rate), currency: 'JPY', unit: m.unit })}` : null;
}

/** 主要な数字の帯: 売上（事実の数値。無ければ売上の推測）・料金・手残り。 */
export function KeyStrip({ reader, plan }: { reader: ReaderCase; plan: ReturnType<typeof planKeyStrip> }) {
  const { metric, priceFact, analyses } = plan;
  const cells: React.ReactNode[] = [];
  if (metric) {
    const series = seriesFor(reader, metric);
    cells.push(
      <StripCell key="metric" label={metricListLabel(metric)} inferred={false} attrs={{ 'data-metric': metric.id }}>
        <div className="flex items-end justify-between gap-2">
          <span className="term-num text-[22px] font-semibold leading-none text-term-fg-strong">{formatMetricAmount(metric)}{yenApprox(metric) && <span className="ml-2 text-sm font-normal text-term-sub">（{yenApprox(metric)}）</span>}</span>
          {series.length > 0 && <Sparkline points={series.map((m) => m.amount)} />}
        </div>
        <div className="mt-1.5 text-xs leading-snug text-term-label">
          {metric.period} ・ {metricOriginLabel(metric)}
        </div>
      </StripCell>,
    );
  }
  if (priceFact) {
    cells.push(
      <StripCell key="price" label={ANALYSIS_LABELS.PRICING} inferred={false} attrs={{ 'data-fact': priceFact.id }}>
        <p className="text-sm lg:text-[13px] leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{withYenApprox(plainFactText(priceFact.text))}</p>
      </StripCell>,
    );
  }
  for (const a of analyses) cells.push(<AnalysisCell key={a.id} analysis={a} />);
  if (cells.length === 0) return null;
  // 奇数個なら最後のマスを横いっぱいに（空きマスを作らない）
  return <div className="grid grid-cols-1 gap-px border-b border-term-line bg-term-line sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">{cells}</div>;
}

/** 概要。最初の1文を最上部に大きく、続きは畳まずそのまま下に出す。 */
export function WhatIs({ fact, entityId, lead = true }: { fact: ReaderFact | null | undefined; entityId?: string; lead?: boolean }) {
  if (!fact) return null;
  const text = stripAbsence(plainFactText(fact.text));
  const end = text.indexOf('。');
  // 一覧と同じ「短い1行」があればそれを大きく出し、元の要約は全文を下に続ける
  const short = entityId ? listLineFor(entityId, fact) : null;
  const first = short ?? (end >= 0 ? text.slice(0, end + 1) : text);
  if (!first) return null;
  // 短い1行と要約の1文目は同じことを言うので、続きは2文目から（同じ話を2度出さない）
  const rest = (entityId ? summaryRestFor(entityId, fact) : null) ?? (end >= 0 ? text.slice(end + 1).trim() : '');
  return (
    <div data-fact={fact.id} className="px-2.5 pb-3 pt-3 sm:px-3">
      <p className="mb-1 text-xs text-term-label">{UI.WHAT_IS}</p>
      <p className={lead ? 'text-[20px] font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]' : 'text-base font-medium leading-snug text-term-fg-strong [overflow-wrap:anywhere]'}>{first}</p>
      {rest && <p className="mt-2 text-sm leading-relaxed text-term-fg [overflow-wrap:anywhere]">{rest}</p>}
    </div>
  );
}

const STORY_STEPS = ['前夜', '隙', '突破', '金が回る仕組み'] as const;

/** 「前夜：…。隙：…。突破：…。金が回る仕組み：…」を4段に分ける。形が違えば null。 */
export function splitStory(text: string): Array<{ step: string; body: string }> | null {
  const re = new RegExp(`(${STORY_STEPS.join('|')})[:：]`, 'g');
  const marks = [...text.matchAll(re)];
  if (marks.length !== STORY_STEPS.length || marks.some((m, i) => m[1] !== STORY_STEPS[i])) return null;
  return marks.map((m, i) => ({
    step: m[1],
    body: text.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).trim().replace(/[。.]$/, ''),
  }));
}

/** 4段に分けられない物語。編集済みの「答え＋補足」があればそれを、無ければ原文のまま。 */
function StoryProse({ text, edited }: { text: string; edited: { answer: string; note?: string } | null }) {
  if (!edited) return <p className="whitespace-pre-line text-sm lg:text-[13px] leading-relaxed text-term-fg">{stripAbsence(text)}</p>;
  const note = stripAbsence(edited.note ?? '');
  return (
    <p className="[overflow-wrap:anywhere]">
      <span className="block text-sm font-medium leading-relaxed text-term-fg-strong">{stripAbsence(edited.answer)}</span>
      {note && <span className="mt-1 block text-xs leading-relaxed text-term-sub">{note}</span>}
    </p>
  );
}

/** 物語を4段の流れで。各段の名前は原文の語のまま（推論の本文の一部）。 */
export function StorySteps({ reader, entityId }: { reader: ReaderCase; entityId?: string }) {
  const story = byItem(reader, 'STORY');
  if (!story) return null;
  const steps = splitStory(story.text);
  const edited = detailLineFor(entityId, story);
  // 4段でない物語は、編集文で消した時と、出す文が「分からない」だけの時は欄ごと出さない（空の欄を残さない）
  if (!steps && (edited?.hidden || isAbsenceOnly(edited?.answer ?? plainAnalysisText(story.text)))) return null;
  return (
    <Fold id="section-story" title={UI.GROUP_ORIGIN} defaultOpen mark={<InferenceMark analysis={story} />} attrs={{ 'data-analysis': story.id }}>
      {steps ? (
        <ol className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
          {steps.map(({ step, body }, i) => (
            <li key={step} className="relative min-w-0 border-l border-dashed border-term-accent-line pl-2.5">
              <span className="mb-0.5 flex items-center gap-1.5 text-xs text-term-accent">
                <span className="term-num">{i + 1}</span>
                <span>{step}</span>
              </span>
              <span className="block text-sm lg:text-[13px] leading-snug text-term-fg [overflow-wrap:anywhere]">{body}</span>
            </li>
          ))}
        </ol>
      ) : (
        <StoryProse text={plainAnalysisText(story.text)} edited={edited} />
      )}
    </Fold>
  );
}

/** 推測を、読む人の疑問の順に並べる: 結論（成功の秘訣）→ 誰に売る → なぜ始めたか（着想） → 最初の客 → 金の回り → なぜ他に取られないか → 経緯。story は物語の4段（前夜・隙・突破…）をその位置に出す。 */
export const ANALYSIS_GROUPS: Array<{ title: string; items: AnalysisItem[]; story?: boolean }> = [
  { title: UI.GROUP_SECRET, items: ['WHY_IT_WORKED', 'LESSON'] },
  { title: UI.GROUP_CUSTOMERS, items: ['CUSTOMER', 'CUSTOMER_PAIN'] },
  { title: UI.GROUP_ORIGIN, items: [], story: true },
  { title: UI.GROUP_FIRST, items: ['FIRST_CUSTOMERS', 'CHANNELS', 'REFERRAL'] },
  { title: UI.GROUP_MONEY, items: ['BUSINESS_MODEL', 'PRICING', 'REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH', 'CAPITAL_AND_TEAM'] },
  { title: UI.GROUP_EDGE, items: ['INCUMBENT_BLINDSPOT', 'LOCK_IN', 'COMPETITION', 'DEPENDENCIES', 'TOOLS'] },
  { title: UI.GROUP_NOW, items: ['TIMELINE', 'PIVOTS', 'FAILURE_CAUSE'] },
];

/** 「2010年: …。2013年: …。」の形の年表を行に分ける。形が違えば null。 */
function splitTimeline(text: string): Array<{ when: string; what: string }> | null {
  const parts = text.split(/。(?=[^。:：]{1,24}[:：])/).map((part) => part.trim().replace(/。$/, '')).filter(Boolean);
  const rows = parts.map((part) => {
    const m = part.match(/^([^:：]{1,24})[:：]\s*(.+)$/);
    return m ? { when: m[1], what: m[2] } : null;
  });
  return rows.length >= 2 && rows.every(Boolean) ? (rows as Array<{ when: string; what: string }>) : null;
}

/** 項目の中身。編集済みの「答え＋補足」があればそれを、無ければ最初の1文を答えとして濃く、続きを薄く小さく出す。年表は行に分ける。 */
function AnswerText({ analysis, entityId }: { analysis: ReaderAnalysis; entityId?: string }) {
  const text = plainAnalysisText(analysis.text);
  const edited = detailLineFor(entityId, analysis);
  const line = analysis.item === 'TIMELINE' ? edited?.answer ?? text : stripAbsence(edited?.answer ?? text);
  if (line === '') return null;
  const timeline = analysis.item === 'TIMELINE' ? splitTimeline(line) : null;
  if (timeline) {
    return (
      <dd className="min-w-0 border-l border-dashed border-term-accent-line pl-2.5">
        <ol className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1">
          {timeline.map(({ when, what }) => (
            <li key={`${when}${what}`} className="contents">
              <span className="term-num text-xs leading-relaxed text-term-label">{when}</span>
              <span className="text-sm leading-relaxed text-term-fg-strong [overflow-wrap:anywhere]">{what}</span>
            </li>
          ))}
        </ol>
      </dd>
    );
  }
  const end = line.indexOf('。');
  const head = edited ? line : end >= 0 ? line.slice(0, end + 1) : line;
  const tail = edited ? stripAbsence(edited.note ?? '') : end >= 0 ? line.slice(end + 1).trim() : '';
  return (
    <dd className="min-w-0 whitespace-pre-line border-l border-dashed border-term-accent-line pl-2.5 [overflow-wrap:anywhere]">
      <span className="block text-sm font-medium leading-relaxed text-term-fg-strong">{head}</span>
      {tail && <span className="mt-1 block text-xs leading-relaxed text-term-sub">{tail}</span>}
    </dd>
  );
}

/** 区切りの見える折りたたみ。見出しは大きく太く、背景帯と矢印で「ここから別の話」と分かるようにする。 */
export function Fold({ id, title, mark, defaultOpen = false, attrs, children }: { id: string; title: string; mark?: React.ReactNode; defaultOpen?: boolean; attrs?: Record<string, string>; children: React.ReactNode }) {
  return (
    <details id={id} data-fold={id} open={defaultOpen} {...attrs} className="group scroll-mt-12 border-b border-term-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-term-head px-2.5 text-sm font-semibold text-term-fg-strong hover:bg-term-line sm:px-3 lg:min-h-9 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-block h-0 w-0 border-y-[5px] border-l-[6px] border-y-transparent border-l-term-accent transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">{title}</span>
        {mark}
      </summary>
      <div className="px-2.5 py-2.5 sm:px-3">{children}</div>
    </details>
  );
}

const CHAPTER_TITLES: Record<ChapterId, string> = {
  practice: UI.CHAPTER_PRACTICE,
  turning: UI.CHAPTER_TURNING,
  timeline: UI.CHAPTER_TIMELINE,
  core: UI.CHAPTER_CORE,
  start: UI.CHAPTER_START,
  price: UI.CHAPTER_PRICE,
  voices: UI.CHAPTER_VOICES,
};

/** 「2014年1月: …」の頭の日付を分ける。形が違えば null。 */
function splitWhen(text: string): { when: string; what: string } | null {
  const m = text.match(/^(\d{4}年[^:：]{0,12})[:：]\s*(.+)$/);
  return m ? { when: m[1], what: m[2] } : null;
}

/** 「前: …。後: …」を前と後の2行に分ける。形が違えば null。 */
function splitBeforeAfter(text: string): { before: string; after: string } | null {
  const m = text.match(/^前[:：]\s*(.+?)。?\s*後[:：]\s*(.+)$/);
  return m ? { before: m[1], after: m[2] } : null;
}

function ChapterRowView({ id, row, no }: { id: ChapterId; row: ChapterRow; no: number }) {
  if (id === 'timeline') {
    const parts = splitWhen(row.text);
    if (parts) {
      return (
        <li className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-2 text-sm">
          <span className="term-num text-xs text-term-label">{parts.when}</span>
          <span className="min-w-0 text-term-fg [overflow-wrap:anywhere]">
            {parts.what}
            <SourceMark no={no} />
          </span>
        </li>
      );
    }
  }
  if (id === 'turning') {
    const parts = splitBeforeAfter(row.text);
    if (parts) {
      return (
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-sm [overflow-wrap:anywhere]">
          <span className="text-xs text-term-label">前</span>
          <span className="text-term-sub">{parts.before}</span>
          <span className="text-xs font-semibold text-term-accent">後</span>
          <span className="font-semibold text-term-fg-strong">
            {parts.after}
            <SourceMark no={no} />
          </span>
        </li>
      );
    }
  }
  return <li className="text-sm text-term-fg [overflow-wrap:anywhere]">
      {row.text}
      <SourceMark no={no} />
    </li>;
}

/** 行の末尾に出す、出典の番号（リンクは章の末尾の一覧にまとめる）。 */
function SourceMark({ no }: { no: number }) {
  return <sup className="ml-0.5 text-[10px] text-term-label">{no}</sup>;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** 章の出典を、同じURLは1つにまとめて「出典1」「出典2」と番号を振る。 */
function numberSources(rows: ReadonlyArray<ChapterRow>): { urls: string[]; noOf: (row: ChapterRow) => number } {
  const urls = Array.from(new Set(rows.map((row) => row.source)));
  return { urls, noOf: (row) => urls.indexOf(row.source) + 1 };
}

function SourceList({ urls }: { urls: ReadonlyArray<string> }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-term-line-soft pt-1.5 text-xs text-term-label">
      {urls.map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
            {UI.CHAPTER_SOURCE}
            {i + 1}
          </a>
          <span className="ml-1">{hostOf(url)}</span>
        </li>
      ))}
    </ul>
  );
}

/** 事例ごとの追加の章。材料のある章だけを、決まった並びで全部開いたまま出す。 */
export function CaseChapters({ entityId, facts }: { entityId?: string; facts: ReadonlyArray<{ id: string; text: string }> }) {
  const chapters = caseChaptersFor(entityId, facts);
  if (chapters.length === 0) return null;
  return (
    <>
      {chapters.map(({ id, rows }) => {
        const { urls, noOf } = numberSources(rows);
        return (
          <Fold key={id} id={`section-chapter-${id}`} title={CHAPTER_TITLES[id]} defaultOpen>
            <ul className="grid grid-cols-1 gap-2">
              {rows.map((row) => (
                <ChapterRowView key={row.text} id={id} row={row} no={noOf(row)} />
              ))}
            </ul>
            <SourceList urls={urls} />
          </Fold>
        );
      })}
    </>
  );
}

export const GROUP_IDS = ['section-group-secret', 'section-group-customers', 'section-story', 'section-group-first', 'section-group-money', 'section-group-edge', 'section-group-now'] as const;

/** まとまりごとに「項目名（細く）｜中身（主役）」の2列。全部開いたまま並べる（読む人に開かせない）。推測は点線の左罫。 */
export function AnalysisGroups({ reader, usage, entityId }: { reader: ReaderCase; usage: OverviewUsage; entityId?: string }) {
  return (
    <>
      {ANALYSIS_GROUPS.map(({ title, items: allItems, story }, index) => {
        if (story) return <StorySteps key={title} reader={reader} entityId={entityId} />;
        const hasChapter = (id: ChapterId) => caseChaptersFor(entityId, reader.facts).some((chapter) => chapter.id === id);
        // 章が同じ話をしている欄は、重ねて出さない（年表→時間順の流れ、方向転換→つまずきと立て直し（失敗の理由の欄は残す））。
        const items = allItems.filter((item) => !((item === 'TIMELINE' && hasChapter('timeline')) || (item === 'PIVOTS' && hasChapter('turning')) || (item === 'CAPITAL_AND_TEAM' && hasChapter('start'))));
        const secrets = title === UI.GROUP_SECRET ? successPointsFor(entityId, reader.facts) : [];
        if (title === UI.GROUP_SECRET && secrets.length === 0 && caseChaptersFor(entityId, reader.facts).length > 0) {
          return <CaseChapters key={title} entityId={entityId} facts={reader.facts} />;
        }
        if (secrets.length > 0) {
          return (
            <React.Fragment key={title}>
            <Fold id={GROUP_IDS[index]} title={title} defaultOpen>
              <ol className="grid grid-cols-1 gap-3">
                {secrets.map(({ head, body }, i) => (
                  <li key={head} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-1.5">
                    <span className="term-num text-sm text-term-accent">{i + 1}</span>
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p className="text-sm font-semibold leading-snug text-term-fg-strong">{head}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-term-sub">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Fold>
            <CaseChapters entityId={entityId} facts={reader.facts} />
            </React.Fragment>
          );
        }
        const rows = items.filter((item) => !usage.items.has(item)).flatMap((item) => reader.analysis.filter((a) => a.item === item && !detailLineFor(entityId, a)?.hidden && (item === 'TIMELINE' || !isAbsenceOnly(detailLineFor(entityId, a)?.answer ?? plainAnalysisText(a.text)))));
        if (rows.length === 0) return null;
        return (
          <Fold key={title} id={GROUP_IDS[index]} title={title} defaultOpen>
            <dl className="divide-y divide-term-line-soft">
              {rows.map((a) => (
                <div key={a.id} data-analysis={a.id} className="grid grid-cols-1 gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <dt className="flex flex-wrap items-center gap-x-2 text-xs text-term-label sm:flex-col sm:items-start sm:gap-1">
                    <span>{ANALYSIS_LABELS[a.item]}</span>
                    <InferenceMark analysis={a} />
                  </dt>
                  <AnswerText analysis={a} entityId={entityId} />
                </div>
              ))}
            </dl>
          </Fold>
        );
      })}
    </>
  );
}

/** 数字・ひとことの帯と、章の並びの境目。目次の代わりに、1本の太めの区切りだけを置く。 */
export function SectionGap() {
  return <div aria-hidden="true" className="h-3 border-b border-term-line bg-term-bg" />;
}

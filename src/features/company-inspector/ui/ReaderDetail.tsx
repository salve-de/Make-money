import React, { useId } from 'react';

import type { ReaderCase } from '@/shared/reader-case';
import type { FinancialEntity } from '@/shared/terminal';
import type { PublicMediaAsset } from '@/shared/media-display';
import {
  dedupeReaderSources,
  formatMetricAmount,
  metricMeasureLabel,
  metricOriginLabel,
} from '@/shared/display-text';
import { ANALYSIS_ITEMS } from '@/shared/reader-case';
import { ANALYSIS_LABELS, UI } from '@/shared/ui-strings';
import { planCard, planNav, planSections } from '../model/case-detail-plan';
import { CaseSections } from './CaseSections';
import { IdentityCard, SectionNav } from './CaseIdentity';
import { evidenceAnchor, SourceRef, sourceAnchor, sourceNumbers } from './ReaderRefs';
import { ReaderSection } from './ReaderSection';

type ReaderProps = { reader?: ReaderCase; evidencePrefix?: string };

/** 数値の表。列は 項目・期間・金額・由来。出典は番号だけ付け、中身は下の一覧にまとめる。 */
export function ReaderMetrics({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sourceNo = sourceNumbers(reader);
  return (
    <ReaderSection id="section-metrics" title={UI.SECTION_METRICS} empty={reader.metrics.length === 0}>
      {/* 狭い画面では横に送る。キーボードでも送れるようにフォーカスを受ける */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={UI.SECTION_METRICS}>
        <table className="w-full min-w-[400px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th scope="col" className="px-2 font-normal">{UI.COL_MEASURE}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_PERIOD}</th>
              <th scope="col" className="px-2 text-right font-normal">{UI.COL_AMOUNT}</th>
              <th scope="col" className="px-2 font-normal">{UI.COL_ORIGIN}</th>
            </tr>
          </thead>
          <tbody>
            {reader.metrics.map((m) => {
              return (
                <tr key={m.id} id={evidenceAnchor(evidencePrefix, m.id)} data-metric={m.id} className="scroll-mt-8 border-b border-term-line-soft align-top">
                  <td className="px-2 py-1.5 text-term-fg-strong">
                    {metricMeasureLabel(m)}
                    <SourceRef n={sourceNo.get(m.sourceId)} prefix={evidencePrefix} />
                    {m.basis && <span className="block text-xs text-term-label">{m.basis}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-term-fg">
                    {m.period}
                    {m.statedAt && !m.period.includes(m.statedAt) && <span className="block text-xs text-term-label">{m.statedAt} {UI.METRIC_STATED_AT_SUFFIX}</span>}
                  </td>
                  <td className={`term-num px-2 py-1.5 text-right ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatMetricAmount(m)}</td>
                  <td className={`px-2 py-1.5 text-xs ${m.origin === 'ESTIMATED' ? 'text-term-accent' : 'text-term-muted'}`}>{metricOriginLabel(m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ReaderSection>
  );
}

/** 推測の計算式。計算がある推論だけ出す（「出典に載っている値」のような定型の式は出さない）。 */
const BOILERPLATE_FORMULA = /^数字は出典(に載っている|の)値|計算はない/;
export function ReaderEvidence({ reader }: ReaderProps) {
  if (!reader) return null;
  const rows = ANALYSIS_ITEMS.flatMap((item) => reader.analysis.filter((a) => a.item === item))
    .filter((a) => a.formula && !BOILERPLATE_FORMULA.test(a.formula.trim()));
  return (
    <ReaderSection id="section-reasoning" title={UI.SECTION_EVIDENCE} empty={rows.length === 0}>
      <ul className="min-w-0 divide-y divide-term-line-soft text-xs [overflow-wrap:anywhere]">
        {rows.map((a) => (
          <li key={a.id} data-evidence={a.id} className="py-1.5 leading-relaxed">
            <span className="text-term-label">{ANALYSIS_LABELS[a.item]}</span>
            <p className="whitespace-pre-line text-term-sub">
              <span className="text-term-label">{UI.ANALYSIS_FORMULA_PREFIX}</span>{a.formula}
            </p>
          </li>
        ))}
      </ul>
    </ReaderSection>
  );
}

/** 出典: 出版元・題名・日付・リンク。重複は1つ。 */
export function ReaderSources({ reader, evidencePrefix = 'reader' }: ReaderProps) {
  if (!reader) return null;
  const sources = dedupeReaderSources(reader.sources);
  return (
    <ReaderSection id="section-sources" title={UI.SECTION_SOURCES} empty={sources.length === 0}>
      <ul className="divide-y divide-term-line-soft">
        {sources.map((s, i) => (
          <li key={s.id} id={sourceAnchor(evidencePrefix, i + 1)} data-source={s.id} className="flex scroll-mt-8 gap-2 py-1.5 leading-relaxed text-term-fg">
            <span className="term-num shrink-0 text-xs text-term-label">{i + 1}</span>
            <span className="min-w-0">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center text-term-fg underline underline-offset-2 hover:text-term-fg-strong">
              {s.publisher}
              {s.title ? ` ${s.title}` : ''}
            </a>
            {(s.publishedAt ?? s.checkedAt) && (
              <span className="ml-1.5 text-xs text-term-label">{s.publishedAt ?? s.checkedAt}</span>
            )}
            </span>
          </li>
        ))}
      </ul>
    </ReaderSection>
  );
}

/** 詳細画面（台帳タブ）の中身。reader だけを読む。screen-text の検査も同じ部品を描く。 */
export function ReaderLedger({ reader, detailState, onRetry, media, identity }: {
  reader?: ReaderCase;
  /** 詳細の取得状態。取得中・失敗を「準備中」と取り違えて出さないために使う */
  detailState?: 'loading' | 'failed';
  onRetry?: () => void;
  /** 製品画面。身元カードと目次の直後に置く */
  media?: React.ReactNode;
  /** 身元カードに出す社名・分類・ロゴと、人数・創業年のもと。社名を渡さない画面（探す）では社名の行を出さない */
  identity?: { entity: Partial<Pick<FinancialEntity, 'temporal' | 'operations'>>; name?: string; genre?: string | null; logo?: PublicMediaAsset | null };
}) {
  const evidencePrefix = `reader-${useId()}`;
  // 一覧用に削った reader（listForm）は詳細の代わりにならない。完全な reader が無い間は取得状態を出す
  const incomplete = !reader || Boolean(reader.listForm);
  const status = incomplete && detailState === 'failed' ? (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-term-line px-2.5 py-3 text-sm text-term-muted sm:px-3">
      <span>{UI.DETAIL_LOAD_FAILED}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-sub hover:border-term-accent-line hover:text-term-accent lg:min-h-8">
          {UI.DETAIL_RELOAD}
        </button>
      )}
    </div>
  ) : incomplete && detailState === 'loading' ? (
    <p role="status" className="border-b border-term-line px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.DETAIL_LOADING}</p>
  ) : null;
  if (!reader && status) return status;
  if (!reader) return <p className="px-2.5 py-3 text-sm text-term-muted sm:px-3">{UI.NO_READER}</p>;
  const card = planCard(identity?.entity ?? {}, reader);
  const sections = planSections(reader, card);
  const hasBasis = reader.metrics.length > 0 || reader.sources.length > 0 || reader.analysis.some((a) => a.formula && !BOILERPLATE_FORMULA.test(a.formula.trim()));
  const nav = planNav(sections, hasBasis);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // 並び: 身元カード → 目次 → 製品画面 → 概要・稼ぎ方・客・勝因・経緯 → 根拠（数値・計算・出典）
  return (
    <>
      {status}
      <IdentityCard name={identity?.name} genre={identity?.genre ?? null} logo={identity?.logo} plan={card} />
      <SectionNav items={nav} onJump={jump} />
      {media}
      <CaseSections reader={reader} sections={sections} evidencePrefix={evidencePrefix} />
      {hasBasis && (
        <div id="section-basis" data-section="section-basis" className="scroll-mt-12 lg:scroll-mt-9">
          <h3 className="border-b border-term-line bg-term-head px-3 py-2 text-base font-semibold text-term-fg-strong lg:py-1.5 lg:text-sm">{UI.SEC_BASIS}</h3>
          <ReaderMetrics reader={reader} evidencePrefix={evidencePrefix} />
          <ReaderEvidence reader={reader} />
          <ReaderSources reader={reader} evidencePrefix={evidencePrefix} />
        </div>
      )}
    </>
  );
}

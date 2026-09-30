'use client';

import React from 'react';
import type { IdeaResearchCase, IdeaResearchOutcome } from '@/shared/idea-research';
import { sectorLabel } from '../grid/sectorLabel';

interface IdeaResearchCasesProps {
  cases: IdeaResearchCase[];
  onOpenCase: (id: string) => void;
}

const OUTCOME_LABEL: Record<IdeaResearchOutcome, { text: string; tone: string }> = {
  success: { text: '成功', tone: 'text-term-positive' },
  failure: { text: '失敗', tone: 'text-term-danger' },
  unknown: { text: '不明', tone: 'text-term-dim' },
};

const COLUMNS = 'grid-cols-[3rem_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(0,1fr)_7rem_11rem]';

/** 似た事例の一覧。行を押すと、台帳で事例を開く。月商は、確認できた事例だけ表示する。 */
export const IdeaResearchCases: React.FC<IdeaResearchCasesProps> = ({ cases, onOpenCase }) => (
  <section aria-label="似た事例">
    <div className="term-panel-title">
      <span className="term-panel-name">似た事例</span>
      <span className="term-num">{cases.length}件</span>
    </div>
    {cases.length === 0 ? (
      <div className="px-3 py-3 text-sm">
        <p className="text-term-fg-strong">似た事例は見つかりませんでした</p>
        <p className="mt-1 text-term-sub">誰の何をどう解決するかを具体的に書くと、見つかりやすくなります。</p>
      </div>
    ) : (
      <>
        <div aria-hidden="true" className={`hidden h-[26px] items-center gap-x-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid ${COLUMNS}`}>
          <span>区分</span>
          <span>事例</span>
          <span>分野</span>
          <span className="text-right">月商（確認済み）</span>
        </div>
        <ul>
          {cases.map((item, index) => {
            const outcome = OUTCOME_LABEL[item.outcome];
            return (
              <li key={item.id} className="border-b border-term-line-soft">
                <button
                  type="button"
                  onClick={() => onOpenCase(item.id)}
                  className={`grid min-h-11 w-full items-center gap-x-3 px-3 py-1.5 text-left hover:bg-term-select lg:min-h-[29px] lg:py-1 ${COLUMNS} ${index % 2 ? 'bg-term-row-alt' : ''}`}
                >
                  <span className={`text-xs ${outcome.tone}`}>{outcome.text}</span>
                  <span className="min-w-0 lg:flex lg:items-baseline lg:gap-3">
                    <span className="block truncate text-sm font-semibold text-term-fg-strong lg:max-w-[45%] lg:shrink-0 lg:text-[13px]">{item.name}</span>
                    <span className="block text-xs text-term-sub lg:min-w-0 lg:truncate">{item.tagline}</span>
                  </span>
                  <span className="hidden truncate text-xs text-term-muted lg:block">{sectorLabel({ sector: item.sector })}</span>
                  <span
                    title={item.monthlyRevenueLabel ?? undefined}
                    className={`term-num col-start-2 text-xs lg:col-start-auto lg:line-clamp-2 lg:text-right lg:text-[13px] ${item.monthlyRevenueLabel ? 'text-term-fg-strong' : 'text-term-dim'}`}
                  >
                    <span className="text-term-label lg:hidden">月商 </span>
                    {item.monthlyRevenueLabel ?? '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-b border-term-line-soft px-3 py-1.5 text-xs text-term-label">
          成功＝売上が確認できた事例 ／ 失敗＝撤退・破綻の記録がある事例 ／ 不明＝どちらも確認できていない事例。月商は確認できた事例だけ表示します。
        </p>
      </>
    )}
  </section>
);

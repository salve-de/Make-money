import React from 'react';

import type { PublicMediaAsset } from '@/shared/media-display';
import { formatMetricAmount, metricMeasureLabel, metricOriginLabel } from '@/shared/display-text';
import { UI } from '@/shared/ui-strings';
import { EntityLogo } from '@/platform/components/grid/EntityLogo';
import type { CardPlan, SectionId } from '../model/case-detail-plan';

/**
 * 詳細の最上部「身元カード」。1秒で「何の事業か」が分かるように、社名（折り返す）→ 何の事業か（1行）→ 数字の表 → 見どころ の順。
 * スマホは社名をここで出す（上のバーには置かない）。PC は上のバーの社名行があるので、ここでは出さない。
 */
export function IdentityCard({ name, genre, logo, plan }: {
  name?: string;
  genre: string | null;
  logo: PublicMediaAsset | null | undefined;
  plan: CardPlan;
}) {
  const { what, revenue, price, team, founded, highlight } = plan;
  const empty = <span className="text-term-dim">{UI.CARD_EMPTY}</span>;
  const row = (label: string, value: React.ReactNode, meta?: React.ReactNode) => (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-term-line-soft py-2 first:border-t-0">
      <dt className="text-xs text-term-label">{label}</dt>
      <dd className="min-w-0">
        <div className="text-base leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{value}</div>
        {meta && <div className="mt-0.5 text-xs leading-snug text-term-label">{meta}</div>}
      </dd>
    </div>
  );
  return (
    <section aria-label={UI.CARD_ARIA} className="border-b border-term-line bg-term-panel px-3 pb-3 pt-3">
      {name && (
      <div className="flex items-start gap-3 lg:hidden">
        <EntityLogo asset={logo} variant="card" name={name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold leading-tight text-term-fg-strong [overflow-wrap:anywhere]">{name}</h2>
          {genre && <span className="mt-1 inline-block rounded-[2px] border border-term-line px-1.5 text-xs leading-5 text-term-sub">{genre}</span>}
        </div>
      </div>
      )}
      {what && (
        <p data-fact-part={what.factId} className="mt-2 text-base leading-snug text-term-fg-strong lg:mt-0 lg:text-sm">{what.text}</p>
      )}
      <dl className="mt-3 border border-term-line bg-term-bg px-3">
        {row(
          UI.CARD_REVENUE,
          revenue ? (
            <span data-metric={revenue.id} className="term-num text-lg font-semibold">{formatMetricAmount(revenue)}</span>
          ) : empty,
          revenue && <span data-metric={revenue.id}>{metricMeasureLabel(revenue) !== UI.CARD_REVENUE ? `${metricMeasureLabel(revenue)} ・ ` : ''}{revenue.period} ・ {metricOriginLabel(revenue)}</span>,
        )}
        {row(UI.CARD_PRICE, price ? <span data-fact-part={price.factId}>{price.text}</span> : empty)}
        {row(UI.CARD_TEAM, team ? <span data-record="teamSize" className="term-num">{team}</span> : empty)}
        {row(UI.CARD_FOUNDED, founded ? (founded.factId ? <span data-fact-part={founded.factId} className="term-num">{founded.text}</span> : <span data-record="foundedYear" className="term-num">{founded.text}</span>) : empty)}
      </dl>
      {highlight && (
        <div data-analysis={highlight.analysisId} className="mt-3">
          <div className="mb-0.5 flex items-center gap-2 text-xs text-term-label">
            <span>{UI.CARD_HIGHLIGHT}</span>
            <span className="text-term-muted">{highlight.inferenceAnalysis.presentation === 'FACT_SUMMARY' ? '' : highlight.inferenceAnalysis.presentation === 'ESTIMATE' || (highlight.inferenceAnalysis.presentation === undefined && highlight.inferenceAnalysis.formula) ? UI.ESTIMATED_MARK : UI.ANALYSIS_MARK}</span>
          </div>
          <p className="text-base font-semibold leading-snug text-term-fg-strong [overflow-wrap:anywhere]">{highlight.text}</p>
        </div>
      )}
    </section>
  );
}

/** 目次。スマホ・PC とも上に貼り付き、押すとその区画へ飛ぶ。横にあふれたら送れる。 */
export function SectionNav({ items, onJump }: { items: Array<{ id: SectionId; title: string }>; onJump?: (id: SectionId) => void }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={UI.NAV_ARIA} className="sticky top-0 z-20 border-b border-term-line bg-term-panel">
      <ul className="flex overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              onClick={(event) => {
                if (!onJump) return;
                event.preventDefault();
                onJump(item.id);
              }}
              className="flex min-h-11 items-center px-3.5 text-term-sub hover:bg-term-head hover:text-term-fg-strong lg:min-h-8 lg:text-xs"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

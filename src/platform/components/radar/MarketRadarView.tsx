'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MARKET_RADAR_TRENDS,
  MARKET_RADAR_LANDMINES,
  RADAR_CATEGORIES,
  RadarCategory,
} from '@/platform/data/marketRadarData';
import { SquareTabs, type SquareTab } from '../playbook/SquareTabs';
import { radarTrendGuide, radarTrendTitle } from './radarLabels';
import { RADAR_LANDMINE_GUIDES } from './radarLandmineGuides';

interface MarketRadarViewProps {
  onSelectEntity?: (entityId: string) => void;
}

type ViewMode = 'OPPORTUNITIES' | 'LANDMINES' | 'DUAL';

const RADAR_GRID = 'md:grid-cols-[150px_minmax(0,1.1fr)_minmax(0,2fr)_32px]';

interface RadarRow { id: string; category: string; title: string; summary: string }

const RadarTable: React.FC<{ label: string; rows: RadarRow[] }> = ({ label, rows }) => (
  <section aria-label={label}>
    <div className={`hidden h-[26px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label md:grid ${RADAR_GRID}`}>
      <span>分野</span><span>テーマ</span><span>内容</span><span />
    </div>
    {rows.length === 0 && (
      <div className="px-3 py-4 text-sm">
        <p className="text-term-fg-strong">この分野のテーマはまだありません</p>
        <p className="mt-1 text-term-sub">分野を「すべて」に戻すと、全テーマを表示します。</p>
      </div>
    )}
    {rows.map((row, index) => (
      <Link
        key={row.id}
        href={`/radar/${row.id}`}
        className={`grid min-h-11 grid-cols-1 gap-x-3 border-b border-term-line-soft px-3 py-2 text-sm hover:bg-term-select lg:min-h-[29px] lg:items-center lg:py-1 ${RADAR_GRID} ${index % 2 ? 'bg-term-row-alt' : ''}`}
      >
        <span className="text-xs text-term-label md:text-sm md:text-term-muted">{row.category}</span>
        <span className="font-semibold text-term-fg-strong md:truncate">{row.title}</span>
        <span className="line-clamp-2 text-term-sub md:line-clamp-1">{row.summary}</span>
        <span aria-hidden="true" className="hidden text-right text-term-label md:block">→</span>
      </Link>
    ))}
  </section>
);

export const MarketRadarView: React.FC<MarketRadarViewProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('OPPORTUNITIES');
  const [selectedCategory, setSelectedCategory] = useState<RadarCategory>('ALL');

  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'ALL') return MARKET_RADAR_TRENDS;
    return MARKET_RADAR_TRENDS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const trendRows: RadarRow[] = filteredTrends.map((trend) => ({
    id: trend.id,
    category: radarTrendGuide(trend.id)?.category ?? trend.categoryLabel,
    title: radarTrendTitle(trend.id, trend.categoryLabel),
    summary: radarTrendGuide(trend.id)?.summary ?? trend.macroContext.heading,
  }));
  const mineRows: RadarRow[] = MARKET_RADAR_LANDMINES.map((mine) => ({
    id: mine.id,
    category: RADAR_LANDMINE_GUIDES[mine.id]?.category ?? mine.fatalCategory,
    title: RADAR_LANDMINE_GUIDES[mine.id]?.title ?? mine.title,
    summary: RADAR_LANDMINE_GUIDES[mine.id]?.summary ?? mine.deadlyReason.heading,
  }));

  const tabs: ReadonlyArray<SquareTab<ViewMode>> = [
    { key: 'DUAL', label: '比較' },
    { key: 'OPPORTUNITIES', label: '事業テーマ', count: MARKET_RADAR_TRENDS.length },
    { key: 'LANDMINES', label: '失敗要因', count: MARKET_RADAR_LANDMINES.length },
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-term-bg font-sans text-term-fg">
      <h1 className="sr-only">市場の動きと事業リスク</h1>

      <div className="sticky top-0 z-20 border-b border-term-line bg-term-panel">
        <div className="flex flex-col sm:flex-row sm:items-stretch sm:justify-between">
          <SquareTabs ariaLabel="表示する市場情報" tabs={tabs} value={viewMode} onChange={setViewMode} />
          {viewMode !== 'LANDMINES' && (
            <label className="flex min-w-0 items-center gap-2 border-t border-term-line-soft px-3 py-1 text-xs text-term-label sm:w-72 sm:border-l sm:border-t-0">
              <span className="shrink-0">分野</span>
              <select
                aria-label="事業テーマの分野"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as RadarCategory)}
                className="h-11 min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-2 text-sm text-term-fg-strong lg:h-7"
              >
                {RADAR_CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="w-full flex-1">
        {(viewMode === 'OPPORTUNITIES' || viewMode === 'DUAL') && (
          <section aria-labelledby="radar-opportunities-heading">
            {/* 1種類だけ出す時はタブと同じ見出しになるので、読み上げ用だけに残す */}
            <div className={viewMode === 'DUAL' ? 'term-panel-title' : 'sr-only'}>
              <h2 id="radar-opportunities-heading" className="term-panel-name">事業テーマ</h2>
              <span className="term-num">{filteredTrends.length}件</span>
            </div>
            <RadarTable label="事業テーマの一覧" rows={trendRows} />
          </section>
        )}

        {(viewMode === 'LANDMINES' || viewMode === 'DUAL') && (
          <section aria-labelledby="radar-landmines-heading">
            <div className={viewMode === 'DUAL' ? 'term-panel-title' : 'sr-only'}>
              <h2 id="radar-landmines-heading" className="term-panel-name">失敗要因</h2>
              <span className="term-num">{MARKET_RADAR_LANDMINES.length}件</span>
            </div>
            <RadarTable label="失敗要因の一覧" rows={mineRows} />
          </section>
        )}

        <div className="flex justify-end border-t border-term-line px-3 py-2 text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">
            事例一覧へ
          </Link>
        </div>
      </div>
    </div>
  );
};

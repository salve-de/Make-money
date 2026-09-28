'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MARKET_RADAR_TRENDS,
  MARKET_RADAR_LANDMINES,
  RADAR_CATEGORIES,
  RadarCategory,
} from '@/platform/data/marketRadarData';
import {
  ArrowRight,
} from 'lucide-react';
import { radarTrendGuide, radarTrendTitle } from './radarLabels';
import { RADAR_LANDMINE_GUIDES } from './radarLandmineGuides';

interface MarketRadarViewProps {
  onSelectEntity?: (entityId: string) => void;
}

type ViewMode = 'OPPORTUNITIES' | 'LANDMINES' | 'DUAL';

export const MarketRadarView: React.FC<MarketRadarViewProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('OPPORTUNITIES');
  const [selectedCategory, setSelectedCategory] = useState<RadarCategory>('ALL');

  // フィルタリングされたチャンス一覧
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'ALL') return MARKET_RADAR_TRENDS;
    return MARKET_RADAR_TRENDS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-background font-sans text-foreground">
      <h1 className="sr-only">市場の動きと事業リスク</h1>

      {/* ─── 2. 攻守モード切替バー ─── */}
      <div className="sticky top-0 z-20 border-b border-white/[0.14] bg-surface px-3 py-1.5 sm:px-5">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {/* 大枠モード切替 */}
          <div role="tablist" aria-label="表示する市場情報" className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setViewMode('DUAL')}
              aria-pressed={viewMode === 'DUAL'}
              className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${
                viewMode === 'DUAL'
                  ? 'border-sky-300 text-sky-200'
                  : 'border-transparent text-zinc-300 hover:text-white'
              }`}
            >
              <span>比較</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('OPPORTUNITIES')}
              aria-pressed={viewMode === 'OPPORTUNITIES'}
              className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${
                viewMode === 'OPPORTUNITIES'
                  ? 'border-sky-300 text-sky-200'
                  : 'border-transparent text-zinc-300 hover:text-white'
              }`}
            >
              <span>事業テーマ</span>
              <span className="text-xs tabular-nums text-zinc-400">
                {MARKET_RADAR_TRENDS.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('LANDMINES')}
              aria-pressed={viewMode === 'LANDMINES'}
              className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${
                viewMode === 'LANDMINES'
                  ? 'border-sky-300 text-sky-200'
                  : 'border-transparent text-zinc-300 hover:text-white'
              }`}
            >
              <span>失敗要因</span>
              <span className="text-xs tabular-nums text-zinc-400">
                {MARKET_RADAR_LANDMINES.length}
              </span>
            </button>
          </div>

          {/* チャンス表示時のカテゴリフィルター */}
          {viewMode !== 'LANDMINES' && (
            <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400 sm:w-60">
              <span className="shrink-0">分野</span>
              <select
                aria-label="事業テーマの分野"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as RadarCategory)}
                className="h-9 min-w-0 flex-1 rounded border border-white/[0.16] bg-[#18232d] px-2 text-sm text-zinc-100"
              >
                {RADAR_CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* ─── 3. メインコンテンツ領域 ─── */}
      <div className="mx-auto w-full max-w-screen-2xl flex-1 space-y-4 px-3 py-3 sm:px-5">

        {/* ═══════════════════════════════════════════════════════════════════
            【セクションA】儲かりチャンス・傾向カタログ（一覧グリッド）
           ═══════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'OPPORTUNITIES' || viewMode === 'DUAL') && (
          <section className="space-y-3" aria-labelledby="radar-opportunities-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="radar-opportunities-heading" className="text-sm font-semibold tracking-tight text-white">
                事業テーマ
              </h2>
              <span className="text-sm text-zinc-400 tabular-nums">
                {filteredTrends.length}件
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {filteredTrends.map((trend) => {
                return (
                  <Link
                    key={trend.id}
                    href={`/radar/${trend.id}`}
                    className="group relative grid gap-1 rounded-md border border-white/[0.16] bg-[#101721] px-3 py-2.5 sm:px-4 sm:py-3 transition-colors hover:border-sky-300/40 hover:bg-[#17232e]"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-6">
                      <span className="text-xs font-medium text-accent-strong">{radarTrendGuide(trend.id)?.category ?? trend.categoryLabel}</span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-snug text-white transition-colors group-hover:text-sky-200">
                        {radarTrendTitle(trend.id, trend.categoryLabel)}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400 line-clamp-2 leading-5">
                        {radarTrendGuide(trend.id)?.summary ?? trend.macroContext.heading}
                      </p>
                    </div>

                    <ArrowRight aria-hidden="true" className="absolute right-4 top-3.5 h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-200" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【セクションB】地雷・参入禁止領域カタログ（一覧グリッド）
           ═══════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'LANDMINES' || viewMode === 'DUAL') && (
          <section className="space-y-3" aria-labelledby="radar-landmines-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="radar-landmines-heading" className="text-sm font-semibold tracking-tight text-white">失敗要因</h2>
              <span className="text-sm text-zinc-400 tabular-nums">
                {MARKET_RADAR_LANDMINES.length}件
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {MARKET_RADAR_LANDMINES.map((mine) => {
                return (
                  <Link
                    key={mine.id}
                    href={`/radar/${mine.id}`}
                    className="group relative grid gap-1 rounded-md border border-white/[0.16] bg-[#101721] px-3 py-2.5 sm:px-4 sm:py-3 transition-colors hover:border-sky-300/40 hover:bg-[#17232e]"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-6">
                      <span className="text-xs font-medium text-rose-200">{RADAR_LANDMINE_GUIDES[mine.id]?.category ?? mine.fatalCategory}</span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-snug text-white transition-colors group-hover:text-sky-200">
                        {RADAR_LANDMINE_GUIDES[mine.id]?.title ?? mine.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400 line-clamp-2 leading-5">
                        {RADAR_LANDMINE_GUIDES[mine.id]?.summary ?? mine.deadlyReason.heading}
                      </p>
                    </div>

                    <ArrowRight aria-hidden="true" className="absolute right-4 top-3.5 h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-200" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex justify-end border-t border-white/[0.12] pt-3 text-sm">
          <Link href="/" className="shrink-0 font-medium text-sky-200 hover:underline">
            事例一覧へ
          </Link>
        </div>

      </div>
    </div>
  );
};

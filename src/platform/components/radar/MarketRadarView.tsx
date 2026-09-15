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
  Flame,
  Skull,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface MarketRadarViewProps {
  onSelectEntity?: (entityId: string) => void;
}

type ViewMode = 'OPPORTUNITIES' | 'LANDMINES' | 'DUAL';

export const MarketRadarView: React.FC<MarketRadarViewProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('DUAL');
  const [selectedCategory, setSelectedCategory] = useState<RadarCategory>('ALL');

  // フィルタリングされたチャンス一覧
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'ALL') return MARKET_RADAR_TRENDS;
    return MARKET_RADAR_TRENDS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060709] text-zinc-100 overflow-y-auto font-sans select-none">
      {/* ─── 1. 最上部ヘッダー ─── */}
      <header className="border-b border-white/[0.06] bg-[#090A0F] px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MARKET ANOMALY RADAR // OPPORTUNITY & GRAVEYARD MAP</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
              市場傾向 ＆ マネー攻略・地雷検死レーダー
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              個別企業の辞書ではなく、「いま金が集まっている急所（攻め）」と「9割が即死する禁止領域（守り）」を鳥瞰して攻略する
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 border border-white/[0.1] transition-colors flex items-center gap-1.5"
            >
              <span>← 全銘柄台帳 (Ledger)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 2. 攻守モード切替バー ─── */}
      <div className="border-b border-white/[0.06] bg-[#0A0D14] px-4 sm:px-6 py-2.5 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* 大枠モード切替 */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setViewMode('DUAL')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'DUAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>攻守対照ビュー</span>
            </button>

            <button
              onClick={() => setViewMode('OPPORTUNITIES')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'OPPORTUNITIES'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>儲かりチャンス・傾向</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/30 text-emerald-200">
                {MARKET_RADAR_TRENDS.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode('LANDMINES')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'LANDMINES'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>地雷・参入禁止領域</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/30 text-rose-200">
                {MARKET_RADAR_LANDMINES.length}
              </span>
            </button>
          </div>

          {/* チャンス表示時のカテゴリフィルター */}
          {viewMode !== 'LANDMINES' && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              {RADAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedCategory === cat.key
                      ? 'bg-white/[0.12] text-white border border-white/[0.2] font-semibold'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. メインコンテンツ領域 ─── */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 flex-1">

        {/* ═══════════════════════════════════════════════════════════════════
            【セクションA】儲かりチャンス・傾向カタログ（一覧グリッド）
           ═══════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'OPPORTUNITIES' || viewMode === 'DUAL') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>OPPORTUNITY CATALOG // 資本主義で今お金が集まっている8大急上昇トレンド</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                表示中: {filteredTrends.length}件 / 全{MARKET_RADAR_TRENDS.length}件（クリックで攻略本へ遷移）
              </span>
            </div>

            {/* チャンスカードの複数グリッド：各カードが専用ページへのLink */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredTrends.map((trend) => {
                return (
                  <Link
                    key={trend.id}
                    href={`/radar/${trend.id}`}
                    className="text-left p-4 rounded-lg border border-white/[0.08] bg-[#090B10] hover:border-emerald-500/60 hover:bg-[#0D1418] hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/[0.06] text-zinc-300 border border-white/[0.1]">
                          {trend.badge}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            {trend.growthRate}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                            🔥{trend.heatScore}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">
                        {trend.title}
                      </h3>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {trend.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">
                        {trend.estimatedMonthlyProfit}
                      </span>
                      <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                        <span>攻略本を開く</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
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
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 tracking-wider">
                <Skull className="w-4 h-4" />
                <span>FATAL GRAVEYARDS // 9割が即死する5大参入禁止領域（検死カルテ）</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                全{MARKET_RADAR_LANDMINES.length}領域（死亡率85%〜95% / クリックで検死書へ遷移）
              </span>
            </div>

            {/* 地雷カードの複数グリッド：各カードが専用ページへのLink */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {MARKET_RADAR_LANDMINES.map((mine) => {
                return (
                  <Link
                    key={mine.id}
                    href={`/radar/${mine.id}`}
                    className="text-left p-4 rounded-lg border border-rose-950/50 bg-[#0E080A] hover:border-rose-500/60 hover:bg-[#160A0D] hover:shadow-lg hover:shadow-rose-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {mine.badge}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                          {mine.fatalityRate}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-rose-100 leading-snug group-hover:text-rose-300 transition-colors">
                        {mine.title}
                      </h3>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {mine.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-rose-900/30 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-rose-400 font-bold">
                        危険度 {mine.burnRiskScore}/100
                      </span>
                      <span className="text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                        <span>死因解剖</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 案内フッターバナー ─── */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>カードをクリックすると、対象領域の「3段ピラミッド攻略本」または「検死解剖書」の専用個別URLへ遷移します</span>
          </div>
          <Link href="/" className="text-zinc-300 hover:text-white underline">
            全銘柄台帳へ戻る →
          </Link>
        </div>

      </div>
    </div>
  );
};

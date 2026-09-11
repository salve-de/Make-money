'use client';

import React, { useState } from 'react';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import {
  Flame,
  Zap,
  ShieldAlert,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
} from 'lucide-react';
import { AffiliateToolList } from '../tools/AffiliateToolBadge';

interface MarketAnomalyLensStripProps {
  selectedAnomalyId: string | null;
  onSelectAnomaly: (anomalyId: string | null) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
}

export const MarketAnomalyLensStrip: React.FC<MarketAnomalyLensStripProps> = ({
  selectedAnomalyId,
  onSelectAnomaly,
  onOpenSynthesisWithEntity,
}) => {
  // 選択中の歪みオブジェクト
  const activeAnomaly = MARKET_ANOMALIES.find((a) => a.id === selectedAnomalyId) || null;
  // 詳細アコーディオンの開閉ステート（選択時はデフォルト開）
  const [isDetailExpanded, setIsDetailExpanded] = useState(true);

  return (
    <div className="border-b border-white/[0.06] bg-[#08090D] flex flex-col shrink-0 font-sans select-text">
      {/* ─── 1. 水平ピル・セレクター（歪み・トレンドの水平カルーセル） ─── */}
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 text-[11px] font-mono pr-2 border-r border-white/[0.08]">
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-semibold text-zinc-300">市場の歪みレンズ:</span>
        </div>

        {/* 「すべて表示」ピル */}
        <button
          onClick={() => onSelectAnomaly(null)}
          className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedAnomalyId === null
              ? 'bg-white/[0.12] text-white border border-white/[0.2] font-semibold shadow-sm'
              : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-white/[0.05]'
          }`}
        >
          <span>全銘柄 (歪み未選択)</span>
        </button>

        {/* 各市場の歪みピル */}
        {MARKET_ANOMALIES.map((anomaly) => {
          const isSelected = selectedAnomalyId === anomaly.id;
          return (
            <button
              key={anomaly.id}
              onClick={() => {
                if (isSelected) {
                  onSelectAnomaly(null);
                } else {
                  onSelectAnomaly(anomaly.id);
                  setIsDetailExpanded(true);
                }
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/60 font-semibold'
                  : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-white/[0.05]'
              }`}
              title={anomaly.subtitle}
            >
              <span className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                anomaly.isHot
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              }`}>
                {anomaly.signalBadge}
              </span>
              <span>{anomaly.title}</span>
              <span className="text-[10px] text-zinc-500">({anomaly.netMarginPercent}%)</span>
            </button>
          );
        })}
      </div>

      {/* ─── 2. 選択中歪みの高密度インテリジェンス・ドロワー ─── */}
      {activeAnomaly && (
        <div className="border-t border-emerald-500/20 bg-emerald-950/[0.12] px-3.5 py-2.5 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                {activeAnomaly.categoryLabel}
              </span>
              <h2 className="text-xs font-bold text-white tracking-wide truncate">
                {activeAnomaly.title}
              </h2>
              <span className="text-[11px] text-zinc-400 hidden md:inline truncate">
                ─ {activeAnomaly.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                想定月商: <strong className="text-zinc-200">{activeAnomaly.expectedRevenue}</strong>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                純利 {activeAnomaly.netMarginPercent}%
              </span>
              <button
                onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors"
                title={isDetailExpanded ? '解剖カルテを閉じる' : '解剖カルテを開く'}
              >
                {isDetailExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onSelectAnomaly(null)}
                className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-rose-400 transition-colors"
                title="歪みフィルターを解除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 展開された詳細解剖ブロック */}
          {isDetailExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* ① 狙う痛みの財布 */}
              <div className="p-2.5 rounded bg-rose-950/15 border border-rose-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-rose-400">
                  <Target className="w-3 h-3" />
                  <span>1. 狙う痛みの財布 (サバンナOS)</span>
                </div>
                <p className="text-[11px] text-zinc-200 leading-relaxed font-sans line-clamp-3">
                  {activeAnomaly.targetPainWallet}
                </p>
              </div>

              {/* ② 大手の自爆構造 */}
              <div className="p-2.5 rounded bg-amber-950/15 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-400">
                  <ShieldAlert className="w-3 h-3" />
                  <span>2. 大手の自爆構造 (カニバリズム)</span>
                </div>
                <p className="text-[11px] text-zinc-200 leading-relaxed font-sans line-clamp-3">
                  {activeAnomaly.incumbentTrap}
                </p>
              </div>

              {/* ③ 現場で流行の手口 ＆ ツール */}
              <div className="p-2.5 rounded bg-emerald-950/15 border border-emerald-500/20 space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-400">
                    <Zap className="w-3 h-3" />
                    <span>3. いま現場で流行っている抜き方</span>
                  </div>
                  <p className="text-[11px] text-zinc-200 leading-relaxed font-sans line-clamp-2">
                    {activeAnomaly.trendingPlaybook}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 font-medium">現場の配管ツール (Tech Stack):</span>
                    {activeAnomaly.proofEntityIds[0] && onOpenSynthesisWithEntity && (
                      <button
                        onClick={() => onOpenSynthesisWithEntity(activeAnomaly.proofEntityIds[0])}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                      >
                        <span>AI壁打ちへ転送</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <AffiliateToolList tools={activeAnomaly.techStack} showDisclosure={true} />
                </div>
              </div>
            </div>
          )}

          {/* 下部通知: 該当銘柄が下のグリッドに抽出されている案内 */}
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-emerald-400/90 pt-1">
            <span>
              ▼ この歪みを突いて粗利70〜90%を抜いている【実在企業 {activeAnomaly.proofEntityIds.length}社】を下部台帳に抽出中
            </span>
            <button
              onClick={() => onSelectAnomaly(null)}
              className="text-zinc-400 hover:text-white underline text-[10px]"
            >
              フィルター解除 (全社表示)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

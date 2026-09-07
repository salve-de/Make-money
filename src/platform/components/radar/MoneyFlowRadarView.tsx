'use client';

import React, { useState } from 'react';
import { FinancialEntity } from '../../types/terminal';
import {
  MONEY_FLOW_TRENDS,
  RED_OCEAN_ALERTS,
  PAIN_WALLET_HEATMAPS,
} from '../../data/moneyFlowRadarData';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ArrowRight,
  Building2,
  Zap,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface MoneyFlowRadarViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
}

type RadarFilter = 'ALL' | 'RISING' | 'WARNING' | 'PAIN_WALLET';

export const MoneyFlowRadarView: React.FC<MoneyFlowRadarViewProps> = ({
  allEntities,
  onOpenEntityInLedger,
}) => {
  const [filter, setFilter] = useState<RadarFilter>('ALL');

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. レーダーヘッダー ＆ 市況インジケーター */}
      <div className="border-b border-white/[0.06] bg-[#07080B] p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MONEY FLOW RADAR
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                CAPITALISM GLITCH & TREND SURVEILLANCE
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              マネーフロー動向レーダー
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
              いま世界でどの「稼ぎの型」が急上昇し、どこに金が集まり、何が陳腐化して崩壊しているか。資本主義の地殻変動と富の移動ルートをリアルタイム監視するプロ用戦闘端末。
            </p>
          </div>

          {/* 市況インジケーター */}
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">最高成長手口</div>
              <div className="text-sm font-mono font-bold text-emerald-400">+340%</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">平均手残り粗利</div>
              <div className="text-sm font-mono font-bold text-white">71.3%</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">崩壊警戒アラート</div>
              <div className="text-sm font-mono font-bold text-amber-400">2件</div>
            </div>
          </div>
        </div>

        {/* フィルターセレクター */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
              filter === 'ALL'
                ? 'bg-white text-zinc-950 border-white font-medium'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
          >
            すべて表示
          </button>
          <button
            onClick={() => setFilter('RISING')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
              filter === 'RISING'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3 text-emerald-400" />
            <span>急上昇トレンド ({MONEY_FLOW_TRENDS.length})</span>
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
              filter === 'WARNING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>崩壊警戒アラート ({RED_OCEAN_ALERTS.length})</span>
          </button>
          <button
            onClick={() => setFilter('PAIN_WALLET')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
              filter === 'PAIN_WALLET'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-medium'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-sky-400" />
            <span>痛みの財布ヒートマップ ({PAIN_WALLET_HEATMAPS.length})</span>
          </button>
        </div>
      </div>

      {/* 2. メインコンテンツ領域 */}
      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-10">
        {/* セクション A: 急上昇中の「稼ぎの型」トレンド */}
        {(filter === 'ALL' || filter === 'RISING') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  RISING ARCHITECTURAL TRENDS（急上昇の稼ぎの型）
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                前年比成長率 ＆ 実効手残り粗利順
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {MONEY_FLOW_TRENDS.map((trend) => {
                const matchedEntities = allEntities.filter((e) =>
                  trend.representativeEntityIds.includes(e.id)
                );

                return (
                  <div
                    key={trend.id}
                    className="p-5 md:p-6 rounded-lg bg-[#08090C] border border-white/[0.08] hover:border-white/[0.18] transition-all space-y-4 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* メタ情報 ＆ 指標 */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                          {trend.badge}
                        </span>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="text-zinc-500">
                            粗利: <span className="text-emerald-400 font-bold">{trend.avgMargin}%</span>
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500">{trend.timestamp}</span>
                        </div>
                      </div>

                      {/* タイトル */}
                      <h3 className="text-sm md:text-base font-bold text-white leading-snug mb-2.5">
                        {trend.title}
                      </h3>

                      {/* 要約 */}
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4">
                        {trend.summary}
                      </p>

                      {/* 急上昇の構造的背景（大手の自縛） */}
                      <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1.5 mb-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 uppercase tracking-wider font-medium">
                          <ShieldAlert className="w-3 h-3" />
                          急騰の構造的背景（大手の自縛）
                        </div>
                        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                          {trend.structuralBackground}
                        </p>
                      </div>

                      {/* 人質にした財布 */}
                      <div className="flex items-start gap-1.5 text-xs text-zinc-400 mb-2">
                        <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span className="font-mono text-[11px] text-zinc-500 shrink-0">人質財布:</span>
                        <span className="text-zinc-300">{trend.targetPainWallet}</span>
                      </div>
                    </div>

                    {/* 下部: 牽引銘柄 ＆ DB直通リンク */}
                    <div className="pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="text-[10px] font-mono text-zinc-500">
                        この手口を牽引している実例企業（クリックでDB財務カルテを検証）:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matchedEntities.map((ent) => (
                          <button
                            key={ent.id}
                            onClick={() => onOpenEntityInLedger(ent.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/40 text-xs font-mono text-zinc-200 hover:text-white transition-all group"
                          >
                            <Building2 className="w-3 h-3 text-zinc-400 group-hover:text-emerald-400" />
                            <span>{ent.name}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* セクション B: レッドオーシャン警戒アラート（崩壊手口） */}
        {(filter === 'ALL' || filter === 'WARNING') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  RED OCEAN WARNING ALERTS（崩壊・陳腐化中の手口）
                </h2>
              </div>
              <span className="text-[11px] font-mono text-amber-400/80">
                ※参入厳禁・価格崩壊アラート
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {RED_OCEAN_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className="p-5 md:p-6 rounded-lg bg-[#08090C] border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-3.5 shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] font-bold">
                      参入警戒
                    </span>
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {alert.marginDecline}
                    </span>
                  </div>

                  <h3 className="text-sm md:text-base font-bold text-white leading-snug">
                    {alert.title}
                  </h3>

                  {/* なぜ死ぬのか */}
                  <div className="p-3 rounded bg-red-500/[0.03] border border-red-500/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-red-400 font-medium">
                      崩壊理由（なぜ今死んでいるか）:
                    </div>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {alert.failureReason}
                    </p>
                  </div>

                  {/* 回避して勝つための構造的抜け道 */}
                  <div className="p-3 rounded bg-emerald-500/[0.03] border border-emerald-500/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-emerald-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      回避して勝つための構造的抜け道:
                    </div>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed font-medium">
                      {alert.alternativePlay}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* セクション C: 急激に膨らむ「痛みの財布」ヒートマップ */}
        {(filter === 'ALL' || filter === 'PAIN_WALLET') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  PAIN WALLET HEATMAP（人間が理性を失って即決する痛みの財布）
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                今夜突くべき高単価需要
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PAIN_WALLET_HEATMAPS.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-lg bg-[#08090C] border border-white/[0.08] hover:border-sky-500/30 transition-all space-y-3.5 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-500">
                        {item.sector}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.urgencyLevel === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        切迫度: {item.urgencyLevel}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-zinc-500">人質ターゲット:</div>
                      <div className="text-xs font-bold text-white font-sans mt-0.5">
                        {item.targetPersona}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500">痛みのトリガー:</div>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                        {item.painTrigger}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] space-y-1">
                    <div className="text-[10px] font-mono text-sky-400">即決予算行動:</div>
                    <p className="text-xs text-zinc-200 font-sans font-medium leading-relaxed">
                      {item.budgetBehavior}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

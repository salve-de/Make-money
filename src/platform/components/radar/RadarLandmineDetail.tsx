'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import type { MarketRadarLandmineItem } from '@/platform/data/marketRadarData';

interface RadarLandmineDetailProps {
  landmine: MarketRadarLandmineItem;
}

export const RadarLandmineDetail: React.FC<RadarLandmineDetailProps> = ({ landmine }) => {
  return (
    <div className="space-y-6">
      {/* タイトル＆危険度ヘッダー */}
      <div className="p-5 rounded-xl bg-gradient-to-b from-[#180A0D] to-[#0D080A] border border-rose-500/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {landmine.badge}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600/30 text-rose-200 border border-rose-500/40">
              {landmine.fatalityRate}
            </span>
          </div>
          <div className="text-xs font-mono text-rose-400 font-bold">
            危険度スコア: {landmine.burnRiskScore}/100
          </div>
        </div>

        <h1 className="text-lg sm:text-2xl font-bold text-rose-100 tracking-tight">
          {landmine.title}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {landmine.subtitle}
        </p>

        <div className="pt-3 border-t border-rose-900/40 flex items-center justify-between text-xs font-mono text-rose-300/80">
          <span>分類: {landmine.fatalCategory}</span>
          <span>参入禁止判定: <strong>即死リスク極大</strong></span>
        </div>
      </div>

      {/* 死因のメカニズム */}
      <div className="p-5 rounded-lg bg-[#14080B] border border-rose-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>死因の解剖: {landmine.deadlyReason.heading}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          {landmine.deadlyReason.mechanism}
        </p>

        {/* 致死指標メトリクス */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {landmine.deadlyReason.fatalMetrics.map((metric, idx) => (
            <div key={idx} className="p-3 rounded bg-black/60 border border-rose-900/40 font-mono text-xs">
              <div className="text-[10px] text-zinc-400">{metric.label}</div>
              <div className="text-base font-bold text-rose-400 mt-1">{metric.value}</div>
              <div className="text-[11px] text-rose-300/70 mt-1 leading-tight">{metric.warning}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 爆死事例（墓碑銘） ＆ 生存ピボット */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 爆死事例 */}
        <div className="p-5 rounded-lg bg-[#0F080A] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 border-b border-white/[0.06] pb-2">
            <Ban className="w-4 h-4 text-rose-400" />
            <span>実際に爆死した企業の実例（墓碑銘）</span>
          </div>

          <div className="space-y-3">
            {landmine.graveyardExamples.map((ex, idx) => (
              <div key={idx} className="p-3 rounded bg-black/40 border border-rose-950/40 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-zinc-200 font-bold">
                  <span>{ex.name}</span>
                  <span className="text-rose-400 text-[10px]">{ex.raisedOrLost}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  死因: {ex.deathTrigger}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 生存・回避ピボット */}
        <div className="p-5 rounded-lg bg-[#0B0D13] border border-emerald-500/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 border-b border-emerald-500/20 pb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>もしやるならどう避けるべきか（生存の隙間）</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
              <span className="font-bold text-rose-400 block mb-1">【絶対にやるな】</span>
              {landmine.survivalWedge.whatToAvoid}
            </div>

            <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
              <span className="font-bold text-emerald-400 block mb-1">【唯一の生き残りピボット】</span>
              {landmine.survivalWedge.howToPivotOrSurvive}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

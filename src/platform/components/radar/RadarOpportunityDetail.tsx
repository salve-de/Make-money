'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Wrench,
  Zap,
  Target,
  ShieldAlert,
} from 'lucide-react';
import type { MarketRadarTrendItem } from '@/platform/data/marketRadarData';
import { projectRadarPlayerProfit } from '@/platform/model/radar-profit-display';

interface RadarOpportunityDetailProps {
  trend: MarketRadarTrendItem;
  copiedKey: string | null;
  handleCopy: (text: string, key: string) => void;
  onSelectEntity?: (entityId: string) => void;
}

export const RadarOpportunityDetail: React.FC<RadarOpportunityDetailProps> = ({
  trend,
  copiedKey,
  handleCopy,
  onSelectEntity,
}) => {
  const playerProfit = projectRadarPlayerProfit(trend);

  return (
    <div className="space-y-6">
      {/* タイトル＆キーメトリクスヘッダー */}
      <div className="p-5 rounded-xl bg-gradient-to-b from-[#0D1518] to-[#080B10] border border-emerald-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {trend.badge}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              成長率 {trend.growthRate}
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            熱狂スコア: <strong className="text-cyan-400">{trend.heatScore}/100</strong>
          </div>
        </div>

        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
          {trend.title}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {trend.subtitle}
        </p>

        <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div>
            <span className="text-zinc-500">想定手残り月利: </span>
            <strong className="text-emerald-400 font-bold text-sm ml-1">
              {trend.estimatedMonthlyProfit}
            </strong>
          </div>
          <div>
            <span className="text-zinc-500">初期実行難易度: </span>
            <strong className="text-cyan-300 ml-1">
              {trend.difficulty === 'EASY' ? '低（即日着手可）' : '中（要設定）'}
            </strong>
          </div>
        </div>
      </div>

      {/* 第1段：マクロの力学とサバンナ急所 */}
      <div className="p-5 rounded-lg bg-[#0A0D14] border border-cyan-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 font-mono">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>TIER 1 // {trend.macroContext.heading}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          {trend.macroContext.whyNow}
        </p>

        <div className="p-3 rounded bg-black/50 border border-white/[0.05] flex items-start gap-2.5 text-xs text-zinc-300">
          <Target className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-rose-300 font-bold font-mono">狙う痛みの財布（サバンナOS急所）: </span>
            <span className="text-zinc-200">{trend.macroContext.targetPainWallet}</span>
          </div>
        </div>
      </div>

      {/* 第2段：大手の死角 ＆ 実証勝者データ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 大手の自爆構造 */}
        <div className="p-5 rounded-lg bg-[#0F0A0D] border border-rose-500/25 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              <span>大手の自爆（カニバリズムの死角）</span>
            </div>
            <span className="text-[10px] font-mono bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
              大手は追随不能
            </span>
          </div>

          <div className="text-xs text-zinc-300 space-y-2.5">
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">標的となる大手:</span>
              <strong className="text-white text-sm">{trend.gapAndProof.incumbentGap.incumbentName}</strong>
            </div>
            <p className="leading-relaxed text-zinc-400">
              {trend.gapAndProof.incumbentGap.fatalDilemma}
            </p>
            <div className="text-[11px] font-mono text-rose-300/90 bg-rose-950/30 p-2.5 rounded border border-rose-900/40">
              <span className="text-zinc-500 block mb-0.5">大手の高額相場:</span>
              <strong>{trend.gapAndProof.incumbentGap.incumbentPricing}</strong>
            </div>
          </div>
        </div>

        {/* 実証勝者データ */}
        <div className="p-5 rounded-lg bg-[#080E0C] border border-emerald-500/25 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>実証勝者（普通の奴が勝てた証拠）</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              粗利 {trend.gapAndProof.provenPlayer.grossMargin}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {trend.gapAndProof.provenPlayer.name}
              </span>
              {trend.gapAndProof.provenPlayer.entityId && (
                onSelectEntity ? (
                  <button
                    onClick={() => onSelectEntity(trend.gapAndProof.provenPlayer.entityId!)}
                    className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>個別台帳カルテを見る</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <Link
                    href={`/case/${trend.gapAndProof.provenPlayer.entityId}`}
                    className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>個別台帳カルテを見る</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded bg-black/40 border border-white/[0.05] text-center font-mono text-xs">
              <div>
                <div className="text-[10px] text-zinc-500">組織規模</div>
                <div className="font-bold text-zinc-200 mt-0.5">{trend.gapAndProof.provenPlayer.teamSize}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                  <span>{playerProfit.label}</span>
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1 text-[8px] text-amber-300">
                    {playerProfit.badge}
                  </span>
                </div>
                <div className="font-bold text-emerald-400 mt-0.5">{playerProfit.value}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">初期回収</div>
                <div className="font-bold text-cyan-400 mt-0.5">{trend.gapAndProof.provenPlayer.paybackDays}</div>
              </div>
            </div>

            <p className="text-[10px] font-mono text-amber-200/80 leading-relaxed">
              {playerProfit.basis}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {trend.gapAndProof.provenPlayer.proofSnippet}
            </p>
          </div>
        </div>
      </div>

      {/* 第3段：参入アクション攻略本 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
            <Wrench className="w-4 h-4" />
            <span>TIER 3 // 参入アクション攻略本（今夜使えるカンニングペーパー）</span>
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            努力不要・即日実行可能
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 参入切り口 */}
          <div className="p-5 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">
                01. 参入の切り口（アンバンドル・横展開）
              </span>
              <button
                onClick={() => handleCopy(trend.actionablePlaybook.unbundlingAngle, 'angle')}
                className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                title="切り口をコピー"
              >
                {copiedKey === 'angle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {trend.actionablePlaybook.unbundlingAngle}
            </p>
            <div className="mt-3 p-3 rounded bg-black/40 border border-white/[0.04] text-xs text-cyan-300 font-mono">
              <span className="text-zinc-500 block mb-1">おすすめの課金設定（前金総取り）: </span>
              <strong className="text-cyan-400 block">
                {trend.actionablePlaybook.pricingRecommendation}
              </strong>
            </div>
          </div>

          {/* 初動の10人獲得ログ */}
          <div className="p-5 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">
                02. 初動の1人目・10人獲得ログ（実録DM・手口）
              </span>
              <button
                onClick={() => handleCopy(trend.actionablePlaybook.first10CustomersLog, 'traction')}
                className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                title="獲得手口をコピー"
              >
                {copiedKey === 'traction' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-3.5 rounded bg-black/50 border border-white/[0.04] text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {trend.actionablePlaybook.first10CustomersLog}
            </div>
          </div>
        </div>

        {/* 3ツール道具箱 ＆ 地雷警告 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 道具箱 */}
          <div className="p-5 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono font-bold text-zinc-300">
                03. 稼働道具箱（何を使って動かすか）
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {trend.actionablePlaybook.totalMonthlyCost}
              </span>
            </div>

            <div className="space-y-2">
              {trend.actionablePlaybook.threeToolStack.map((tool, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-black/40 border border-white/[0.04] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <strong className="text-white mr-2">{tool.name}</strong>
                    <span className="text-zinc-500 text-[11px]">{tool.role}</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] shrink-0 ml-2">{tool.cost}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 即死トラップ */}
          <div className="p-5 rounded-lg bg-[#110A0C] border border-rose-900/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 border-b border-rose-900/30 pb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>04. 即死トラップ警告（やってはいけない地雷）</span>
            </div>

            <div className="p-3.5 rounded bg-black/40 border border-rose-900/30 text-xs text-rose-200 leading-relaxed font-mono">
              {trend.actionablePlaybook.fatalPitfalls}
            </div>

            <p className="text-[10px] font-mono text-zinc-500">
              ※ 過去の失敗企業データから逆算された物理的死亡回避ルール
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
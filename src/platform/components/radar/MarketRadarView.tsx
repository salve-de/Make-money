'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MARKET_RADAR_TRENDS } from '@/platform/data/marketRadarData';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Wrench,
  Zap,
  Target,
  ShieldAlert
} from 'lucide-react';

interface MarketRadarViewProps {
  onSelectEntity?: (entityId: string) => void;
}

export const MarketRadarView: React.FC<MarketRadarViewProps> = ({ onSelectEntity }) => {
  const [selectedTrendId, setSelectedTrendId] = useState<string>(MARKET_RADAR_TRENDS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTrend = useMemo(() => {
    return MARKET_RADAR_TRENDS.find((t) => t.id === selectedTrendId) || MARKET_RADAR_TRENDS[0];
  }, [selectedTrendId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060709] text-zinc-100 overflow-y-auto font-sans select-none">
      {/* ─── 1. 最上部ヘッダー ─── */}
      <header className="border-b border-white/[0.06] bg-[#090A0F] px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MARKET ANOMALY & RADAR // 3-TIER ACTION PIPELINE</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
              市場傾向 ＆ 未開拓マネー攻略レーダー
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              個別企業の辞書ではなく、「いま水面下で何が爆発し、今夜どう動いて現金を抜くか」を3段ピラミッドで直結表示
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

      {/* ─── 2. コンテンツ領域 ─── */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">

        {/* ═══════════════════════════════════════════════════════════════════
            【第1段：マクロ・レーダー】いま水面下で何が爆発しているか
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 tracking-wider">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>TIER 1 // マクロ・レーダー（急上昇市場の選択）</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              検知済み特異点: {MARKET_RADAR_TRENDS.length}件
            </span>
          </div>

          {/* 3大トレンドカードの水平グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MARKET_RADAR_TRENDS.map((trend) => {
              const isSelected = trend.id === selectedTrendId;
              return (
                <button
                  key={trend.id}
                  onClick={() => setSelectedTrendId(trend.id)}
                  className={`text-left p-4 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-white/[0.08] to-[#0D1017] border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-[#090B10] border-white/[0.06] hover:border-white/[0.15] hover:bg-[#0D1017]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                        {trend.badge}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        {trend.growthRate}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {trend.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {trend.subtitle}
                    </p>
                  </div>

                  {/* スパークライン簡易可視化 */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-end gap-1 h-5">
                      {trend.sparklineData.map((val, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${(val / 100) * 100}%` }}
                          className={`w-1.5 rounded-t ${isSelected ? 'bg-cyan-400' : 'bg-zinc-600'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      熱狂指数: <strong className="text-white font-bold">{trend.heatScore}</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 選択されたトレンドの「なぜ今起きているか」バナー */}
        <div className="bg-[#0B0E14] border border-cyan-500/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>{activeTrend.macroContext.heading}</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-4xl">
              {activeTrend.macroContext.whyNow}
            </p>
          </div>
          <div className="shrink-0 bg-white/[0.04] px-3 py-2 rounded border border-white/[0.08] max-w-xs">
            <span className="text-[10px] font-mono text-zinc-400 block mb-0.5">狙う痛みの財布:</span>
            <p className="text-[11px] text-zinc-200 font-medium leading-snug">
              {activeTrend.macroContext.targetPainWallet}
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            【第2段：大手の死角 ＆ 実証勝者】左右スプリットビュー
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 tracking-wider">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>TIER 2 // 大手の死角 ＆ 実証勝者データ（左右対照レントゲン）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左カラム：大手の自爆構造（Incumbent Gap） */}
            <div className="bg-[#0A0D14] border border-rose-500/25 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>大手の自爆（カニバリズムの死角）</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                  追随不能
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-400 font-mono">
                  標的となる大手: <strong className="text-white">{activeTrend.gapAndProof.incumbentGap.incumbentName}</strong>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {activeTrend.gapAndProof.incumbentGap.fatalDilemma}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-zinc-500 block">大手の高額相場:</span>
                  <span className="text-xs font-mono text-rose-300 font-bold">
                    {activeTrend.gapAndProof.incumbentGap.incumbentPricing}
                  </span>
                </div>
              </div>
            </div>

            {/* 右カラム：実証勝者（Proven Player） */}
            <div className="bg-[#0A0D14] border border-emerald-500/25 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>実証勝者（普通の奴が勝てた証拠）</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  粗利 {activeTrend.gapAndProof.provenPlayer.grossMargin}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">
                    {activeTrend.gapAndProof.provenPlayer.name}
                  </div>
                  {activeTrend.gapAndProof.provenPlayer.entityId && onSelectEntity && (
                    <button
                      onClick={() => onSelectEntity(activeTrend.gapAndProof.provenPlayer.entityId!)}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>個別台帳カルテを見る</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 勝者の冷徹な数字メトリクス */}
                <div className="grid grid-cols-3 gap-2 bg-[#06080D] p-2.5 rounded border border-white/[0.06] text-center">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block">組織規模</span>
                    <strong className="text-xs font-mono text-zinc-200">
                      {activeTrend.gapAndProof.provenPlayer.teamSize}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block">月利実額</span>
                    <strong className="text-xs font-mono text-emerald-400 font-bold">
                      {activeTrend.gapAndProof.provenPlayer.monthlyProfit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block">初期回収</span>
                    <strong className="text-xs font-mono text-cyan-300">
                      {activeTrend.gapAndProof.provenPlayer.paybackDays}
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {activeTrend.gapAndProof.provenPlayer.proofSnippet}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            【第3段：参入アクション攻略本】今夜から動かせるパイプライン
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 tracking-wider">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>TIER 3 // 参入アクション攻略本（今夜使えるカンニングペーパー）</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              努力不要・即日実行可能
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. 参入の切り口 ＆ 推奨価格 */}
            <div className="bg-[#090C12] border border-white/[0.08] rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-xs font-mono font-bold text-zinc-200">
                  01. 参入の切り口（アンバンドル・横展開）
                </span>
                <button
                  onClick={() => handleCopy(activeTrend.actionablePlaybook.unbundlingAngle, 'unbundle')}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="コピー"
                >
                  {copiedKey === 'unbundle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeTrend.actionablePlaybook.unbundlingAngle}
              </p>
              <div className="p-3 bg-white/[0.03] rounded border border-white/[0.06] space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 block">おすすめの課金設定（前金総取り）:</span>
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {activeTrend.actionablePlaybook.pricingRecommendation}
                </span>
              </div>
            </div>

            {/* 2. 初動の10人目獲得ログ */}
            <div className="bg-[#090C12] border border-white/[0.08] rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-xs font-mono font-bold text-zinc-200">
                  02. 初動の1人目・10人目獲得ログ（実録DM・手口）
                </span>
                <button
                  onClick={() => handleCopy(activeTrend.actionablePlaybook.first10CustomersLog, 'first10')}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="コピー"
                >
                  {copiedKey === 'first10' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-[#06080D] p-3 rounded border border-white/[0.06]">
                {activeTrend.actionablePlaybook.first10CustomersLog}
              </p>
            </div>

            {/* 3. 稼働道具箱（3ツール構成 ＆ 実費） */}
            <div className="bg-[#090C12] border border-white/[0.08] rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-xs font-mono font-bold text-zinc-200">
                  03. 稼働道具箱（何を使って動かすか）
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {activeTrend.actionablePlaybook.totalMonthlyCost}
                </span>
              </div>
              <div className="space-y-2">
                {activeTrend.actionablePlaybook.threeToolStack.map((tool, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04] text-xs"
                  >
                    <div>
                      <strong className="text-zinc-200 font-mono mr-2">{tool.name}</strong>
                      <span className="text-[11px] text-zinc-400">{tool.role}</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-300 shrink-0 ml-2">
                      {tool.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. 即死トラップ警告（地雷） */}
            <div className="bg-[#090C12] border border-rose-500/20 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>04. 即死トラップ警告（やってはいけない地雷）</span>
                </div>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed p-3 bg-rose-950/20 rounded border border-rose-900/30">
                {activeTrend.actionablePlaybook.fatalPitfalls}
              </p>
              <div className="text-[10px] font-mono text-zinc-500">
                ※ 過去の失敗企業データ（Quibi、Hopin等）から逆算された物理的死亡回避ルール
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MARKET_RADAR_TRENDS,
  MARKET_RADAR_LANDMINES,
} from '@/platform/data/marketRadarData';
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
  Flame,
  Skull,
  ArrowLeft,
  Ban,
  ArrowRight
} from 'lucide-react';

interface RadarItemDetailViewProps {
  id: string;
  onSelectEntity?: (entityId: string) => void;
}

export const RadarItemDetailView: React.FC<RadarItemDetailViewProps> = ({ id, onSelectEntity }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const trend = useMemo(() => MARKET_RADAR_TRENDS.find((t) => t.id === id), [id]);
  const landmine = useMemo(() => MARKET_RADAR_LANDMINES.find((l) => l.id === id), [id]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 404フォールバック
  if (!trend && !landmine) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#060709] text-zinc-300">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">指定されたレーダー項目が見つかりません</h2>
        <p className="text-xs text-zinc-500 mb-6 font-mono">ID: {id}</p>
        <Link
          href="/radar"
          className="px-4 py-2 rounded bg-white/[0.1] hover:bg-white/[0.15] text-xs font-mono text-white border border-white/[0.1] transition-colors"
        >
          ← 市場レーダー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060709] text-zinc-100 overflow-y-auto font-sans select-none">
      {/* ─── 最上部ナビゲーションヘッダー ─── */}
      <header className="border-b border-white/[0.06] bg-[#090A0F] px-4 sm:px-6 py-3.5 shrink-0 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/radar"
              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.12] text-xs font-mono text-zinc-200 border border-white/[0.1] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>一覧に戻る</span>
            </Link>

            <span className="text-zinc-600 font-mono text-xs">/</span>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              {trend ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">{trend.categoryLabel}</span>
                </>
              ) : (
                <>
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300 font-semibold">{landmine?.fatalCategory}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              全銘柄台帳 →
            </Link>
          </div>
        </div>
      </header>

      {/* ─── メイン詳細コンテンツ ─── */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        
        {/* ═══════════════════════════════════════════════════════════════════
            【A】チャンス詳細ビュー（3段ピラミッド完全攻略本）
           ═══════════════════════════════════════════════════════════════════ */}
        {trend && (
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
                      <div className="text-[10px] text-zinc-500">月利実額</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{trend.gapAndProof.provenPlayer.monthlyProfit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">初期回収</div>
                      <div className="font-bold text-cyan-400 mt-0.5">{trend.gapAndProof.provenPlayer.paybackDays}</div>
                    </div>
                  </div>

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
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【B】地雷詳細ビュー（検死解剖書 ＆ 回避・生存ウェッジ）
           ═══════════════════════════════════════════════════════════════════ */}
        {landmine && (
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
        )}

        {/* ─── 画面下部：他の項目へのリンクバー ─── */}
        <div className="pt-6 border-t border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>他のレーダー項目を探索:</span>
            <Link href="/radar" className="text-cyan-400 hover:underline flex items-center gap-1">
              <span>全項目一覧へ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {MARKET_RADAR_TRENDS.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/radar/${t.id}`}
                className={`p-2.5 rounded border text-left transition-colors truncate block ${
                  t.id === id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-black/30 border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-[9px] text-zinc-500 truncate">{t.badge}</div>
                <div className="truncate text-[11px] mt-0.5">{t.title}</div>
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

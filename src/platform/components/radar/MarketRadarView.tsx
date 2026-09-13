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
  TrendingUp,
  Activity,
  Ban
} from 'lucide-react';

interface MarketRadarViewProps {
  onSelectEntity?: (entityId: string) => void;
}

type ViewMode = 'OPPORTUNITIES' | 'LANDMINES' | 'DUAL';

export const MarketRadarView: React.FC<MarketRadarViewProps> = ({ onSelectEntity }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('DUAL');
  const [selectedCategory, setSelectedCategory] = useState<RadarCategory>('ALL');
  const [selectedTrendId, setSelectedTrendId] = useState<string>(MARKET_RADAR_TRENDS[0].id);
  const [selectedLandmineId, setSelectedLandmineId] = useState<string>(MARKET_RADAR_LANDMINES[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // フィルタリングされたチャンス一覧
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'ALL') return MARKET_RADAR_TRENDS;
    return MARKET_RADAR_TRENDS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  // 選択中のチャンスアイテム
  const activeTrend = useMemo(() => {
    return MARKET_RADAR_TRENDS.find((t) => t.id === selectedTrendId) || MARKET_RADAR_TRENDS[0];
  }, [selectedTrendId]);

  // 選択中の地雷アイテム
  const activeLandmine = useMemo(() => {
    return MARKET_RADAR_LANDMINES.find((l) => l.id === selectedLandmineId) || MARKET_RADAR_LANDMINES[0];
  }, [selectedLandmineId]);

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
                表示中: {filteredTrends.length}件 / 全{MARKET_RADAR_TRENDS.length}件
              </span>
            </div>

            {/* チャンスカードの複数グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredTrends.map((trend) => {
                const isSelected = trend.id === selectedTrendId;
                return (
                  <button
                    key={trend.id}
                    onClick={() => {
                      setSelectedTrendId(trend.id);
                    }}
                    className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-b from-emerald-500/10 to-[#0D1418] border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-[#090B10] border-white/[0.06] hover:border-white/[0.18] hover:bg-[#0D1017]'
                    }`}
                  >
                    <div className="space-y-2">
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

                      <h3 className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {trend.title}
                      </h3>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {trend.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">
                        {trend.estimatedMonthlyProfit}
                      </span>
                      <span className="text-zinc-500 group-hover:text-zinc-300 flex items-center gap-0.5">
                        {isSelected ? '選択中' : '攻略本を見る'} →
                      </span>
                    </div>
                  </button>
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
                全{MARKET_RADAR_LANDMINES.length}領域（死亡率85%〜95%）
              </span>
            </div>

            {/* 地雷カードの複数グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {MARKET_RADAR_LANDMINES.map((mine) => {
                const isSelected = mine.id === selectedLandmineId;
                return (
                  <button
                    key={mine.id}
                    onClick={() => {
                      setSelectedLandmineId(mine.id);
                    }}
                    className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-b from-rose-500/10 to-[#180D10] border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
                        : 'bg-[#0E080A] border-rose-950/40 hover:border-rose-800/60 hover:bg-[#140A0D]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {mine.badge}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                          {mine.fatalityRate}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-rose-100 leading-snug line-clamp-2 group-hover:text-rose-300 transition-colors">
                        {mine.title}
                      </h3>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {mine.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-rose-900/30 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-rose-400 font-bold">
                        危険度: {mine.burnRiskScore}/100
                      </span>
                      <span className="text-zinc-500 group-hover:text-rose-300 flex items-center gap-0.5">
                        {isSelected ? '検死中' : '死因解剖'} →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【深掘りパネル 1】選択されたチャンスの「3段ピラミッド完全攻略本」
           ═══════════════════════════════════════════════════════════════════ */}
        {viewMode !== 'LANDMINES' && (
          <div className="space-y-6 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>選択中トレンドの深掘り攻略本:</span>
                <span className="text-emerald-400">{activeTrend.title}</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                想定手残り: <strong className="text-white">{activeTrend.estimatedMonthlyProfit}</strong>
              </span>
            </div>

            {/* 第1段：マクロの潮目とサバンナOS急所 */}
            <div className="p-4 rounded-lg bg-[#0A0D14] border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{activeTrend.macroContext.heading}</span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                  熱狂スコア: {activeTrend.heatScore}/100
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeTrend.macroContext.whyNow}
              </p>

              <div className="p-2.5 rounded bg-black/40 border border-white/[0.05] flex items-start gap-2 text-xs text-zinc-400">
                <Target className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-200 font-medium">狙う痛みの財布: </span>
                  <span>{activeTrend.macroContext.targetPainWallet}</span>
                </div>
              </div>
            </div>

            {/* 第2段：大手の死角 ＆ 実証勝者データ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 大手の自爆構造 */}
              <div className="p-4 rounded-lg bg-[#0F0A0D] border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>大手の自爆（カニバリズムの死角）</span>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20">
                    大手は追随不能
                  </span>
                </div>

                <div className="text-xs text-zinc-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-[11px]">標的となる大手:</span>
                    <span className="font-semibold text-white">{activeTrend.gapAndProof.incumbentGap.incumbentName}</span>
                  </div>
                  <p className="leading-relaxed text-zinc-400">
                    {activeTrend.gapAndProof.incumbentGap.fatalDilemma}
                  </p>
                  <div className="text-[11px] font-mono text-rose-300/80 bg-rose-950/20 p-2 rounded border border-rose-900/30">
                    大手の高額相場: {activeTrend.gapAndProof.incumbentGap.incumbentPricing}
                  </div>
                </div>
              </div>

              {/* 実証勝者データ */}
              <div className="p-4 rounded-lg bg-[#080E0C] border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>実証勝者（普通の奴が勝てた証拠）</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                    粗利 {activeTrend.gapAndProof.provenPlayer.grossMargin}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {activeTrend.gapAndProof.provenPlayer.name}
                    </span>
                    {activeTrend.gapAndProof.provenPlayer.entityId && (
                      onSelectEntity ? (
                        <button
                          onClick={() => onSelectEntity(activeTrend.gapAndProof.provenPlayer.entityId!)}
                          className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>個別台帳カルテを見る</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <Link
                          href={`/case/${activeTrend.gapAndProof.provenPlayer.entityId}`}
                          className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>個別台帳カルテを見る</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded bg-black/30 border border-white/[0.04] text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-500">組織規模</div>
                      <div className="font-bold text-zinc-200 mt-0.5">{activeTrend.gapAndProof.provenPlayer.teamSize}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">月利実額</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{activeTrend.gapAndProof.provenPlayer.monthlyProfit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">初期回収</div>
                      <div className="font-bold text-cyan-400 mt-0.5">{activeTrend.gapAndProof.provenPlayer.paybackDays}</div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {activeTrend.gapAndProof.provenPlayer.proofSnippet}
                  </p>
                </div>
              </div>
            </div>

            {/* 第3段：参入アクション攻略本 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>参入アクション攻略本（今夜使えるカンニングペーパー）</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  努力不要・即日実行可能
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 参入切り口 */}
                <div className="p-4 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      01. 参入の切り口（アンバンドル・横展開）
                    </span>
                    <button
                      onClick={() => handleCopy(activeTrend.actionablePlaybook.unbundlingAngle, 'angle')}
                      className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                      title="切り口をコピー"
                    >
                      {copiedKey === 'angle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeTrend.actionablePlaybook.unbundlingAngle}
                  </p>
                  <div className="mt-3 p-2.5 rounded bg-black/40 border border-white/[0.04] text-[11px] text-cyan-300 font-mono">
                    <span className="text-zinc-500">おすすめの課金設定（前金総取り）: </span>
                    <div className="mt-1 font-bold text-cyan-400">
                      {activeTrend.actionablePlaybook.pricingRecommendation}
                    </div>
                  </div>
                </div>

                {/* 初動の10人獲得ログ */}
                <div className="p-4 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      02. 初動の1人目・10人獲得ログ（実録DM・手口）
                    </span>
                    <button
                      onClick={() => handleCopy(activeTrend.actionablePlaybook.first10CustomersLog, 'traction')}
                      className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                      title="獲得手口をコピー"
                    >
                      {copiedKey === 'traction' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3 rounded bg-black/50 border border-white/[0.04] text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {activeTrend.actionablePlaybook.first10CustomersLog}
                  </div>
                </div>
              </div>

              {/* 3ツール道具箱 ＆ 地雷警告 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 道具箱 */}
                <div className="p-4 rounded-lg bg-[#0B0D13] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      03. 稼働道具箱（何を使って動かすか）
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {activeTrend.actionablePlaybook.totalMonthlyCost}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeTrend.actionablePlaybook.threeToolStack.map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-black/40 border border-white/[0.04] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{tool.name}</span>
                          <span className="text-zinc-500 text-[11px]">{tool.role}</span>
                        </div>
                        <span className="text-zinc-400 text-[11px]">{tool.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 即死トラップ */}
                <div className="p-4 rounded-lg bg-[#110A0C] border border-rose-900/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>04. 即死トラップ警告（やってはいけない地雷）</span>
                  </div>

                  <div className="p-3 rounded bg-black/40 border border-rose-900/30 text-xs text-rose-200/90 leading-relaxed font-mono">
                    {activeTrend.actionablePlaybook.fatalPitfalls}
                  </div>

                  <p className="text-[10px] font-mono text-zinc-500">
                    ※ 過去の失敗企業データ（Quibi、HopIn等）から逆算された物理的死亡回避ルール
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【深掘りパネル 2】選択された地雷領域の「検死解剖カルテ ＆ 回避指針」
           ═══════════════════════════════════════════════════════════════════ */}
        {viewMode !== 'OPPORTUNITIES' && (
          <div className="space-y-6 pt-2 border-t border-rose-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
                <Skull className="w-4 h-4 text-rose-400" />
                <span>選択中地雷の検死解剖書:</span>
                <span className="text-rose-400">{activeLandmine.title}</span>
              </div>
              <span className="text-[11px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {activeLandmine.fatalityRate} / 危険度 {activeLandmine.burnRiskScore}/100
              </span>
            </div>

            {/* 死因のメカニズム */}
            <div className="p-4 rounded-lg bg-[#14080B] border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>死因の解剖: {activeLandmine.deadlyReason.heading}</span>
                </div>
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded border border-rose-500/30">
                  {activeLandmine.fatalCategory}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeLandmine.deadlyReason.mechanism}
              </p>

              {/* 致死指標メトリクス */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {activeLandmine.deadlyReason.fatalMetrics.map((metric, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-black/50 border border-rose-900/40 font-mono text-xs">
                    <div className="text-[10px] text-zinc-400">{metric.label}</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">{metric.value}</div>
                    <div className="text-[10px] text-rose-300/70 mt-1 leading-tight">{metric.warning}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 実際の爆死事例（墓碑銘） ＆ 回避・生存ウェッジ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 爆死事例 */}
              <div className="p-4 rounded-lg bg-[#0F080A] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>実際に爆死した企業の実例（墓碑銘）</span>
                </div>

                <div className="space-y-2.5">
                  {activeLandmine.graveyardExamples.map((ex, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-black/40 border border-rose-950/40 text-xs font-mono space-y-1">
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

              {/* 回避・生存ウェッジ */}
              <div className="p-4 rounded-lg bg-[#0B0D13] border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>もしやるならどう避けるべきか（生存の隙間）</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
                    <span className="font-bold text-rose-400 block mb-1">【絶対にやるな】</span>
                    {activeLandmine.survivalWedge.whatToAvoid}
                  </div>

                  <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                    <span className="font-bold text-emerald-400 block mb-1">【唯一の生き残りピボット】</span>
                    {activeLandmine.survivalWedge.howToPivotOrSurvive}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

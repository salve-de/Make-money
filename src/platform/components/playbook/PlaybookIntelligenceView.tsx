'use client';

import React, { useState, useMemo } from 'react';
import {
  MacroIntelligenceData,
  TOOL_CATEGORIES,
  ToolCategoryKey,
  CategoryTrendRadar,
  ToolTrendItem,
} from '@/lib/intelligence/macro-aggregator';
import {
  Wrench,
  TrendingUp,
  TrendingDown,
  Skull,
  Zap,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Server,
  Database,
  CreditCard,
  Mail,
  Code,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { TradingViewMigrationChart } from '../charts/TradingViewMigrationChart';

export type PlaybookTabKey = 
  | 'TOOL_RADAR' 
  | 'SHELF_LIFE_DOWNGRADES' 
  | 'CURRENT_PLAYS' 
  | 'DIRTY_GENESIS' 
  | 'GOLDEN_RECIPES';

interface PlaybookIntelligenceViewProps {
  data: MacroIntelligenceData;
  onSelectEntity?: (entityId: string) => void;
}

export const PlaybookIntelligenceView: React.FC<PlaybookIntelligenceViewProps> = ({
  data,
  onSelectEntity,
}) => {
  // メインタブ
  const [activeTab, setActiveTab] = useState<PlaybookTabKey>('TOOL_RADAR');

  // 用途別ツール武器庫のサブカテゴリ
  const [selectedToolCategory, setSelectedToolCategory] = useState<ToolCategoryKey>('HOSTING_DEPLOY');

  // 即死パターンの選択
  const [selectedTrapId, setSelectedTrapId] = useState<string>(data.deathTraps[0]?.id || '');

  // 稼ぎの型の選択
  const [selectedWaveId, setSelectedWaveId] = useState<string>(data.currentWaves[0]?.id || '');

  // 現在選択中のカテゴリトレンド
  const activeCategoryRadar = useMemo<CategoryTrendRadar>(() => {
    return data.toolCategoryRadars[selectedToolCategory] || data.toolCategoryRadars.HOSTING_DEPLOY;
  }, [data.toolCategoryRadars, selectedToolCategory]);

  const activeCategoryMeta = useMemo(() => {
    return TOOL_CATEGORIES.find((c) => c.key === selectedToolCategory) || TOOL_CATEGORIES[0];
  }, [selectedToolCategory]);

  // 現在選択中の即死パターン
  const activeTrap = useMemo(() => {
    return data.deathTraps.find((t) => t.id === selectedTrapId) || data.deathTraps[0];
  }, [data.deathTraps, selectedTrapId]);

  // 現在選択中の稼ぎの型
  const activeWave = useMemo(() => {
    return data.currentWaves.find((w) => w.id === selectedWaveId) || data.currentWaves[0];
  }, [data.currentWaves, selectedWaveId]);

  const getCategoryIcon = (key: ToolCategoryKey) => {
    switch (key) {
      case 'HOSTING_DEPLOY':
        return <Server className="w-4 h-4" />;
      case 'AI_ML':
        return <Cpu className="w-4 h-4" />;
      case 'DATABASE_BACKEND':
        return <Database className="w-4 h-4" />;
      case 'PAYMENTS_BILLING':
        return <CreditCard className="w-4 h-4" />;
      case 'MARKETING_CRM':
        return <Mail className="w-4 h-4" />;
      case 'FRONTEND_BUILD':
        return <Code className="w-4 h-4" />;
    }
  };

  // SVG折れ線チャート用のカラーパレット
  const toolLineColors = [
    { stroke: '#22d3ee', fill: 'rgba(34, 211, 238, 0.1)', text: 'text-cyan-400' }, // cyan
    { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.1)', text: 'text-rose-400' }, // rose
    { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)', text: 'text-purple-400' }, // purple
    { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.1)', text: 'text-amber-400' }, // amber
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060709] text-zinc-100 overflow-hidden font-sans select-text">
      {/* ─── 1. 週次資本主義気象レーダーHUD（タイムスタンプ・差分速報） ─── */}
      <header className="border-b border-white/[0.08] bg-[#08090D] px-4 py-2.5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 週次ステータスアンカー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider">
                WEEKLY RADAR / {data.weeklyMeta.weekLabel}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              資本主義の週次動向・気象レーダー
              <span className="text-xs text-zinc-400 font-normal hidden sm:inline font-mono">
                / {data.weeklyMeta.sampleSizeLabel}
              </span>
            </h1>
          </div>

          {/* 直近差分メトリクスストリップ */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-bold">新規観測: +{data.weeklyMeta.newObservationsCount}件</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-300 font-bold">即死降格: {data.weeklyMeta.downgradeAlertsCount}件</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">最多乗り換え流入:</span>
              <span className="text-cyan-400 font-semibold">{data.weeklyMeta.topRisingTool}</span>
            </div>
          </div>
        </div>

        {/* ─── 2. 5大ナレッジ切り替えタブ ─── */}
        <div className="flex items-center gap-1.5 mt-3 border-t border-white/[0.06] pt-2.5 overflow-x-auto scrollbar-none">
          {/* タブ1: ツールの勢力図推移＆乗り換え動向 ★核心 */}
          <button
            onClick={() => setActiveTab('TOOL_RADAR')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'TOOL_RADAR'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>ツール勢力図・乗り換え推移 (Stack Migration)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-400/20 text-cyan-300">
              月次推移チャート
            </span>
          </button>

          {/* タブ2: 賞味期限アラート＆即死検死録 */}
          <button
            onClick={() => setActiveTab('SHELF_LIFE_DOWNGRADES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'SHELF_LIFE_DOWNGRADES'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>賞味期限アラート ＆ 即死検死録 (Downgrades)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-400/20 text-rose-300">
              {data.shelfLifeAlerts.length}件警告
            </span>
          </button>

          {/* タブ3: 現在有効な稼ぎの型 */}
          <button
            onClick={() => setActiveTab('CURRENT_PLAYS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'CURRENT_PLAYS'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>現在有効な稼ぎの型 (Active Plays)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-emerald-400/20 text-emerald-300">
              略奪転用レシピ
            </span>
          </button>

          {/* タブ4: 初動突破ゲリラ戦録 */}
          <button
            onClick={() => setActiveTab('DIRTY_GENESIS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'DIRTY_GENESIS'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>初動突破ゲリラ戦録 (First 100)</span>
          </button>

          {/* タブ5: 黄金スタックレシピ */}
          <button
            onClick={() => setActiveTab('GOLDEN_RECIPES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'GOLDEN_RECIPES'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-purple-400" />
            <span>黄金スタックレシピ (Golden Stack)</span>
          </button>

          <div className="ml-auto shrink-0 pl-2">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition-colors"
            >
              <span>← 個別企業台帳 (Ledger)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 3. コンテンツ本体 ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ═══════════════════════════════════════════════════════════════════
            【タブ1】ツール勢力図・乗り換え推移 (TOOL_RADAR) ★大絶賛の核心
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'TOOL_RADAR' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* 武器庫イントロダクション */}
            <div className="bg-[#090A0F] border border-white/[0.08] rounded-lg p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Live Tech Stack Migration Radar</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    黒字ソロプレナー・新興企業が「今リアルタイムで何に乗り換えているか」
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    公式PRの宣伝文句を完全排除。実際に利益率70%超を叩き出す123社の公開HTTPヘッダー・DNS・創業者公開ログから機械検出した、真実の勢力図推移。
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md px-4 py-3 shrink-0">
                  <div className="text-[11px] text-zinc-400 font-mono">観測標本（高収益・黒字企業）</div>
                  <div className="text-lg font-mono font-bold text-cyan-400">123社 ヘッダー検証済</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">※全ネットの死にサイト集計を排除</div>
                </div>
              </div>

              {/* 6大用途別サブタブ切り替えバー */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 border-t border-white/[0.06] pt-4">
                {TOOL_CATEGORIES.map((cat) => {
                  const isSelected = selectedToolCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedToolCategory(cat.key)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-lg'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className={isSelected ? 'text-cyan-400' : 'text-zinc-500'}>
                          {getCategoryIcon(cat.key)}
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300">
                          {cat.badge}
                        </span>
                      </div>
                      <span className="text-xs font-bold leading-tight line-clamp-1">{cat.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-1">{cat.medianCost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── ★ 直近6ヶ月の採用シェア推移チャート（SVGグラフ） ─── */}
            <div className="bg-[#08090E] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>TradingView Multi-Period Dynamics / 勢力図推移チャート</span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    {activeCategoryMeta.label} における採用シェア推移（2025.10 〜 2026.09）
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
                    ✓ 123社ヘッダー実測
                  </span>
                  <span className="text-zinc-500 text-[11px] hidden sm:inline">
                    期間切替・クロスヘア連動
                  </span>
                </div>
              </div>

              {/* TradingView Lightweight-Charts 描画領域 */}
              <div className="w-full rounded border border-white/[0.06] overflow-hidden bg-[#060709]">
                <TradingViewMigrationChart
                  timeline={activeCategoryRadar.timeline}
                  tools={activeCategoryRadar.tools}
                />
              </div>

              {/* チャート考察サマリー */}
              <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white font-mono mr-1.5">【相場インテリジェンス考察】:</span>
                  <span>{activeCategoryRadar.summaryInsight}</span>
                </div>
              </div>
            </div>

            {/* ─── 各ツールの生々しい乗り換え理由 ＆ 一次証拠カード ─── */}
            <div className="space-y-4">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Primary Evidence / 客観的乗り換え理由と一次証拠</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCategoryRadar.tools.map((tool, idx) => {
                  const color = toolLineColors[idx % toolLineColors.length];
                  return (
                    <div
                      key={tool.name}
                      className="bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.18] rounded-lg p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all"
                    >
                      <div>
                        {/* ヘッダー */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: color.stroke }}
                              />
                              <h4 className="text-base font-bold text-white tracking-tight">{tool.name}</h4>
                            </div>
                            <div className="text-xs text-emerald-400 font-mono font-medium mt-0.5">
                              {tool.estimatedCost}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono font-bold text-white">{tool.currentShare}%</div>
                            <div
                              className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                                tool.deltaShare > 0 ? 'text-emerald-400' : tool.deltaShare < 0 ? 'text-rose-400' : 'text-zinc-400'
                              }`}
                            >
                              {tool.deltaShare > 0 ? <TrendingUp className="w-3 h-3" /> : tool.deltaShare < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              <span>{tool.deltaShare > 0 ? `+${tool.deltaShare}%` : `${tool.deltaShare}%`} (6ヶ月)</span>
                            </div>
                          </div>
                        </div>

                        {/* 検出方法バッジ（客観性の担保） */}
                        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded w-fit mb-3">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{tool.detectionMethod}</span>
                        </div>

                        {/* なぜ乗り換えているのか（合理的理由） */}
                        <div className="space-y-1 mb-3">
                          <div className="text-[11px] font-mono text-cyan-400 font-semibold">【合理的乗り換え理由】</div>
                          <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-2.5 rounded">
                            {tool.whyMigrating}
                          </p>
                        </div>

                        {/* 創業者公開発言・一次証拠 */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-mono text-zinc-400 font-semibold">【創業者公開ログ・一次証拠】</div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-2.5">
                            {tool.proofQuote}
                          </p>
                        </div>
                      </div>

                      {/* 採用している実在企業タグ */}
                      <div className="pt-3 border-t border-white/[0.06]">
                        <div className="text-[10px] font-mono text-zinc-400 mb-1.5">裏付け採用企業（クリックで台帳へ）:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {tool.usedByEntities.map((ent) => (
                            <span
                              key={ent.id}
                              onClick={() => onSelectEntity?.(ent.id)}
                              className="text-[11px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:border-cyan-400/40 cursor-pointer transition-colors"
                            >
                              {ent.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 法的免責・指称的使用声明（Nominative Fair Use） ─── */}
            <div className="mt-8 p-3.5 rounded bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-zinc-400 leading-relaxed">
              <span className="font-bold text-zinc-400 block mb-0.5">【客観的観測データおよび商標に関する免責事項】</span>
              本インテリジェンスは、当端末が独自に観測・公開検証した高収益実在企業（123社）の公開HTTPヘッダー、DNSレコード、および創業者公表データに基づく統計です。各ツールの公式見解や全市場のシェアを示すものではありません。記載されている会社名、製品名、サービス名は各社の商標または登録商標であり、製品・サービスを特定するための必要最小限の言及（指称的使用）として引用しています。
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【タブ2】賞味期限アラート ＆ 即死検死録 (SHELF_LIFE_DOWNGRADES)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'SHELF_LIFE_DOWNGRADES' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* 週次即死アラートバナー */}
            <div className="bg-[#0A0709] border border-rose-500/25 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span>This Week&apos;s Shelf-Life Downgrade Alerts</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                先週まで動いていた手法の「即死判定格下げアラート」
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                「昔稼げた手法」を今やると即座に資金が全焼する。プラットフォーム規約改定やAPI価格破壊により、今週【即死（HISTORICAL_WINDOW）】に落ちた手口のリアルタイム警告。
              </p>
            </div>

            {/* 直近の格下げ警告カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.shelfLifeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-[#09080B] border border-rose-500/30 rounded-lg p-5 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                      {alert.badge} ({alert.downgradeDate})
                    </span>
                    <span className="text-zinc-500">
                      {alert.previousStatus} ➔ <span className="text-rose-400 font-bold">{alert.currentStatus}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{alert.playbookName}</h3>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-rose-400 font-mono font-semibold">【判定降格のトリガー】:</div>
                    <p className="text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-2.5 rounded">
                      {alert.triggerEvent}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-zinc-400 font-mono font-semibold">【死因のメカニズム】:</div>
                    <p className="text-zinc-300 leading-relaxed">{alert.fatalReason}</p>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded text-xs space-y-1">
                    <div className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>【生き残るための方向転換（Pivot）】</span>
                    </div>
                    <p className="text-zinc-200 leading-relaxed">{alert.survivalPivot}</p>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                    犠牲事例: <span className="text-zinc-300">{alert.victimExample}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 恒久的な即死アンチパターン検死録 */}
            <div className="pt-6 border-t border-white/[0.08] space-y-4">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>Historical Post-Mortem Registry / 過去の爆死解剖カルテ</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  {data.deathTraps.map((trap) => {
                    const isSelected = selectedTrapId === trap.id;
                    return (
                      <div
                        key={trap.id}
                        onClick={() => setSelectedTrapId(trap.id)}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg'
                            : 'bg-[#08090D] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span className="text-rose-400 font-bold">{trap.badge}</span>
                          <span className="text-zinc-500">損失: {trap.lossScale.split('/')[0]}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">
                          {trap.title}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{trap.mechanism}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-7">
                  {activeTrap && (
                    <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4 sticky top-4">
                      <div>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {activeTrap.badge}
                        </span>
                        <h3 className="text-lg font-bold text-white tracking-tight mt-2">{activeTrap.title}</h3>
                        <div className="text-xs text-zinc-400 font-mono mt-1">被害規模: {activeTrap.lossScale}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-mono text-zinc-400 font-semibold">【死因解剖メカニズム】</div>
                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded">
                          {activeTrap.mechanism}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-mono text-amber-400 font-semibold">【前兆サイン】</div>
                        <ul className="space-y-1">
                          {activeTrap.warningSigns.map((sign, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-rose-400 font-bold shrink-0">✕</span>
                              <span>{sign}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded text-xs space-y-1">
                        <div className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>【生存の解毒剤】</span>
                        </div>
                        <p className="text-zinc-200 leading-relaxed">{activeTrap.antidote}</p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] space-y-2">
                        <div className="text-[11px] font-mono text-zinc-400">【この罠で爆死した実在企業】:</div>
                        {activeTrap.victimEntities.map((v) => (
                          <div key={v.id} className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-white">
                              <span>{v.name}</span>
                              <span className="text-zinc-500 font-mono">{v.ticker}</span>
                            </div>
                            <div className="text-rose-300 font-semibold text-[11px]">{v.headline}</div>
                            <div className="text-zinc-400 text-[11px]">{v.punchline}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【タブ3】現在有効な稼ぎの型 (CURRENT_PLAYS)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'CURRENT_PLAYS' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-emerald-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Actionable Playbook Directory</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                今リアルタイムで通用している「勝ちパターンの型（Playbook）」
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                現在進行形で月利数百万〜数千万円を抜いている「急所（痛みの財布）」と、今夜別業界で真似して稼ぐ3ステップ略奪転用手順。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-3">
                {data.currentWaves.map((wave) => {
                  const isSelected = selectedWaveId === wave.id;
                  return (
                    <div
                      key={wave.id}
                      onClick={() => setSelectedWaveId(wave.id)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg'
                          : 'bg-[#08090D] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-emerald-400 font-bold">{wave.badge}</span>
                        <span className="text-zinc-500">回収: {wave.paybackDays}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">{wave.title}</h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mb-1.5">
                        <span>月商: 約{(wave.medianRevenueJpy / 10000).toLocaleString()}万円</span>
                        <span>粗利: {wave.marginPercent}%</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2">{wave.targetPainWallet}</p>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-7">
                {activeWave && (
                  <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4 sticky top-4">
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {activeWave.viabilityLabel}
                      </span>
                      <h3 className="text-lg font-bold text-white tracking-tight mt-2">{activeWave.title}</h3>
                      <div className="text-xs text-zinc-400 font-mono mt-1">
                        月商 約{(activeWave.medianRevenueJpy / 10000).toLocaleString()}万円 | 営業利益率 {activeWave.marginPercent}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-mono text-zinc-400 font-semibold">【突いている痛みの財布（サバンナOS）】</div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded">
                        {activeWave.targetPainWallet}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-mono text-cyan-400 font-semibold">【なぜ今勝てるのか】</div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{activeWave.whyItWinsNow}</p>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded text-xs space-y-1">
                      <div className="text-amber-400 font-mono font-bold">【賞味期限・後発参入の冷酷判定】</div>
                      <p className="text-zinc-300 leading-relaxed">{activeWave.shelfLifeAnalysis}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <div className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>【今夜別業界で同じズルを使って稼ぐ3ステップ】</span>
                      </div>
                      <div className="text-xs font-bold text-white">{activeWave.lootBlueprint.headline}</div>
                      <div className="space-y-1.5">
                        {activeWave.lootBlueprint.steps.map((step, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded text-xs text-zinc-200 leading-relaxed">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="text-[11px] font-mono text-zinc-400 mb-1">【裏付け実在企業】:</div>
                      {activeWave.proofEntities.map((ent) => (
                        <div key={ent.id} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded">
                          <span className="font-bold text-white">{ent.name}</span>
                          <span className="text-emerald-400 font-mono">月商 約{(ent.monthlyRevenueJpy / 10000).toLocaleString()}万円</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【タブ4】初動突破ゲリラ戦録 (DIRTY_GENESIS)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'DIRTY_GENESIS' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-amber-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>First 100 Customers Guerrilla Archives</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                泥臭い初期ゲリラ戦録（最初の100人を獲った客観事実ログ）
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                「良い発信をすればファンが増える」という嘘を粉砕。創業者が友人のノートPCを奪い、自虐動画を晒し、断れない完成品を勝手に送りつけた初動突破の真実。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.genesisTactics.map((tactic) => (
                <div
                  key={tactic.id}
                  className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {tactic.categoryLabel}
                      </span>
                      <span className="text-emerald-400 font-semibold">初成約速度: {tactic.speedToFirstCustomer}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight mb-2">{tactic.tacticName}</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded mb-3">
                      {tactic.summary}
                    </p>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono text-zinc-400 font-semibold">【手口と実行手順】</div>
                      {tactic.executionSteps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                          <span className="text-amber-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">実行創業者:</span>
                    <span className="text-zinc-200 font-bold">{tactic.proofEntity.name} ({tactic.proofEntity.founder})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【タブ5】黄金スタックレシピ (GOLDEN_RECIPES)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'GOLDEN_RECIPES' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-purple-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>Battle-Tested Stack Blueprints</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                実証済み「黄金スタック構成レシピ」（組み合わせの極意）
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                ツールの単体比較ではなく、「どう組み合わせれば月額3,500円で年商1億円に耐えられるか」という配管設計図。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {data.goldenStackRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-[#08090D] border border-purple-500/20 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-purple-400 font-semibold">{recipe.targetScale}</span>
                      <span className="text-emerald-400 font-bold">{recipe.marginTarget}</span>
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight mb-2">{recipe.name}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">{recipe.description}</p>

                    <div className="space-y-2 border-t border-white/[0.06] pt-3">
                      <div className="text-[11px] font-mono text-zinc-400 font-semibold mb-1">構成ツール配管:</div>
                      {recipe.tools.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5 rounded font-mono">
                          <span className="text-zinc-500 text-[11px]">{t.category}</span>
                          <span className="text-zinc-200 font-semibold">{t.toolName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-500">想定月額固定費:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{recipe.monthlyFixedCost}</span>
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

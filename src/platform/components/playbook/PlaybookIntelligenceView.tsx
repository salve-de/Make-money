'use client';

import React, { useState, useMemo } from 'react';
import {
  MacroIntelligenceData,
  TOOL_CATEGORIES,
  ToolCategoryKey,
  CategorizedToolItem,
  DeathTrapPattern,
  CurrentPlaybookWave,
  GenesisTacticItem,
  GoldenStackRecipe,
} from '@/lib/intelligence/macro-aggregator';
import {
  ShieldAlert,
  Flame,
  Wrench,
  Zap,
  ArrowRight,
  TrendingUp,
  Skull,
  Coins,
  Cpu,
  Layers,
  Server,
  Database,
  CreditCard,
  Mail,
  Code,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export type PlaybookTabKey = 'DEATH_TRAPS' | 'CURRENT_WAVES' | 'TECH_STACK' | 'DIRTY_GENESIS';

interface PlaybookIntelligenceViewProps {
  data: MacroIntelligenceData;
  onSelectEntity?: (entityId: string) => void;
}

export const PlaybookIntelligenceView: React.FC<PlaybookIntelligenceViewProps> = ({
  data,
  onSelectEntity,
}) => {
  // メインタブ（即死アンチパターン / 今の稼ぎの型 / 用途別・武器庫 / 初動ゲリラ戦録）
  const [activeTab, setActiveTab] = useState<PlaybookTabKey>('TECH_STACK');

  // 用途別ツール武器庫のサブタブ（AI, デプロイ, DB, 決済, CRM, フロント）
  const [selectedToolCategory, setSelectedToolCategory] = useState<ToolCategoryKey>('AI_ML');

  // アンチパターン選択（詳細展開モーダル/ドロワー用）
  const [selectedTrapId, setSelectedTrapId] = useState<string>(data.deathTraps[0]?.id || '');

  // 稼ぎの型選択
  const [selectedWaveId, setSelectedWaveId] = useState<string>(data.currentWaves[0]?.id || '');

  // 現在選択中のアンチパターン
  const activeTrap = useMemo(() => {
    return data.deathTraps.find((t) => t.id === selectedTrapId) || data.deathTraps[0];
  }, [data.deathTraps, selectedTrapId]);

  // 現在選択中の稼ぎの型
  const activeWave = useMemo(() => {
    return data.currentWaves.find((w) => w.id === selectedWaveId) || data.currentWaves[0];
  }, [data.currentWaves, selectedWaveId]);

  // ツールカテゴリのメタ情報
  const activeCategoryMeta = useMemo(() => {
    return TOOL_CATEGORIES.find((c) => c.key === selectedToolCategory) || TOOL_CATEGORIES[0];
  }, [selectedToolCategory]);

  // カテゴリ別のツール一覧
  const currentCategoryTools = data.categorizedTools[selectedToolCategory] || [];

  const getCategoryIcon = (key: ToolCategoryKey) => {
    switch (key) {
      case 'AI_ML':
        return <Cpu className="w-4 h-4" />;
      case 'HOSTING_DEPLOY':
        return <Server className="w-4 h-4" />;
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060709] text-zinc-100 overflow-hidden font-sans select-text">
      {/* ─── 1. 最上部 戦略HUDテレタイプストリップ ─── */}
      <header className="border-b border-white/[0.08] bg-[#08090D] px-4 py-2.5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* タイトルとコンセプト */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-wider uppercase">
                Dynamic Intelligence Playbook
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              資本主義の動的攻略本
              <span className="text-xs text-zinc-400 font-normal hidden sm:inline">
                / 123社の裏帳簿から自動集積した教訓・手口・武器庫
              </span>
            </h1>
          </div>

          {/* リアルタイムマクロ指標ストリップ */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">観測母数:</span>
              <span className="text-zinc-200 font-semibold">{data.metrics.totalEntities}社</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">抽出教訓:</span>
              <span className="text-emerald-400 font-semibold">{data.metrics.totalLessons}件</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">最多採用ツール:</span>
              <span className="text-cyan-400 font-semibold">
                {data.metrics.mostUsedTool} ({data.metrics.mostUsedToolShare}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded shrink-0">
              <span className="text-zinc-500">最頻出死因:</span>
              <span className="text-rose-400 font-semibold">{data.metrics.topFatalPattern}</span>
            </div>
          </div>
        </div>

        {/* ─── 2. 4大ナレッジタブナビゲーション ─── */}
        <div className="flex items-center gap-1.5 mt-3 border-t border-white/[0.06] pt-2.5 overflow-x-auto scrollbar-none">
          {/* タブ3: 用途別・武器庫（ユーザー最重要指定） */}
          <button
            onClick={() => setActiveTab('TECH_STACK')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'TECH_STACK'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            <span>用途別・武器庫 (Tech Stack)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-400/20 text-cyan-300">
              用途別6大分類
            </span>
          </button>

          {/* タブ1: 即死アンチパターン */}
          <button
            onClick={() => setActiveTab('DEATH_TRAPS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'DEATH_TRAPS'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>即死アンチパターン＆検死録 (Do NOT)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-400/20 text-rose-300">
              {data.deathTraps.length}件
            </span>
          </button>

          {/* タブ2: 今の傾向・流行っている稼ぎ方 */}
          <button
            onClick={() => setActiveTab('CURRENT_WAVES')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'CURRENT_WAVES'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>今の傾向・流行っている稼ぎ方 (Plays)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-emerald-400/20 text-emerald-300">
              賞味期限判定済
            </span>
          </button>

          {/* タブ4: 初動ゲリラ戦録 */}
          <button
            onClick={() => setActiveTab('DIRTY_GENESIS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'DIRTY_GENESIS'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>初動ゲリラ戦録 (First 100)</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-400/20 text-amber-300">
              泥臭い突破実録
            </span>
          </button>

          <div className="ml-auto shrink-0 pl-2">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition-colors"
            >
              <span>← 台帳 (Ledger) へ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 3. コンテンツ本体 ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ═══════════════════════════════════════════════════════════════════
            【タブ3】用途別・武器庫 (TECH_STACK) ★ご要望の核心
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'TECH_STACK' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* 武器庫イントロダクション */}
            <div className="bg-[#090A0F] border border-white/[0.08] rounded-lg p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Battle-Tested Tech Stack Directory</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    生存企業が実際に課金している「用途別武器庫」
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    世の受託開発が盛る無駄なインフラ費を粉砕。黒字・利益率70%超を維持する123社が実際に採用しているツールを用途別（タブ）に全解剖。
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md px-4 py-3 shrink-0">
                  <div className="text-[11px] text-zinc-400 font-mono">1人〜少数運営の平均月額固定費</div>
                  <div className="text-xl font-mono font-bold text-emerald-400">¥3,500 〜 ¥25,000</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">※サーバーレス・従量課金の徹底</div>
                </div>
              </div>

              {/* 用途別サブタブ切り替えバー */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 border-t border-white/[0.06] pt-4">
                {TOOL_CATEGORIES.map((cat) => {
                  const isSelected = selectedToolCategory === cat.key;
                  const count = data.categorizedTools[cat.key]?.length || 0;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedToolCategory(cat.key)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-lg'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className={isSelected ? 'text-cyan-400' : 'text-zinc-500'}>
                          {getCategoryIcon(cat.key)}
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300">
                          {count}ツール
                        </span>
                      </div>
                      <span className="text-xs font-bold leading-tight line-clamp-1">{cat.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-1">{cat.medianCost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 現在選択中の用途カテゴリの生存原則＆ツール一覧 */}
            <div className="space-y-4">
              {/* カテゴリ生存原則バナー */}
              <div className="bg-gradient-to-r from-cyan-950/20 via-zinc-900/40 to-transparent border-l-2 border-cyan-500 p-3.5 rounded-r bg-[#090A0E]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-cyan-300">{activeCategoryMeta.survivalRule}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{activeCategoryMeta.description}</div>
                  </div>
                </div>
              </div>

              {/* ツールカードグリッド */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentCategoryTools.map((tool, idx) => (
                  <div
                    key={tool.id}
                    className="bg-[#090A0E] border border-white/[0.06] hover:border-white/[0.15] rounded-lg p-4 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* 上部ヘッダー */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                            <h3 className="text-base font-bold text-white tracking-tight">{tool.name}</h3>
                          </div>
                          <div className="text-[11px] text-emerald-400 font-mono font-medium mt-0.5">
                            {tool.estimatedCost}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-cyan-400">{tool.sharePercent}%</div>
                          <div className="text-[10px] text-zinc-500 font-mono">採用 {tool.companyCount}社</div>
                        </div>
                      </div>

                      {/* 採用率プログレスバー */}
                      <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden mb-3">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(tool.sharePercent * 1.5, 100)}%` }}
                        />
                      </div>

                      {/* なぜ選ばれているのか（生存の理由） */}
                      <div className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-2.5 rounded mb-3">
                        <span className="text-[10px] font-mono text-zinc-500 block mb-1">【生存の急所】</span>
                        {tool.survivalReason}
                      </div>
                    </div>

                    {/* 採用している実在企業タグ */}
                    <div>
                      <div className="text-[10px] font-mono text-zinc-500 mb-1.5">採用実例企業:</div>
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
                ))}
              </div>
            </div>

            {/* ─── 黄金スタック構成レシピ（月利100万円超の鉄板構成図） ─── */}
            <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  実証済み「黄金スタック構成レシピ」（組み合わせの極意）
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {data.goldenStackRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="bg-[#08090D] border border-amber-500/20 rounded-lg p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-2">
                        <span className="text-amber-400 font-semibold">{recipe.targetScale}</span>
                        <span className="text-emerald-400 font-bold">{recipe.marginTarget}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2">
                        {recipe.name}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">{recipe.description}</p>

                      <div className="space-y-2 border-t border-white/[0.06] pt-3">
                        <div className="text-[11px] font-mono text-zinc-400 font-semibold mb-1">構成配管:</div>
                        {recipe.tools.map((t, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5 rounded font-mono"
                          >
                            <span className="text-zinc-500 text-[11px]">{t.category}</span>
                            <span className="text-zinc-200 font-semibold">{t.toolName}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-500">想定月額固定費:</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {recipe.monthlyFixedCost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            【タブ1】即死アンチパターン＆検死録 (DEATH_TRAPS)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'DEATH_TRAPS' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-rose-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Skull className="w-3.5 h-3.5" />
                <span>Capitalism Post-Mortem Registry</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                やってはいけない「資本主義の即死トラップ検死録」
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                「何をするか」以上に重要なのは「何を避けるか」。数百億〜数千億円を溶かして爆死した企業の検死解剖から抽出された、踏んだら一発退場の即死地雷リスト。
              </p>
            </div>

            {/* アンチパターン一覧とカルテ展開の2カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左側: パターンリスト */}
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
                      <h3 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">
                        {trap.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {trap.mechanism}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>犠牲企業: {trap.victimEntities.map((v) => v.name).join(', ')}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 右側: 選択中パターンの詳細解剖カルテ */}
              <div className="lg:col-span-7">
                {activeTrap && (
                  <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-5 sticky top-4">
                    {/* カルテヘッダー */}
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-rose-400 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>FATAL ANOMALY DOSSIER / 死因解剖カルテ</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {activeTrap.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {activeTrap.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                          想定被害: {activeTrap.lossScale}
                        </span>
                      </div>
                    </div>

                    {/* なぜ死ぬのかのメカニズム */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono font-semibold text-zinc-400">
                        【死因解剖メカニズム】
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3.5 rounded">
                        {activeTrap.mechanism}
                      </p>
                    </div>

                    {/* こうなったら手遅れ（前兆サイン） */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono font-semibold text-amber-400">
                        【前兆サイン（手遅れのシグナル）】
                      </div>
                      <ul className="space-y-1.5">
                        {activeTrap.warningSigns.map((sign, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed"
                          >
                            <span className="text-rose-400 font-bold shrink-0">✕</span>
                            <span>{sign}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 回避策・解毒剤 */}
                    <div className="space-y-1.5 bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>【生存の解毒剤・処方箋】</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{activeTrap.antidote}</p>
                    </div>

                    {/* 実際に爆死した企業カルテ */}
                    <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                      <div className="text-xs font-mono font-semibold text-zinc-400">
                        【この地雷を踏んで爆死した実在企業の検死ログ】
                      </div>
                      {activeTrap.victimEntities.map((victim) => (
                        <div
                          key={victim.id}
                          className="bg-white/[0.02] border border-white/[0.06] rounded p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{victim.name}</span>
                            <span className="text-xs font-mono text-zinc-500">{victim.ticker}</span>
                          </div>
                          <div className="text-xs font-semibold text-rose-300">{victim.headline}</div>
                          <div className="text-xs text-zinc-400 leading-relaxed">{victim.punchline}</div>
                          <div className="space-y-1 pt-1">
                            {victim.details.map((d, i) => (
                              <div key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                                <span className="text-zinc-600">•</span>
                                <span>{d}</span>
                              </div>
                            ))}
                          </div>
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
            【タブ2】今の傾向・流行っている稼ぎ方 (CURRENT_WAVES)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'CURRENT_WAVES' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-emerald-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Viable Playbook Radar</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                今リアルタイムで通用している「勝ちパターンの型（Playbook）」
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                過去の化石（使えない成功談）を完全排除。現在進行形で月利数百万〜数千万円を稼ぎ出している「急所（痛みの財布）」と、別業界への3ステップ略奪転用手順。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左側: 型リスト */}
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
                      <h3 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">
                        {wave.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mb-2">
                        <span>月商: 約{(wave.medianRevenueJpy / 10000).toLocaleString()}万円</span>
                        <span>粗利: {wave.marginPercent}%</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        痛みの財布: {wave.targetPainWallet}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* 右側: 選択中の型の詳細レシピ */}
              <div className="lg:col-span-7">
                {activeWave && (
                  <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-5 sticky top-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>ACTIONABLE LOOT BLUEPRINT / 略奪転用設計図</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {activeWave.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {activeWave.viabilityLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                          想定月商: 約{(activeWave.medianRevenueJpy / 10000).toLocaleString()}万円
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                          営業利益率: {activeWave.marginPercent}%
                        </span>
                      </div>
                    </div>

                    {/* 突いている痛みの財布 */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono font-semibold text-zinc-400">
                        【突いている痛みの財布（サバンナOS）】
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded">
                        {activeWave.targetPainWallet}
                      </p>
                    </div>

                    {/* なぜ今勝てるのか */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono font-semibold text-cyan-400">
                        【なぜ今勝てるのか（時代背景と構造）】
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{activeWave.whyItWinsNow}</p>
                    </div>

                    {/* 賞味期限と後発参入の注意点 */}
                    <div className="space-y-1.5 bg-amber-950/20 border border-amber-500/20 p-3 rounded">
                      <div className="text-xs font-mono font-bold text-amber-400">
                        【賞味期限・後発参入の冷酷判定】
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activeWave.shelfLifeAnalysis}
                      </p>
                    </div>

                    {/* ★ 3ステップ略奪転用手順 */}
                    <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
                      <div className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>【今夜別業界で同じズルを使って稼ぐ3ステップ】</span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {activeWave.lootBlueprint.headline}
                      </div>
                      <div className="space-y-2">
                        {activeWave.lootBlueprint.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-xs text-zinc-200 leading-relaxed"
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 実在の証明企業 */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <div className="text-[11px] font-mono text-zinc-400">【裏付け実在企業】</div>
                      {activeWave.proofEntities.map((ent) => (
                        <div
                          key={ent.id}
                          className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded"
                        >
                          <span className="font-bold text-white">{ent.name}</span>
                          <span className="text-emerald-400 font-mono">
                            月商 約{(ent.monthlyRevenueJpy / 10000).toLocaleString()}万円 (利益率{' '}
                            {ent.marginPercent}%)
                          </span>
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
            【タブ4】初動ゲリラ戦録 (DIRTY_GENESIS)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'DIRTY_GENESIS' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-[#090A0F] border border-amber-500/20 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Dirty Genesis Archives</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                泥臭い初期ゲリラ戦録（最初の100人を獲った手口）
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                「良いものを作れば自然と売れる」という欺瞞を焼き払う。創業者が実際に友人のPCを奪ったり、自虐動画を晒したり、勝手にプロフを作って送りつけた初動突破の客観的事実ログ。
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
                      <span className="text-emerald-400 font-semibold">
                        初成約速度: {tactic.speedToFirstCustomer}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight mb-2">
                      {tactic.tacticName}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded mb-3">
                      {tactic.summary}
                    </p>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono text-zinc-400 font-semibold">
                        【実行手順と手口の要点】
                      </div>
                      {tactic.executionSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed"
                        >
                          <span className="text-amber-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">実行実名創業者:</span>
                    <span className="text-zinc-200 font-bold">
                      {tactic.proofEntity.name} ({tactic.proofEntity.founder})
                    </span>
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

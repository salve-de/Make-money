'use client';

import React, { useState, useMemo } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MarketAnomaly, AnomalyCategory } from '../../types/terminal';
import { MARKET_ANOMALIES, ANOMALY_CATEGORIES } from '../../data/marketAnomaliesData';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Layers,
  ChevronRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  X,
  Target,
  Wrench,
  BookOpen,
} from 'lucide-react';

interface TacticalArchetypesViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
}

export const TacticalArchetypesView: React.FC<TacticalArchetypesViewProps> = ({
  allEntities,
  onOpenEntityInLedger,
  onOpenSynthesisWithEntity,
}) => {
  // 選択中のカテゴリ
  const [selectedCategory, setSelectedCategory] = useState<AnomalyCategory | 'ALL'>('ALL');
  // 選択中の歪みID（初期値は最初の1件）
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>(
    MARKET_ANOMALIES[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  // モバイル用カルテモーダル表示フラグ
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // フィルタリング処理
  const filteredAnomalies = useMemo(() => {
    return MARKET_ANOMALIES.filter((item) => {
      const matchCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.targetPainWallet.toLowerCase().includes(q) ||
        item.incumbentTrap.toLowerCase().includes(q) ||
        item.trendingPlaybook.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  // 現在選択中の歪みオブジェクト
  const activeAnomaly = useMemo(() => {
    return (
      MARKET_ANOMALIES.find((a) => a.id === selectedAnomalyId) ||
      filteredAnomalies[0] ||
      MARKET_ANOMALIES[0]
    );
  }, [selectedAnomalyId, filteredAnomalies]);

  // 選択中歪みの裏付け実在銘柄
  const matchedEntities = useMemo(() => {
    if (!activeAnomaly) return [];
    return allEntities.filter((ent) => activeAnomaly.proofEntityIds.includes(ent.id));
  }, [activeAnomaly, allEntities]);

  // 全体メトリクス
  const avgMargin = useMemo(() => {
    const total = MARKET_ANOMALIES.reduce((acc, cur) => acc + cur.netMarginPercent, 0);
    return (total / MARKET_ANOMALIES.length).toFixed(1);
  }, []);

  const hotCount = useMemo(() => {
    return MARKET_ANOMALIES.filter((a) => a.isHot).length;
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060709] text-zinc-100 overflow-hidden font-sans select-text">
      {/* ─── 最上部 戦略HUDストリップ ─── */}
      <header className="border-b border-white/[0.06] bg-[#090A0E] px-4 py-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* タイトルとコンセプト */}
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Flame className="w-3 h-3 text-emerald-400 animate-pulse" />
                MARKET ANOMALIES & MOMENTUM
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                常時監視・逐一更新中
              </span>
            </div>
            <h1 className="text-sm font-semibold text-white tracking-wide mt-1 flex items-center gap-2">
              市場の歪み ＆ 急上昇マネーフロー
              <span className="text-xs font-normal text-zinc-400">
                ─ 大手の自爆（カニバリ）と未曾有の価格差から富を抜く戦略急所
              </span>
            </h1>
          </div>

          {/* KPIストリップ */}
          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
            <div className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.05]">
              <span className="text-zinc-500 text-[10px] block uppercase">検出歪み数</span>
              <span className="text-white font-bold">{MARKET_ANOMALIES.length}件</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.05]">
              <span className="text-zinc-500 text-[10px] block uppercase">平均手残り純利</span>
              <span className="text-emerald-400 font-bold">{avgMargin}%</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.05]">
              <span className="text-zinc-500 text-[10px] block uppercase">高熱狂シグナル</span>
              <span className="text-rose-400 font-bold">{hotCount}件</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.05] hidden sm:block">
              <span className="text-zinc-500 text-[10px] block uppercase">最新検知</span>
              <span className="text-cyan-400 font-bold">2026-03-05</span>
            </div>
          </div>
        </div>

        {/* カテゴリフィルター ＆ 検索バー */}
        <div className="mt-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2.5 border-t border-white/[0.04]">
          {/* カテゴリタブ */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {ANOMALY_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50 font-semibold'
                      : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-white/[0.05]'
                  }`}
                  title={cat.description}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 検索窓 */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="歪み・手口・大手の弱点を検索..."
              className="w-full bg-[#050608] border border-white/[0.08] focus:border-emerald-500/50 rounded pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </header>

      {/* ─── メイン領域: 3層スプリットペイン（左: 歪み一覧 / 右: 解剖カルテ） ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 【左ペイン】市場の歪み・急上昇トレンド一覧 (幅 38% 〜 42%) */}
        <aside className="w-full md:w-[380px] lg:w-[420px] xl:w-[460px] border-r border-white/[0.06] bg-[#07080B] flex flex-col shrink-0 overflow-hidden">
          <div className="p-2.5 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>検知された市場の歪み ({filteredAnomalies.length}件)</span>
            <span>鮮度順ソート</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredAnomalies.map((anomaly) => {
              const isSelected = activeAnomaly?.id === anomaly.id;
              return (
                <div
                  key={anomaly.id}
                  onClick={() => {
                    setSelectedAnomalyId(anomaly.id);
                    setIsMobileDetailOpen(true);
                  }}
                  className={`p-3.5 cursor-pointer transition-all duration-150 relative group ${
                    isSelected
                      ? 'bg-emerald-950/20 border-l-2 border-l-emerald-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* バッジ行: シグナル + 熱狂度 + 更新日 */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        anomaly.isHot
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {anomaly.signalBadge}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {anomaly.categoryLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-0.5 text-zinc-400">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        {anomaly.heatScore}
                      </span>
                      <span className="text-[10px] text-zinc-600">{anomaly.updatedAt}</span>
                    </div>
                  </div>

                  {/* タイトル ＆ サブタイトル */}
                  <h3 className={`text-xs font-semibold leading-snug mb-1 transition-colors ${
                    isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                  }`}>
                    {anomaly.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
                    {anomaly.subtitle}
                  </p>

                  {/* フッター情報: 大手の自爆要約 ＆ 手残り純利 */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono">
                    <span className="text-zinc-500 truncate max-w-[200px]">
                      {anomaly.expectedRevenue}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-zinc-500">手残り:</span>
                      <span className="text-emerald-400 font-bold">
                        {anomaly.netMarginPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAnomalies.length === 0 && (
              <div className="p-8 text-center text-zinc-600 text-xs font-mono">
                条件に合致する市場の歪みは見つかりませんでした。
              </div>
            )}
          </div>
        </aside>

        {/* 【右ペイン】選択した歪みの完全解剖カルテ (デスクトップで常時表示) */}
        <main className="hidden md:flex flex-1 flex-col min-w-0 bg-[#060709] overflow-y-auto">
          {activeAnomaly ? (
            <AnomalyDossierView
              anomaly={activeAnomaly}
              matchedEntities={matchedEntities}
              onOpenEntityInLedger={onOpenEntityInLedger}
              onOpenSynthesisWithEntity={onOpenSynthesisWithEntity}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs font-mono">
              左ペインから歪みを選択してください
            </div>
          )}
        </main>
      </div>

      {/* ─── モバイル用 解剖カルテモーダル ─── */}
      {isMobileDetailOpen && activeAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col md:hidden animate-in fade-in duration-200">
          <div className="p-3 border-b border-white/[0.08] bg-[#0A0B10] flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              市場の歪み 解剖カルテ
            </span>
            <button
              onClick={() => setIsMobileDetailOpen(false)}
              className="p-1 rounded bg-white/[0.05] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#060709]">
            <AnomalyDossierView
              anomaly={activeAnomaly}
              matchedEntities={matchedEntities}
              onOpenEntityInLedger={(id) => {
                setIsMobileDetailOpen(false);
                onOpenEntityInLedger(id);
              }}
              onOpenSynthesisWithEntity={(id) => {
                setIsMobileDetailOpen(false);
                onOpenSynthesisWithEntity?.(id);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 歪みの解剖カルテ (詳細コンポーネント) ───
interface AnomalyDossierViewProps {
  anomaly: MarketAnomaly;
  matchedEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
}

const AnomalyDossierView: React.FC<AnomalyDossierViewProps> = ({
  anomaly,
  matchedEntities,
  onOpenEntityInLedger,
  onOpenSynthesisWithEntity,
}) => {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* カルテヘッダー */}
      <div className="border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {anomaly.categoryLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {anomaly.signalBadge}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
            <span>検知日: {anomaly.updatedAt}</span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Flame className="w-3.5 h-3.5" />
              熱狂度 {anomaly.heatScore}/100
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
          {anomaly.title}
        </h2>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
          {anomaly.subtitle}
        </p>

        {/* 財務サマリーバー */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#0B0D13] border border-white/[0.06]">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">想定月商レンジ</span>
            <span className="text-sm font-mono font-bold text-white mt-0.5 block">
              {anomaly.expectedRevenue}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">実効手残り純利</span>
            <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
              {anomaly.netMarginPercent}%
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">大手の対抗可能性</span>
            <span className="text-sm font-mono font-bold text-rose-400 mt-0.5 block">
              0% (構造的自縛)
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4大解剖ブロック ─── */}
      <div className="grid grid-cols-1 gap-4">
        {/* ① 狙う痛みの財布 (サバンナOS) */}
        <div className="p-4 rounded-lg bg-rose-950/10 border border-rose-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold">
            <Target className="w-4 h-4 text-rose-400" />
            <span>1. 狙う痛みの財布 (サバンナOS: 顧客が即決する保身・恐怖)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-6">
            {anomaly.targetPainWallet}
          </p>
        </div>

        {/* ② 大手・既存産業の自爆構造 (カニバリズム障壁) */}
        <div className="p-4 rounded-lg bg-amber-950/10 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>2. 大手の自爆構造 (カニバリズム: 巨人が指をくわえて見逃す理由)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-6">
            {anomaly.incumbentTrap}
          </p>
        </div>

        {/* ③ いま現場で流行っている抜き方・手口 (Trending Playbook) */}
        <div className="p-4 rounded-lg bg-emerald-950/10 border border-emerald-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>3. いま現場で流行っている抜き方・手口 (Trending Playbook)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-6">
            {anomaly.trendingPlaybook}
          </p>
        </div>

        {/* ④ 初動突破の客観事実ログ (最初の10人の獲得実績) */}
        <div className="p-4 rounded-lg bg-cyan-950/10 border border-cyan-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>4. 初動突破の客観事実ログ (最初の10人を仕留めた実録)</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-mono text-[11px] pl-6 bg-black/20 p-2.5 rounded border border-white/[0.04]">
            {anomaly.guerrillaTractionLog}
          </p>
        </div>
      </div>

      {/* ─── 現場の構築ツール・原価配管 (Tech Stack) ─── */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs font-semibold">
          <Wrench className="w-4 h-4 text-zinc-400" />
          <span>実際の構築ツール・原価配管 (Tech Stack)</span>
        </div>
        <div className="flex flex-wrap gap-2 pl-6 pt-1">
          {anomaly.techStack.map((tool, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded bg-[#07080B] text-xs font-mono text-zinc-300 border border-white/[0.08]"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* ─── アクションバー: DB実例検証 ＆ AI壁打ち作戦立案 ─── */}
      <div className="p-4 rounded-lg bg-[#0B0D13] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 実在企業の裏帳簿リンク */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400 shrink-0">裏付け実在銘柄:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {matchedEntities.map((ent) => (
              <button
                key={ent.id}
                onClick={() => onOpenEntityInLedger(ent.id)}
                className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-emerald-400 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/40 transition-colors flex items-center gap-1"
                title="クリックでDB財務カルテを検証"
              >
                <span>{ent.name}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        {/* AI壁打ち連携ボタン */}
        {matchedEntities[0] && onOpenSynthesisWithEntity && (
          <button
            onClick={() => onOpenSynthesisWithEntity(matchedEntities[0].id)}
            className="px-4 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>この歪みから作戦を立案 (AI壁打ち)</span>
          </button>
        )}
      </div>
    </div>
  );
};

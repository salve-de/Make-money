'use client';

import React, { useState, useMemo } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { MarketAnomaly } from '../../types/terminal';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import {
  TrendingUp,
  Flame,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
  ShieldAlert,
  Zap,
  X,
  Target,
  Wrench,
  BookOpen,
  Database,
} from 'lucide-react';
import { AffiliateToolList } from '../tools/AffiliateToolBadge';

interface TacticalArchetypesViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
  initialAnomalyId?: string | null;
}

export const TacticalArchetypesView: React.FC<TacticalArchetypesViewProps> = ({
  allEntities,
  onOpenEntityInLedger,
  onOpenSynthesisWithEntity,
  initialAnomalyId,
}) => {
  // 選択中の歪みID（初期値は指定されたID、または最初の1件）
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>(
    initialAnomalyId || MARKET_ANOMALIES[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  // モバイル用カルテモーダル表示フラグ（初期IDが指定されていた場合はモバイルでも自動オープン）
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(Boolean(initialAnomalyId));

  // 外部からの initialAnomalyId 変更に追従
  React.useEffect(() => {
    if (initialAnomalyId) {
      setSelectedAnomalyId(initialAnomalyId);
      setIsMobileDetailOpen(true);
    }
  }, [initialAnomalyId]);

  // フィルタリング処理（カテゴリピル全廃・即時フリーワード検索に純化）
  const filteredAnomalies = useMemo(() => {
    if (!searchQuery.trim()) return MARKET_ANOMALIES;
    const q = searchQuery.toLowerCase();
    return MARKET_ANOMALIES.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.targetPainWallet.toLowerCase().includes(q) ||
        item.incumbentTrap.toLowerCase().includes(q) ||
        item.trendingPlaybook.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

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
      {/* ─── 最上部 戦略HUDストリップ（ピル完全切除・極薄プロ仕様） ─── */}
      <header className="border-b border-white/[0.06] bg-[#090A0E] px-3 sm:px-4 py-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* タイトルとコンセプト */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Flame className="w-3 h-3 text-emerald-400 animate-pulse" />
              TRENDS & ANOMALIES
            </span>
            <h1 className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">
              市場の歪み ＆ トレンド速報
            </h1>
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline shrink-0">
              ({filteredAnomalies.length}件検知 / 平均手残り {avgMargin}%)
            </span>
          </div>

          {/* 検索窓 ＆ KPI */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-56 md:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="歪み・手口・大手の弱点を検索..."
                className="w-full bg-[#050608] border border-white/[0.08] focus:border-emerald-500/50 rounded pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.05] text-rose-400 font-bold">
                急上昇 {hotCount}件
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── メイン領域: 2ペイン（左: 歪み一覧 / 右: 完全解剖カルテ） ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 【左ペイン】歪み・トレンド一覧 (デスクトップでは常時、スマホでは全幅表示) */}
        <aside className="w-full md:w-[360px] lg:w-[400px] xl:w-[440px] border-r border-white/[0.06] bg-[#07080B] flex flex-col shrink-0 overflow-hidden">
          <div className="p-2 sm:p-2.5 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-zinc-500">
            <span>検知された市場の歪み ({filteredAnomalies.length}件)</span>
            <span>鮮度・熱狂度順</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] pb-28 md:pb-4">
            {filteredAnomalies.map((anomaly) => {
              const isSelected = activeAnomaly?.id === anomaly.id;
              return (
                <div
                  key={anomaly.id}
                  onClick={() => {
                    setSelectedAnomalyId(anomaly.id);
                    setIsMobileDetailOpen(true);
                  }}
                  className={`p-3 sm:p-3.5 cursor-pointer transition-all duration-150 relative group ${
                    isSelected
                      ? 'bg-emerald-950/20 border-l-2 border-l-emerald-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* バッジ行: シグナル + 上昇率 + 熱狂度 */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold ${
                        anomaly.isHot
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {anomaly.growthRate ? `${anomaly.growthRate} ` : ''}{anomaly.signalBadge}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500">
                        {anomaly.categoryLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-zinc-500 shrink-0">
                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                        <Flame className="w-2.5 h-2.5" />
                        {anomaly.heatScore}
                      </span>
                      <span className="text-zinc-600 hidden sm:inline">{anomaly.updatedAt}</span>
                    </div>
                  </div>

                  {/* タイトル ＆ サブタイトル */}
                  <h3 className={`text-xs font-semibold leading-snug mb-1 transition-colors ${
                    isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                  }`}>
                    {anomaly.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                    {anomaly.subtitle}
                  </p>

                  {/* フッター情報: 想定月商 ＆ 実効手残り純利 */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] text-[10px] font-mono">
                    <span className="text-zinc-500 truncate max-w-[180px] sm:max-w-[220px]">
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

      {/* ─── モバイル用 フルスクリーン解剖カルテ（スマホ専用・極上の操作性） ─── */}
      {isMobileDetailOpen && activeAnomaly && (
        <div className="fixed inset-0 z-50 bg-[#060709] flex flex-col md:hidden animate-in fade-in duration-150">
          {/* モバイルヘッダー */}
          <div className="p-3 border-b border-white/[0.08] bg-[#0A0B10] flex items-center justify-between shrink-0">
            <button
              onClick={() => setIsMobileDetailOpen(false)}
              className="flex items-center gap-1 text-xs font-mono text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/[0.05]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>一覧に戻る</span>
            </button>
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              歪み解剖カルテ
            </span>
            <button
              onClick={() => setIsMobileDetailOpen(false)}
              className="p-1 rounded bg-white/[0.05] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* モバイル詳細ボディ */}
          <div className="flex-1 overflow-y-auto pb-32">
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

// ─── 歪みの完全解剖カルテ (Master-Detailコンポーネント) ───
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
    <div className="p-4 sm:p-6 max-w-4xl space-y-4 sm:space-y-6 select-text">
      {/* ─── カルテヘッダー ─── */}
      <div className="border-b border-white/[0.08] pb-4 sm:pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {anomaly.categoryLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {anomaly.growthRate ? `${anomaly.growthRate} ` : ''}{anomaly.signalBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-zinc-500">
            <span>検知日: {anomaly.updatedAt}</span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Flame className="w-3.5 h-3.5" />
              熱狂度 {anomaly.heatScore}/100
            </span>
          </div>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-white tracking-tight leading-snug break-words">
          {anomaly.title}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed break-words">
          {anomaly.subtitle}
        </p>

        {/* 財務サマリーバー */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-[#0B0D13] border border-white/[0.06]">
          <div>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase block">想定月商レンジ</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white mt-0.5 block">
              {anomaly.expectedRevenue}
            </span>
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase block">実効手残り純利</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
              {anomaly.netMarginPercent}%
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase block">大手の対抗可能性</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-rose-400 mt-0.5 block">
              0% (構造的自縛)
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4大解剖ブロック（Trends.vc + Exploding Topics + CB Insights融合） ─── */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {/* ① いま起きている予兆 (Signal & Momentum) */}
        {anomaly.signalData && (
          <div className="p-3.5 sm:p-4 rounded-lg bg-emerald-950/15 border border-emerald-500/25 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. いま起きている予兆データ (Signal & Momentum)</span>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-5 break-words">
              {anomaly.signalData}
            </p>
          </div>
        )}

        {/* ② 狙う痛みの財布 (サバンナOS) */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-rose-950/10 border border-rose-500/20 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-semibold">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>2. 狙う痛みの財布 (サバンナOS: 顧客が即決する保身・恐怖)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-5 break-words">
            {anomaly.targetPainWallet}
          </p>
        </div>

        {/* ③ 大手・既存産業の自爆構造 (Why it matters / カニバリズム障壁) */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-amber-950/10 border border-amber-500/20 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>3. 大手の自爆構造 (Why it matters: 巨人が指をくわえて見逃す理由)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-5 break-words">
            {anomaly.incumbentTrap}
          </p>
        </div>

        {/* ④ いま現場で流行っている抜き方・手口 (How to Profit) */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-cyan-950/10 border border-cyan-500/20 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>4. いま現場で流行っている抜き方・手口 (How to Profit)</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-5 break-words">
            {anomaly.trendingPlaybook}
          </p>
        </div>

        {/* ⑤ 初動突破の客観事実ログ (Guerrilla Traction) */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>5. 初動突破の客観事実ログ (最初の10人を仕留めた実録)</span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed font-mono pl-5 bg-black/20 p-2.5 rounded border border-white/[0.04] break-words">
            {anomaly.guerrillaTractionLog}
          </p>
        </div>
      </div>

      {/* ─── 現場の構築ツール・原価配管 (Tech Stack) ─── */}
      <div className="p-3.5 sm:p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs font-semibold">
          <Wrench className="w-3.5 h-3.5 text-zinc-400" />
          <span>実際の構築ツール・原価配管 (Tech Stack)</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-5 pt-0.5">
          {anomaly.techStack.map((tool, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-[#07080B] text-[11px] font-mono text-zinc-300 border border-white/[0.08]"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* ─── 相互直通ワームホール: 実在企業DB検証 ＆ AI壁打ち連携 ─── */}
      <div className="p-3.5 sm:p-4 rounded-lg bg-[#0B0D13] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 実在企業の裏帳簿リンク（DBへ一瞬でワープ） */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[11px] sm:text-xs font-mono text-zinc-400 shrink-0 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            裏付け実在企業 (Receipts):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {matchedEntities.map((ent) => (
              <button
                key={ent.id}
                onClick={() => onOpenEntityInLedger(ent.id)}
                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-mono text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 transition-all flex items-center gap-1 group cursor-pointer"
                title="クリックでDB財務カルテ・通帳を検証"
              >
                <span>{ent.name}</span>
                <span className="text-[10px] text-zinc-400 font-normal">({ent.pnl.operatingMargin}%)</span>
                <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        {/* AI壁打ち連携ボタン */}
        {matchedEntities[0] && onOpenSynthesisWithEntity && (
          <button
            onClick={() => onOpenSynthesisWithEntity(matchedEntities[0].id)}
            className="px-3.5 py-2 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>この歪みから作戦を立案</span>
          </button>
        )}
      </div>
    </div>
  );
};

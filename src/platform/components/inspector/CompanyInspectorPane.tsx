'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FinancialEntity, IntelligenceTopicId } from '../../types/terminal';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import { 
  X, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Pin,
  TrendingUp, 
  ShieldCheck, 
  Flame, 
  Wrench, 
  Users, 
  Layers, 
  Lock,
  KeyRound,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  FileText,
  Crosshair,
  Bot,
  Cpu,
  Clock,
  Edit3,
  Skull,
  AlertTriangle,
  Shield,
  Calculator
} from 'lucide-react';
import { AffiliateToolBadge, AffiliateToolList } from '../tools/AffiliateToolBadge';
import { findToolAffiliate, HAZARD_DEFENSE_SHIELDS, TOOL_AFFILIATES } from '../../config/toolAffiliates';
import { UniversalIntelligenceStream } from './UniversalIntelligenceStream';
import { DynamicEvidenceDeck } from './DynamicEvidenceDeck';
import { cleanIntelligenceText } from '@/lib/foundation/text-cleaner';

function parsePunchline(text: string): { punchline: string; detail: string } {
  const match = text.match(/^【(.*?)】([\s\S]*)$/);
  if (match) {
    return { punchline: match[1], detail: match[2].trim() };
  }
  return { punchline: '', detail: text };
}

interface CompanyInspectorPaneProps {
  entity: FinancialEntity | null;
  onClose: () => void;
  currency: 'JPY' | 'USD';
  onPrevEntity?: () => void;
  onNextEntity?: () => void;
  onOpenPro?: () => void;
  onSelectTopic?: (topicId: IntelligenceTopicId) => void;
  onOpenAnomaly?: (anomalyId: string) => void;
  initialTab?: TabType;
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
  analystNote?: string;
  onSaveAnalystNote?: (entityId: string, note: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
  isPro?: boolean;
}

type TabType = 'CORE' | 'STREAM' | 'FINANCIALS' | 'PLAYBOOK' | 'NOTES';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
  onSelectTopic,
  onOpenAnomaly,
  initialTab = 'CORE',
  activeTags = [],
  onToggleTag,
  analystNote = '',
  onSaveAnalystNote,
  onOpenSynthesisWithEntity,
  isPro = false,
}) => {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // スクロール追従（固定ヘッダーの立体シャドウ強調）
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 12);
    }
  };

  // 銘柄切り替え時にスクロールを先頭へリセット
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setIsScrolled(false);
    }
  }, [entity?.id]);

  // 下部スクロール領域への誘導スクロール
  const scrollToContent = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 260, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'j' || e.key === 'J') && onNextEntity) onNextEntity();
      if ((e.key === 'k' || e.key === 'K') && onPrevEntity) onPrevEntity();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNextEntity, onPrevEntity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetSection = params.get('section');
    if (targetSection === 'financial') {
      const timer = setTimeout(() => {
        const el = document.getElementById('section-financial');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [entity?.id]);

  if (!entity) return null;

  const formatMoney = (yen: number) => {
    if (currency === 'USD') {
      const usd = Math.round(yen / 150);
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
      return `$${usd}`;
    }
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
    return `¥${yen.toLocaleString()}`;
  };

  // 損益流出比率の計算（ウォーターフォール）
  const rev = entity.pnl.monthlyRevenue || 1;
  const cogsPct = Math.min(Math.round((entity.pnl.cogs / rev) * 100), 100);
  const serverPct = Math.min(Math.round((entity.pnl.operatingExpenses.serverAndApi / rev) * 100), 100);
  const adPct = Math.min(Math.round((entity.pnl.operatingExpenses.advertising / rev) * 100), 100);
  const subPct = Math.min(Math.round((entity.pnl.operatingExpenses.subcontracting / rev) * 100), 100);
  const saasPct = Math.min(Math.round((entity.pnl.operatingExpenses.toolsAndSaaS / rev) * 100), 100);
  const otherPct = Math.min(Math.round((entity.pnl.operatingExpenses.other / rev) * 100), 100);
  const profitPct = Math.max(Math.round((entity.pnl.operatingProfit / rev) * 100), 0);

  // 当該企業に紐づく特集レポートを検索
  const relatedDossier = INTELLIGENCE_DOSSIERS.find((d) =>
    d.targetEntityIds.includes(entity.id)
  );

  // 当該企業が実証している市場の歪み・トレンドを検索
  const relatedAnomaly = MARKET_ANOMALIES.find((a) =>
    a.proofEntityIds.includes(entity.id)
  );

  // 地雷・失敗・転落銘柄の自動検知（死因検死・ポストモータムモード）
  const isHazardMode = 
    entity.opportunityJudgment?.verdict === 'HAZARD_REJECT' ||
    entity.tags?.some(t => t.includes('地雷') || t.includes('失敗') || t.includes('爆死')) ||
    entity.architecturePattern?.includes('地雷') ||
    (entity.growthRateYoY !== undefined && entity.growthRateYoY < -30);

  // 財務証拠ステータスの判定（VERIFIED / REPORTED / ESTIMATED / POST_MORTEM / UNAVAILABLE）
  const financialStatus = entity.pnl?.financialStatus || (
    isHazardMode ? 'POST_MORTEM' :
    ['ent_keyence', 'ent_klaviyo_core', 'ent_buffer', 'ent_plausible', 'ent_shipfast', 'ent_photoai', 'ent_nomadlist', 'ent_transistor', 'ent_baremetrics_b0966c4871940e459cbb'].includes(entity.id)
      ? 'VERIFIED'
      : ['ent_case06_67a6586e2f30a21c8576', 'ent_notion_hq', 'ent_midjourney_239b8ccc522504fb757b', 'ent_basecamp_b1bb0f0ff61469aa22c5', 'ent_gumroad_164534dd22fa6c2e2793', 'ent_linear_app', 'ent_beehiiv_0e052432d4cc474caec6', 'ent_kitformerlyconvertkit_05168bc6971293b6d3ab', 'ent_whoop_fitness', 'ent_athletic_greens_ag1', 'ent_oura_ring', 'ent_case06_7590e69f49bb1c7e8ac7'].includes(entity.id)
      ? 'REPORTED'
      : 'ESTIMATED'
  );

  // 財務データ欠損（完全消滅・非表示）ガード
  const isFinancialUnavailable = 
    !entity.pnl ||
    financialStatus === 'UNAVAILABLE' ||
    entity.pnl.isRevenueUnconfirmed ||
    !entity.pnl.monthlyRevenue ||
    entity.pnl.monthlyRevenue === 0;

  // 財務ステータス別のバッジ・タイトル・タグ設定
  const getFinancialBadgeMeta = () => {
    switch (financialStatus) {
      case 'VERIFIED':
        return {
          badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
          iconColor: 'text-emerald-400',
          titleColor: 'text-emerald-300',
          title: '財務計器盤 (EXECUTIVE AUDIT & CASH FLOW)',
          tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          tagLabel: '確定開示 (VERIFIED)',
        };
      case 'REPORTED':
        return {
          badgeClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
          iconColor: 'text-cyan-400',
          titleColor: 'text-cyan-300',
          title: '報道・取材損益計器盤 (REPORTED CASH FLOW)',
          tagClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          tagLabel: '報道・取材 (REPORTED)',
        };
      case 'POST_MORTEM':
        return {
          badgeClass: 'text-red-400 bg-red-950/40 border-red-500/30',
          iconColor: 'text-red-400',
          titleColor: 'text-red-300',
          title: '出血・逆流レントゲン (BURN RATE & CASH DRAIN)',
          tagClass: 'bg-red-950/50 text-red-300 border-red-500/40',
          tagLabel: '死因出血逆算 (POST-MORTEM)',
        };
      case 'ESTIMATED':
      default:
        return {
          badgeClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
          iconColor: 'text-amber-400',
          titleColor: 'text-amber-300',
          title: '推定損益計器盤 (ESTIMATED CASH FLOW)',
          tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          tagLabel: '推測値 (ESTIMATED)',
        };
    }
  };

  const financialBadgeMeta = getFinancialBadgeMeta();

  // 動的証拠カード（Dynamic Evidence Registry）の有無判定
  const hasEvidenceCards = Boolean(entity.evidenceCards && entity.evidenceCards.length > 0);

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:flex-1 md:min-w-[480px] bg-[#040507] border-t md:border-t-0 md:border-l border-white/[0.08] z-40 flex flex-col shrink-0 md:shrink select-none overflow-hidden shadow-2xl">
        
        {/* ========================================================= */}
        {/* 【上部固定コンソール（PINNED EXECUTIVE HUD）: 視覚的境界 ＆ Elevation】 */}
        {/* ========================================================= */}
        <div className={`shrink-0 z-20 transition-all duration-200 bg-[#0B0D14] border-b relative ${
          isScrolled 
            ? 'border-emerald-500/40 shadow-[0_16px_36px_rgba(0,0,0,0.95)]' 
            : 'border-white/[0.12] shadow-[0_10px_25px_rgba(0,0,0,0.7)]'
        }`}>
          {/* 最上部アクセントライン */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/60 via-cyan-500/40 to-transparent" />

          {/* ヘッダー最上段（タイトル・ティッカー・アクション） */}
          <div className="p-3 flex items-center justify-between gap-2 border-b border-white/[0.04] bg-[#0C0F17]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-zinc-200 font-bold shrink-0 bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/[0.12] shadow-xs flex items-center gap-1.5" title="常時固定表示">
                <Pin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span>{entity.ticker}</span>
              </span>
              <div className="truncate">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate font-sans tracking-tight">
                  {entity.name}
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono block truncate">
                  {entity.legalEntity || entity.founder} ・ {entity.country}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* J/K ナビゲーション */}
              <div className="hidden sm:flex items-center gap-0.5 mr-1 font-mono text-[10px] text-zinc-500">
                <button
                  onClick={onPrevEntity}
                  disabled={!onPrevEntity}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                  title="前銘柄 (K)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <kbd className="bg-white/[0.04] px-1 rounded text-zinc-500">J/K</kbd>
                <button
                  onClick={onNextEntity}
                  disabled={!onNextEntity}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                  title="次銘柄 (J)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* AI壁打ちクイック起動 */}
              {onOpenSynthesisWithEntity && (
                <button
                  onClick={() => onOpenSynthesisWithEntity(entity.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer mr-1"
                  title="この銘柄の裏帳簿データでAIと壁打ちする"
                >
                  <Bot className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">AI壁打ち</span>
                </button>
              )}

              {/* 外部リンク */}
              <a
                href={entity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="公式サイトを開く"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* クローズボタン */}
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="閉じる (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 【即時意思決定: 最終判定 ＆ 需要・競争ベクトル】 */}
          {entity.opportunityJudgment ? (
            <div className="mx-3 mt-2 mb-1 p-2 rounded border bg-[#07090E] flex flex-col gap-1.5 shadow-xs border-white/[0.08]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${
                    entity.opportunityJudgment.verdict === 'ENTRY_CANDIDATE'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : entity.opportunityJudgment.verdict === 'MONITOR'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      : entity.opportunityJudgment.verdict === 'HAZARD_REJECT'
                      ? 'bg-red-950/40 text-red-400 border-red-500/50'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}>
                    判定: {entity.opportunityJudgment.verdictLabel}
                  </span>
                  <span className="text-[10px] font-sans text-zinc-300 font-medium">
                    {entity.opportunityJudgment.oneLineReason}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                  <span className="text-zinc-400">需要: <strong className="text-emerald-400">{entity.opportunityJudgment.demandDelta}</strong></span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">競争: <strong className="text-zinc-200">{entity.opportunityJudgment.competitionDelta}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-400 border-t border-white/[0.04] pt-1">
                <span>初期資本: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.capital}</strong></span>
                <span>・</span>
                <span>開発難度: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.technicalDifficulty}</strong></span>
                <span>・</span>
                <span>PF依存度: <strong className={entity.opportunityJudgment.entryRequirements.platformRisk === 'CRITICAL' ? 'text-red-400 font-bold' : 'text-zinc-200'}>{entity.opportunityJudgment.entryRequirements.platformRisk}</strong></span>
              </div>
            </div>
          ) : null}

          {/* タグライン（1行スマート表示） */}
          <div 
            className="px-3 pb-1 text-[11px] text-zinc-400 leading-snug font-sans truncate"
            title={cleanIntelligenceText(entity.tagline)}
          >
            {cleanIntelligenceText(entity.tagline)}
          </div>

          {/* 時系列 ＆ 賞味期限バッジ（ヘッダーインフォ） */}
          {entity.temporal && (
            <div className="px-3 pb-1.5 flex items-center gap-2 text-[10px] font-mono flex-wrap">
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{entity.temporal.foundedYear}年ローンチ ({entity.temporal.initialTractionPeriod})</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">
                データ基準: <span className="text-zinc-300 font-bold">{entity.temporal.dataSnapshotPeriod}</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className={`px-1.5 py-0.2 rounded font-bold border ${
                entity.temporal.viabilityStatus === 'ACTIVE_PLAYBOOK' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30' :
                entity.temporal.viabilityStatus === 'RISING_WAVE' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30' :
                entity.temporal.viabilityStatus === 'MATURED_MOAT' ? 'text-amber-400 border-amber-500/30 bg-amber-950/30' :
                entity.temporal.viabilityStatus === 'HISTORICAL_WINDOW' ? 'text-red-400 border-red-500/30 bg-red-950/30' :
                'text-purple-400 border-purple-500/30 bg-purple-950/30'
              }`}>
                ● {entity.temporal.viabilityLabel}
              </span>
            </div>
          )}

          {/* 突いている市場の歪み（逆方向ワームホール） */}
          {relatedAnomaly && (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => onOpenAnomaly && onOpenAnomaly(relatedAnomaly.id)}
                className="w-full text-left px-2 py-1 rounded bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/25 hover:border-emerald-500/40 transition-colors flex items-center justify-between group cursor-pointer"
                title="この企業が実証している市場の歪み・トレンドカルテを開く"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">市場の歪み:</span>
                  <span className="text-[10px] font-mono font-bold text-white truncate">{relatedAnomaly.title}</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-300 font-bold shrink-0">
                    {relatedAnomaly.growthRate}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 shrink-0 pl-1 group-hover:text-emerald-300">
                  <span>解剖</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          )}

          {/* 探索タグ（クリックで左一覧を即時トグル・複数選択対応） */}
          {entity.tags && entity.tags.length > 0 && (
            <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {entity.tags.map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onToggleTag) onToggleTag(tag);
                    }}
                    title={`「#${tag}」で左一覧を絞り込み`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-500/25 text-emerald-300 font-semibold border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-500 border-zinc-700/60 shadow-xs'
                    }`}
                  >
                    <span className="text-zinc-500">#</span>
                    <span>{tag}</span>
                    {isActive ? (
                      <X className="w-2.5 h-2.5 text-emerald-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── ★ 境界ストリップ ＆ スクロールガイド（BOUNDARY & SCROLL INDICATOR） ─── */}
          <div className={`flex items-center justify-between px-3 py-1.5 border-t text-[10px] font-mono shrink-0 transition-colors ${
            isHazardMode 
              ? 'bg-red-950/30 border-red-500/25' 
              : 'bg-[#080A10] border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2 text-zinc-400">
              {isHazardMode ? (
                <>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <Skull className="w-3 h-3 text-red-400" />
                    POST-MORTEM AUTOPSY
                  </span>
                  <span className="text-red-900">|</span>
                  <span className="text-red-300/80">死因判定 ➔ 致命的死角 ➔ 出血 ➔ 崩壊ログ ➔ 怨嗟証拠</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CASE DEEP-DIVE
                  </span>
                  <span>|</span>
                  <span>判定 ➔ 構造 ➔ 財務 ➔ Playbook ➔ 証拠</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* ミニマル下矢印アイコン（文字ゼロ） */}
              <button
                type="button"
                onClick={scrollToContent}
                className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer shadow-xs group"
                title="下へスクロール"
              >
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              </button>

              {entity.observationsStream && entity.observationsStream.length > 0 && (
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                  isHazardMode 
                    ? 'bg-red-950/40 text-red-300 border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isHazardMode ? '死因証拠' : '証拠'} {entity.observationsStream.length}件
                </span>
              )}
              {analystNote && (
                <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                  メモ有
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 【コンテンツゾーン: スクロールトレイ ＆ 高密度ストリーム】 */}
        {/* ========================================================= */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 sm:space-y-6 text-xs font-sans bg-[#040507] relative scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_rgba(4,5,7,1)]"
        >
          {/* 上端潜り込みグラデーションシャドウ（文字ゼロ・純粋物理アフォーダンス） */}
          <div className="sticky top-0 -mt-4 -mx-4 h-3.5 bg-gradient-to-b from-[#040507] via-[#040507]/70 to-transparent pointer-events-none z-10" />
          
          {/* 市場の歪み・トレンドへの直通バナー（ワームホール） */}
          {relatedAnomaly && (
            <div 
              onClick={() => onOpenAnomaly && onOpenAnomaly(relatedAnomaly.id)}
              className="border border-emerald-500/25 hover:border-emerald-500/50 rounded-md bg-[#080E0B] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      実証している市場の歪み
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      {relatedAnomaly.growthRate}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">
                      手残り {relatedAnomaly.netMarginPercent}%
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                    {relatedAnomaly.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans">
                    {relatedAnomaly.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 group-hover:text-emerald-300 shrink-0 pl-2">
                <span className="hidden sm:inline">歪みカルテを解剖</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}

          {/* 特集インテリジェンスへの連動バナー */}
          {relatedDossier && (
            <div 
              onClick={() => onSelectTopic && onSelectTopic(relatedDossier.id)}
              className="border border-white/[0.08] hover:border-white/[0.2] rounded-md bg-[#0A0C12] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08] shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                      関連特集インテリジェンス
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.04] text-zinc-400">
                      {relatedDossier.badge}
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-white truncate group-hover:text-zinc-200 transition-colors">
                    {relatedDossier.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 group-hover:text-white shrink-0 pl-3">
                <span className="hidden sm:inline">深層解剖を読む</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          )}
          
          {/* ========================================================= */}
          {/* 【動的証拠保全デッキ (DYNAMIC EVIDENCE DECK)】 */}
          {/* ========================================================= */}
          {hasEvidenceCards && (
            <div className="space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-400 bg-red-950/40 border-red-500/30'
                        : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                    }`}>
                      FORENSIC DOSSIER
                    </span>
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-300' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '致命的特異点・死因物証保全ファイル' : '特異点物証 ＆ 金抜きの急所ファイル'}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500">
                    {entity.evidenceCards!.length}件の特異点事実
                  </span>
                </div>
                <DynamicEvidenceDeck cards={entity.evidenceCards!} isHazardMode={isHazardMode} />
              </section>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* #01〜#04: 事業DNA ＆ 構造的優位性 / 致命的欠陥 (フォールバック) */}
          {/* ------------------------------------------------------- */}
          {!hasEvidenceCards && (
          <div className="space-y-6">
            {/* #01 事業の正体 / 事業の罠 */}
            {entity.essence && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-400 bg-red-950/40 border-red-500/30'
                        : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                    }`}>
                      #01
                    </span>
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-300' : 'text-zinc-200'
                    }`}>
                      {isHazardMode ? '事業の罠・錯覚の前提 (FATAL ASSUMPTION)' : '事業の正体・構造仕様 (BUSINESS DNA)'}
                    </span>
                  </div>
                </div>
                <div className={`border rounded-md bg-[#0A0C10] divide-y shadow-sm ${
                  isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.04]'
                }`}>
                  <div className="p-3 flex items-start gap-3">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-medium ${isHazardMode ? 'text-red-400/80' : 'text-zinc-400'}`}>
                      {isHazardMode ? '錯覚した事業' : '何屋か'}
                    </span>
                    <span className="text-zinc-100 text-[11px] leading-relaxed font-medium">{entity.essence.whatItDoes}</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-medium ${isHazardMode ? 'text-red-400/80' : 'text-zinc-400'}`}>
                      {isHazardMode ? '見誤った顧客' : '誰の財布'}
                    </span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.targetCustomer}</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-medium ${isHazardMode ? 'text-red-400/80' : 'text-zinc-400'}`}>
                      {isHazardMode ? '消滅した需要' : '切除する苦痛'}
                    </span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.painRelief}</span>
                  </div>
                </div>
              </section>
            )}

            {/* #02 突いた盲点 / 見落とした致命的死角 */}
            {(() => {
              const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
              return (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        isHazardMode
                          ? 'text-red-400 bg-red-950/40 border-red-500/30'
                          : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                      }`}>
                        #02
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHazardMode ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                          isHazardMode ? 'text-red-300' : 'text-zinc-200'
                        }`}>
                          {isHazardMode ? '見落とした致命的死角 (BLIND SPOT TRAP)' : '突いた業界の盲点 (MARKET GLITCH)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`border rounded-md bg-[#0A0C10] p-3.5 space-y-2 shadow-sm ${
                    isHazardMode ? 'border-red-500/20' : 'border-white/[0.08]'
                  }`}>
                    {punchline && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-2.5 ${
                        isHazardMode ? 'text-red-200 border-red-500' : 'text-white border-white/60'
                      }`}>
                        {punchline}
                      </div>
                    )}
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </section>
              );
            })()}

            {/* #03 参入障壁 / 崩壊した見せかけの堀 */}
            {(() => {
              const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
              return (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        isHazardMode
                          ? 'text-red-400 bg-red-950/40 border-red-500/30'
                          : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                      }`}>
                        #03
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHazardMode ? (
                          <Skull className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                          isHazardMode ? 'text-red-300' : 'text-zinc-200'
                        }`}>
                          {isHazardMode ? '崩壊した見せかけの堀 (COLLAPSED MOAT)' : '参入障壁の正体 (7 POWERS MOAT)'}
                        </span>
                      </div>
                    </div>
                    <span className={`border px-1.5 py-0.5 rounded font-mono text-[10px] ${
                      isHazardMode
                        ? 'bg-red-950/40 text-red-400 border-red-500/30'
                        : 'bg-white/[0.06] text-zinc-300 border-white/[0.1]'
                    }`}>
                      {entity.strategy.moatType}
                    </span>
                  </div>
                  <div className={`border rounded-md bg-[#0A0C10] p-3.5 space-y-2 shadow-sm ${
                    isHazardMode ? 'border-red-500/20' : 'border-white/[0.08]'
                  }`}>
                    {punchline && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-2.5 ${
                        isHazardMode ? 'text-red-200 border-red-500' : 'text-white border-white/60'
                      }`}>
                        {punchline}
                      </div>
                    )}
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </section>
              );
            })()}

            {/* #04 大手の自爆 / 大手に一撃で圧殺された理由 */}
            {entity.strategy.incumbentDilemma && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-400 bg-red-950/40 border-red-500/30'
                        : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                    }`}>
                      #04
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Flame className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                      <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                        isHazardMode ? 'text-red-300' : 'text-zinc-200'
                      }`}>
                        {isHazardMode ? '大手に一撃で圧殺された理由 (KILLED BY INCUMBENTS)' : '大手が構造上真似できない理由 (INCUMBENT DILEMMA)'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`border rounded-md bg-[#0A0C10] p-3.5 shadow-sm ${
                  isHazardMode ? 'border-red-500/20' : 'border-white/[0.08]'
                }`}>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {entity.strategy.incumbentDilemma}
                  </p>
                </div>
              </section>
            )}
          </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* #05〜#08: 財務レントゲン / 出血・逆流レントゲン */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-6 pt-2 border-t border-white/[0.06]">
            {/* 財務計器盤 ＆ 月次損益テーブル（データ欠損・UNAVAILABLE時は完全非表示） */}
            {!isFinancialUnavailable && (
              <>
                {/* 財務計器盤 (4連KPI + ウォーターフォールバー) */}
                <section id="section-financial" className="space-y-2 scroll-mt-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        financialBadgeMeta.badgeClass
                      }`}>
                        #05
                      </span>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className={`w-3.5 h-3.5 ${financialBadgeMeta.iconColor}`} />
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                          financialBadgeMeta.titleColor
                        }`}>
                          {financialBadgeMeta.title}
                        </span>
                      </div>
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${financialBadgeMeta.tagClass}`}>
                        {financialBadgeMeta.tagLabel}
                      </span>
                    </div>
                    {/* 右側：観測時期 ＆ 出典 */}
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                      {entity.pnl.dataSnapshotPeriod && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock className="w-2.5 h-2.5 text-zinc-500" />
                          {entity.pnl.dataSnapshotPeriod}
                        </span>
                      )}
                      {entity.pnl.sourceDoc && (
                        <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-400">
                          {entity.pnl.sourceDoc}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`border rounded-md bg-[#0A0C10] p-3.5 space-y-3.5 shadow-sm ${
                    isHazardMode ? 'border-red-500/20' : 'border-white/[0.08]'
                  }`}>
                    {/* 4連コアKPI */}
                    <div className="grid grid-cols-4 gap-2 font-mono">
                      <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                        <span className="text-[9px] text-zinc-500 block uppercase">
                          {financialStatus === 'ESTIMATED' ? '推定月商 (Rev)' : isHazardMode ? '月商 (ピーク/現行)' : '月商 (Rev)'}
                        </span>
                        <span className="text-xs font-bold text-white tabular-nums">
                          {formatMoney(entity.pnl.monthlyRevenue)}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                        <span className="text-[9px] text-zinc-500 block uppercase">
                          {financialStatus === 'ESTIMATED' ? '推定手残り (Net)' : isHazardMode ? '純損失/手残り' : '純手残り (Net)'}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${
                          isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {formatMoney(entity.pnl.operatingProfit)}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                        <span className="text-[9px] text-zinc-500 block uppercase">
                          {financialStatus === 'ESTIMATED' ? '推定利益率' : isHazardMode ? '赤字/利益率' : '利益率 (Margin)'}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${
                          isHazardMode || entity.pnl.operatingMargin < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {entity.pnl.operatingMargin}%
                        </span>
                      </div>
                      <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                        <span className="text-[9px] text-zinc-500 block uppercase">年成長率 (YoY)</span>
                        <span className={`text-xs font-bold tabular-nums ${
                          entity.growthRateYoY < 0 ? 'text-red-400' : 'text-zinc-200'
                        }`}>
                          {`${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%`}
                        </span>
                      </div>
                    </div>

                    {/* 損益流出ウォーターフォールバー */}
                    <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">
                          {financialStatus === 'ESTIMATED' ? '損益分解モデル (100%基準)' : isHazardMode ? '資本流出・出血分解 (100%基準)' : '損益流出分解 (100%基準)'}
                        </span>
                        <span className={`font-bold ${isHazardMode || profitPct === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isHazardMode ? `純手残り ${profitPct}% (出血状態)` : `手残り純利益 ${profitPct}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/80 rounded-xs overflow-hidden flex border border-white/[0.08]">
                        {cogsPct > 0 && <div style={{ width: `${cogsPct}%` }} className="bg-zinc-600" title={`原価: ${cogsPct}%`} />}
                        {serverPct > 0 && <div style={{ width: `${serverPct}%` }} className={isHazardMode ? "bg-red-800" : "bg-zinc-700"} title={`推論/サーバー: ${serverPct}%`} />}
                        {adPct > 0 && <div style={{ width: `${adPct}%` }} className="bg-zinc-500" title={`広告: ${adPct}%`} />}
                        {subPct > 0 && <div style={{ width: `${subPct}%` }} className="bg-zinc-700" title={`外注: ${subPct}%`} />}
                        {saasPct > 0 && <div style={{ width: `${saasPct}%` }} className="bg-zinc-800" title={`ツール: ${saasPct}%`} />}
                        {otherPct > 0 && <div style={{ width: `${otherPct}%` }} className="bg-zinc-800" title={`その他: ${otherPct}%`} />}
                        {profitPct > 0 && <div style={{ width: `${profitPct}%` }} className={isHazardMode ? "bg-red-500" : "bg-emerald-500"} title={`純利益: ${profitPct}%`} />}
                      </div>
                    </div>
                  </div>
                </section>

                {/* P&L 会計スプレッドシートテーブル */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${financialBadgeMeta.badgeClass}`}>
                        #06
                      </span>
                      <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${financialBadgeMeta.titleColor}`}>
                        {financialStatus === 'ESTIMATED'
                          ? '推定損益構造モデル (P&L ESTIMATION MODEL)'
                          : financialStatus === 'REPORTED'
                          ? '報道・取材損益テーブル (P&L REPORTED AUDIT)'
                          : isHazardMode
                          ? '月次損益出血テーブル (P&L AUTOPSY)'
                          : '確定財務実査テーブル (P&L AUDIT)'}
                      </span>
                    </div>
                  </div>

                  {/* 推計因数分解方程式ボックス（ESTIMATED時のみ表示） */}
                  {financialStatus === 'ESTIMATED' && entity.pnl.estimationLogic && (
                    <div className="p-3 rounded-md bg-[#0F0D07] border border-amber-500/30 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono font-bold">
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <span>推計因数分解方程式 (REVERSE-ENGINEERED EQUATION)</span>
                      </div>
                      <div className="font-mono text-[11px] text-amber-200/90 leading-relaxed bg-black/50 p-2.5 rounded border border-amber-500/20 whitespace-pre-line">
                        {entity.pnl.estimationLogic}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500">
                        ※ 公開プラン単価・観測ユーザー規模・業界標準原価率からリバースエンジニアリングした科学的推計方程式です。
                      </div>
                    </div>
                  )}

                  <div className={`border rounded-md bg-[#0A0C10] divide-y text-xs font-mono shadow-sm ${
                    isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.04]'
                  }`}>
                    <div className="p-2.5 flex justify-between items-center">
                      <span className="text-zinc-400">
                        {financialStatus === 'ESTIMATED' ? '推定月商 (Gross Revenue)' : isHazardMode ? '直近/ピーク月商' : '直近月商 (Gross Revenue)'}
                      </span>
                      <span className="text-white font-bold tabular-nums">{formatMoney(entity.pnl.monthlyRevenue)}</span>
                    </div>
                    <div className="p-2.5 flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 pl-2">└ 売上原価 (COGS)</span>
                      <span className="text-zinc-400 tabular-nums">-{formatMoney(entity.pnl.cogs)}</span>
                    </div>
                    <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                      <span className="text-zinc-300 font-medium">粗利益 (Gross Profit: {entity.pnl.grossMargin}%)</span>
                      <span className="text-white font-medium tabular-nums">{formatMoney(entity.pnl.grossProfit)}</span>
                    </div>

                    {/* 販管費内訳 (OPEX) */}
                    <div className="p-2.5 space-y-1.5 text-[11px] text-zinc-500">
                      <div className="flex items-center justify-between text-[10px] text-zinc-600 uppercase font-bold">
                        <span>販管費内訳 (OPEX)</span>
                        {financialStatus === 'ESTIMATED' && (
                          <span className="text-amber-500/80 font-normal">※業界標準比率に基づく推定配分</span>
                        )}
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>サーバー/推論API費</span>
                        <span className={`tabular-nums ${isHazardMode ? 'text-red-300' : ''}`}>{formatMoney(entity.pnl.operatingExpenses.serverAndApi)}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>広告宣伝費</span>
                        <span className="tabular-nums">{formatMoney(entity.pnl.operatingExpenses.advertising)}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>外注・委託費</span>
                        <span className="tabular-nums">{formatMoney(entity.pnl.operatingExpenses.subcontracting)}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>ツール・SaaS費</span>
                        <span className="tabular-nums">{formatMoney(entity.pnl.operatingExpenses.toolsAndSaaS)}</span>
                      </div>
                    </div>

                    <div className={`p-2.5 flex justify-between items-center border-t ${
                      isHazardMode || entity.pnl.operatingProfit < 0
                        ? 'bg-red-950/30 border-red-500/30'
                        : 'bg-emerald-950/20 border-white/[0.08]'
                    }`}>
                      <span className="text-white font-bold">
                        {isHazardMode || entity.pnl.operatingProfit < 0 ? '営業赤字 (純流出)' : '営業利益 (純手残り)'} ({entity.pnl.operatingMargin}%)
                      </span>
                      <span className={`font-bold tabular-nums text-xs ${
                        isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {formatMoney(entity.pnl.operatingProfit)}/月
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* 運用体制 ＆ 資本要件 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-400 bg-red-950/40 border-red-500/30'
                      : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                  }`}>
                    #07
                  </span>
                  <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-300' : 'text-zinc-200'
                  }`}>
                    {isHazardMode ? '過剰雇用 ＆ 固定費の罠 (OVERHIRING & BURN)' : '運用体制 ＆ 初期資本 (OPERATIONS)'}
                  </span>
                </div>
              </div>
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] grid grid-cols-4 divide-x divide-white/[0.04] p-3 font-mono text-center text-[10px] shadow-sm">
                <div>
                  <span className="text-emerald-400 block font-bold">立ち上げ初期</span>
                  <span className="text-white font-bold text-xs">
                    {entity.operations.initialTeamSize ?? (entity.scale === 'SOLO' ? 1 : entity.scale === 'SMALL_TEAM' ? 2 : 2)}人
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{isHazardMode ? 'ピーク時 (破滅前)' : '現在 (スケール後)'}</span>
                  <span className={`font-bold text-xs ${isHazardMode ? 'text-red-400' : 'text-zinc-300'}`}>
                    {entity.operations.currentTeamSize ?? entity.operations.teamSize}人
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">週実働</span>
                  <span className="text-white font-bold text-xs">{entity.operations.weeklyHours}h</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">自動化度</span>
                  <span className={`font-bold text-xs ${isHazardMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {entity.operations.automationLevel}%
                  </span>
                </div>
              </div>
            </section>

            {/* 稼働インフラ：現場配管ツール（通常時・データが存在する場合のみ表示） */}
            {!isHazardMode && entity.operations?.toolStack && entity.operations.toolStack.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border text-zinc-400 bg-white/[0.06] border-white/[0.08]">
                      #08
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                        稼働インフラ：現場配管ツール ({entity.operations.toolStack.length}件)
                      </span>
                    </div>
                  </div>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    月額計: {formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}
                  </span>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                  {entity.operations.toolStack.map((tool, idx) => {
                    const aff = findToolAffiliate(tool.name);
                    const targetUrl = tool.url || aff?.url;
                    return (
                      <div key={idx} className="p-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-2">
                            {targetUrl ? (
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                className="inline-flex items-center gap-1.5 text-white font-medium hover:text-emerald-300 transition-colors group cursor-pointer"
                              >
                                <span>{tool.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                {aff?.isAffiliate && (
                                  <span className="text-[8px] font-sans font-bold px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    PR
                                  </span>
                                )}
                              </a>
                            ) : (
                              <span className="text-white font-medium">{tool.name}</span>
                            )}
                            <span className="text-zinc-500 text-[10px] font-mono">({tool.category})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 font-mono text-[10px] tabular-nums">
                              {formatMoney(tool.monthlyCost)}/月
                            </span>
                          </div>
                        </div>
                        {tool.purpose && (
                          <p className="text-[10px] text-zinc-400 leading-snug">
                            {tool.purpose}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {/* 景品表示法ステマ規制注記 */}
                  <div className="p-2 bg-white/[0.01] flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                    <ShieldCheck className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                    <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
                  </div>
                </div>
              </section>
            )}

            {/* 地雷・失敗事例専用：【即死回避】防壁インフラ ＆ 避難先ツール（PR） */}
            {isHazardMode && (() => {
              // 企業の失敗要因に応じた防壁ソリューションを選択（デフォルトはAPI_DEPENDENCYまたはBURN_RATE_COLLAPSE）
              const textLower = (
                (entity.tagline || '') + ' ' +
                (entity.opportunityJudgment?.oneLineReason || '') + ' ' +
                (entity.essence?.whatItDoes || '') + ' ' +
                (entity.essence?.painRelief || '') + ' ' +
                (entity.strategy?.blindspot || '') + ' ' +
                (entity.exposureAudit?.pivotSnapshot || '') + ' ' +
                entity.tags.join(' ')
              ).toLowerCase();
              let shieldKey = 'API_DEPENDENCY';
              if (textLower.includes('quibi') || textLower.includes('動画') || textLower.includes('制作費') || textLower.includes('スクショ') || textLower.includes('ハリウッド') || textLower.includes('tiktok')) {
                shieldKey = 'HEAVY_CAPITAL_MEDIA';
              } else if (textLower.includes('zenefits') || textLower.includes('保険法') || textLower.includes('違法') || textLower.includes('コンプライアンス') || textLower.includes('規制当局')) {
                shieldKey = 'REGULATORY_COMPLIANCE';
              } else if (textLower.includes('サーバー') || textLower.includes('固定費') || textLower.includes('赤字') || textLower.includes('burn') || textLower.includes('hopin') || textLower.includes('clubhouse')) {
                shieldKey = 'BURN_RATE_COLLAPSE';
              } else if (textLower.includes('sns') || textLower.includes('twitter') || textLower.includes('ban') || textLower.includes('集客')) {
                shieldKey = 'ALGORITHM_DEATH';
              }
              const shield = HAZARD_DEFENSE_SHIELDS[shieldKey] || HAZARD_DEFENSE_SHIELDS['API_DEPENDENCY'];

              return (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-red-500/20 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-400 bg-red-950/50 border-red-500/40">
                        #08
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          {shield.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-zinc-500 font-mono text-[9px]">
                      損失回避・防御盾
                    </span>
                  </div>

                  <div className="border border-amber-500/30 rounded-md bg-[#0F0A0A] p-3 space-y-3 shadow-md">
                    <div className="bg-red-950/30 border border-red-500/20 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>踏んだら即死する構造的死角</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                        {shield.fatalRisk}
                      </p>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-500/20 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>生存のための防壁アプローチ</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                        {shield.shieldApproach}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                        推奨・避難先インフラスタック（検証済み代替ツール）
                      </span>
                      <div className="space-y-1.5">
                        {shield.recommendedTools.map((t, idx) => {
                          const affMeta = TOOL_AFFILIATES[t.affiliateKey];
                          const targetUrl = affMeta?.url || '#';
                          return (
                            <a
                              key={idx}
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="block p-2.5 rounded bg-black/40 hover:bg-black/70 border border-white/[0.08] hover:border-amber-500/50 transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-bold group-hover:text-amber-300 transition-colors">
                                    {t.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                                    {t.role}
                                  </span>
                                  <span className="text-[8px] font-sans font-bold px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    PR
                                  </span>
                                </div>
                                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                              </div>
                              <p className="text-[10px] text-zinc-400 group-hover:text-zinc-300 leading-snug">
                                {t.whyShield}
                              </p>
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    {/* 景表法ステマ規制注記 */}
                    <div className="pt-1 flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                      <ShieldCheck className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                      <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
                    </div>
                  </div>
                </section>
              );
            })()}
          </div>

          {/* ------------------------------------------------------- */}
          {/* #09〜#12: 実務Playbook ＆ 初動突破ログ / 死因確定ログ ＆ 崩壊スパイラル (フォールバック) */}
          {/* ------------------------------------------------------- */}
          {!hasEvidenceCards && (
          <div className="space-y-6 pt-2 border-t border-white/[0.06]">
            {/* 資本主義の裏帳簿：初期突破の手口と裏原価 / 致命的死因の客観ログ */}
            {entity.exposureAudit && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-400 bg-red-950/40 border-red-500/30'
                        : 'text-zinc-300 bg-white/[0.08] border-white/[0.12]'
                    }`}>
                      #09
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isHazardMode ? (
                        <Skull className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Crosshair className="w-3.5 h-3.5 text-zinc-300" />
                      )}
                      <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                        isHazardMode ? 'text-red-300' : 'text-zinc-100'
                      }`}>
                        {isHazardMode ? '資本主義の裏帳簿：致命的死因の客観ログ (POST-MORTEM AUTOPSY)' : '資本主義の裏帳簿：初期突破の手口と裏原価 (EXPOSURE AUDIT)'}
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] ${isHazardMode ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                    {isHazardMode ? 'FATAL CASUALTY' : 'FACT CHECKED'}
                  </span>
                </div>

                <div className={`border rounded-md bg-[#0A0C10] divide-y text-xs font-sans shadow-sm ${
                  isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.04]'
                }`}>
                  {/* ① 初期ゲリラ戦・自演ログ / 初期錯覚トラクション */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                      <span className={isHazardMode ? 'text-red-500' : 'text-zinc-500'}>01.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '初期の錯覚熱狂と自演トラクション (EUPHORIA TRACTION)' : '初期ゲリラ戦・自演集客ログ (GUERRILLA TRACTION)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.guerrillaTraction}
                    </p>
                  </div>

                  {/* ② プラットフォーム規約の盲点ハック / 致命的規約違反・依存 */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                      <span className={isHazardMode ? 'text-red-500' : 'text-zinc-500'}>02.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? 'プラットフォーム依存の死角と規約爆弾 (DEPENDENCY BOMB)' : 'プラットフォーム規約の盲点ハック (PLATFORM GLITCH)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.platformGlitch}
                    </p>
                  </div>

                  {/* ③ 死線とピボット魚拓 */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                      <span className={isHazardMode ? 'text-red-500' : 'text-zinc-500'}>03.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '崩壊後の投げ売り・清算ピボット魚拓 (FIRE SALE & PIVOT)' : '死線とピボットの魚拓比較 (PIVOT SNAPSHOT)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.pivotSnapshot}
                    </p>
                  </div>

                  {/* ④ 表向き隠された裏原価 / 原価高騰と固定費出血 */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                      <span className={isHazardMode ? 'text-red-500' : 'text-zinc-500'}>04.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '首を絞めたAPI原価・過剰固定費の出血ログ (FATAL EXPENSE)' : '裏ツール構成と現物原価のレントゲン (HIDDEN COST & API)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.hiddenStackCost}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 最初の100人を獲得した手順 / 熱狂の終焉 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-400 bg-red-950/40 border-red-500/30'
                      : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                  }`}>
                    #10
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Users className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-300' : 'text-zinc-200'
                    }`}>
                      {isHazardMode ? '初期熱狂の獲得と解約の引き金 (INITIAL RUSH & TRIGGER)' : '最初の100人を獲得した泥臭い手順 (TRACTION)'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                {entity.strategy.initialTraction.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5 text-[11px] text-zinc-200">
                    <span className={`font-mono text-[10px] shrink-0 font-bold ${isHazardMode ? 'text-red-500' : 'text-zinc-500'}`}>{idx + 1}.</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 再現・実行ステップ / 踏んではいけない地雷チェックリスト */}
            <section className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-400 bg-red-950/40 border-red-500/30'
                      : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                  }`}>
                    #11
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isHazardMode ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-300' : 'text-zinc-200'
                    }`}>
                      {isHazardMode ? '踏んではいけない地雷チェックリスト (AVOIDANCE AUDIT)' : '再現・実行 Playbook (ACTION PLAYBOOK)'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`border rounded-md bg-[#0A0C10] divide-y shadow-sm ${
                isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.04]'
              }`}>
                {entity.strategy.actionPlaybook.map((step, idx) => (
                  <div key={idx} className="p-3 text-[11px] text-zinc-200 leading-relaxed">
                    {step}
                  </div>
                ))}
              </div>
            </section>

            {/* 顧客獲得動線 / 崩壊した獲得動線 */}
            {entity.acquisition && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-400 bg-red-950/40 border-red-500/30'
                        : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                    }`}>
                      #12
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                      <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                        isHazardMode ? 'text-red-300' : 'text-zinc-200'
                      }`}>
                        {isHazardMode ? '崩壊した集客動線とCAC高騰 (ACQUISITION COLLAPSE)' : '顧客獲得動線 (ACQUISITION FUNNEL)'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">
                    CAC: <strong className={isHazardMode ? 'text-red-400' : 'text-emerald-400'}>{entity.acquisition.cacJpy === 0 ? '0円' : formatMoney(entity.acquisition.cacJpy)}</strong>
                  </span>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3 text-[11px] text-zinc-200 shadow-sm">
                  {entity.acquisition.primaryFunnel}
                </div>
              </section>
            )}
          </div>
          )}

          {/* ========================================================= */}
          {/* 【PRO EXCLUSIVE: 儲かり続ける4つの裏構造 / 崩壊を招いた4つの構造的死因 (フォールバック)】 */}
          {/* ========================================================= */}
          {!hasEvidenceCards && entity.meta && (
            <div className={`relative border rounded-md bg-[#0A0B0E] p-3.5 space-y-3 overflow-hidden shadow-2xl mt-6 ${
              isHazardMode ? 'border-red-500/30' : 'border-white/[0.1]'
            }`}>
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode 
                      ? 'text-red-400 bg-red-950/60 border-red-800/60'
                      : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                  }`}>
                    PRO
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isHazardMode ? (
                      <Skull className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
                    )}
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '崩壊と破滅を招いた4つの致命的バグ (FATAL MECHANISMS)' : '独占と暴利を生む4つの裏構造 (CORE MECHANISM)'}
                    </span>
                  </div>
                </div>
                {isPro ? (
                  <span className={`font-mono text-[9px] border px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                    isHazardMode
                      ? 'text-red-400 bg-red-950/60 border-red-800/60'
                      : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    UNLOCKED: 機関解錠済
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-500">
                    DEEP AUDIT
                  </span>
                )}
              </div>

              {/* 4大メタ分析モジュール群 (isProで解錠/すりガラス切り替え) */}
              <div className="relative pt-1">
                <div className={isPro ? "space-y-3 text-xs font-sans text-zinc-100" : "filter blur-[2.5px] opacity-25 select-none pointer-events-none space-y-3 text-xs font-sans"}>
                  {/* #01 なぜ大手が手を出せないのか / 大手による直接圧殺 */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-500"}>01.</span>
                      <span>{isHazardMode ? '大手の直接参入とカニバリズムの死角（一撃圧殺）' : 'なぜ大手が手を出せないのか（大手の自縛・参入拒絶）'}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">大手の自爆（カニバリ）:</strong> {entity.meta.incumbentDilemma.cannibalizationBarrier}</div>
                      <div><strong className="text-zinc-300 font-mono">大企業病（美味い隙間）:</strong> {entity.meta.incumbentDilemma.scaleMismatchReason}</div>
                      <div><strong className="text-zinc-300 font-mono">即決の奇襲（速度の差）:</strong> {entity.meta.incumbentDilemma.decisionSpeedAdvantage}</div>
                    </div>
                  </div>

                  {/* #02 なぜ暴利でも客が群がるのか / 値付けの破綻 */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-500"}>02.</span>
                      <span>{isHazardMode ? '無料モデルの罠と持続不能な価格破壊（収益化の死）' : 'なぜ暴利でも客が群がるのか（値切らせない急所）'}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">錯覚の比較軸（アンカー）:</strong> {entity.meta.pricingPower.anchorComparison}</div>
                      <div><strong className="text-zinc-300 font-mono">人質の急所（恐怖のツボ）:</strong> {entity.meta.pricingPower.lossAversionTrigger}</div>
                      <div><strong className="text-zinc-300 font-mono">痛まない財布（会社の経費）:</strong> {entity.meta.pricingPower.budgetCategory}</div>
                    </div>
                  </div>

                  {/* #03 なぜ客が一生辞められないのか / 顧客離脱の激痛 */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-500"}>03.</span>
                      <span>{isHazardMode ? '防御障壁の欠落と解約の津波（乗り換え自由の罠）' : 'なぜ客が一生辞められないのか（乗り換えの監禁構造）'}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">データの監禁（人質化）:</strong> {entity.meta.lockInMechanism.dataHostage}</div>
                      <div><strong className="text-zinc-300 font-mono">業務への寄生（日常化）:</strong> {entity.meta.lockInMechanism.workflowIntegration}</div>
                      <div><strong className="text-zinc-300 font-mono">解約の激痛（乗り換え罰）:</strong> {entity.meta.lockInMechanism.switchingFriction}</div>
                    </div>
                  </div>

                  {/* #04 なぜ無借金で現金が膨らみ続けるのか / 資金枯渇のカラクリ */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-500"}>04.</span>
                      <span>{isHazardMode ? '現金流出スパイラルと資本枯渇（破滅のカラクリ）' : 'なぜ無借金で現金が膨らみ続けるのか（前金・暴利のカラクリ）'}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">前金総取り（客の金で拡大）:</strong> {entity.meta.capitalEfficiency.cashConversionCycle}</div>
                      <div><strong className="text-zinc-300 font-mono">原価ゼロの限界利益:</strong> {entity.meta.capitalEfficiency.incrementalMargin}</div>
                      <div><strong className="text-zinc-300 font-mono">現金の自動蓄積（無借金増殖）:</strong> {entity.meta.capitalEfficiency.workingCapitalStrategy}</div>
                    </div>
                  </div>
                </div>

                {/* 中央解錠ゲートウェイ (未解錠時のみ表示) */}
                {!isPro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs rounded gap-2.5 p-4 text-center">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                      <KeyRound className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span>{isHazardMode ? '大手が一撃で圧殺し、資金が枯渇した「4大死因の裏帳簿」' : '大手が手を出せず、客が一生逃げられない「4大独占構造」'}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 max-w-sm font-sans leading-normal">
                      {isHazardMode 
                        ? 'なぜ一瞬で模倣されたのか、どこで規制に刺されたのか、出血が止まらなくなった裏原価をすべて公開'
                        : '暴利でも客が群がるカラクリ、他社へ乗り換え不能にする罠、前金で手元に金が残る裏帳簿をすべて公開'}
                    </p>
                    <button
                      onClick={onOpenPro}
                      className="text-xs font-mono font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-4 py-1.5 rounded transition-colors shadow-2xl cursor-pointer"
                    >
                      PROプランで独占の裏帳簿をすべて暴く (¥1,980〜)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* #13: 一次証拠 ＆ 万能救済ストリーム (EVIDENCE STREAM) */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  isHazardMode 
                    ? 'text-red-400 bg-red-950/40 border-red-500/30'
                    : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                }`}>
                  #13
                </span>
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
                  <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-300' : 'text-zinc-100'
                  }`}>
                    {isHazardMode ? '死因一次証拠 ＆ 崩壊怨嗟ストリーム (CASUALTY STREAM)' : '一次証拠 ＆ 万能救済ストリーム (EVIDENCE STREAM)'}
                  </span>
                </div>
              </div>
              {entity.observationsStream && entity.observationsStream.length > 0 && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                  isHazardMode
                    ? 'bg-red-950/40 text-red-300 border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {entity.observationsStream.length}件の観測ログ
                </span>
              )}
            </div>

            <UniversalIntelligenceStream entity={entity} currency={currency} />
          </div>

          {/* ------------------------------------------------------- */}
          {/* #14: アナリスト考察メモ ＆ AI壁打ち (FIELD NOTES) */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            <div className={`border rounded-md bg-[#0A0B10] p-4 space-y-3 shadow-lg ${
              isHazardMode ? 'border-red-500/30' : 'border-white/[0.08]'
            }`}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-400 bg-red-950/40 border-red-500/30'
                      : 'text-zinc-400 bg-white/[0.06] border-white/[0.08]'
                  }`}>
                    #14
                  </span>
                  <Edit3 className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
                  <span className="font-mono text-xs font-bold text-white tracking-wider">
                    {isHazardMode ? 'POST_MORTEM_NOTES: 死因検死・地雷回避メモ' : 'ANALYST_FIELD_NOTES: 極秘考察メモ'}
                  </span>
                </div>
                {analystNote ? (
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    isHazardMode 
                      ? 'text-red-300 bg-red-950/60 border-red-800/40'
                      : 'text-emerald-400/90 bg-emerald-950/60 border-emerald-800/40'
                  }`}>
                    自動保存済
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-zinc-500">
                    未記録
                  </span>
                )}
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                {isHazardMode 
                  ? `${entity.name}が爆死・転落した真の死因を記録し、自分が同じ事業や似た構造で参入する際に『絶対に避けるべき地雷』を特定してください。AIとの壁打ちでこの地雷を迂回する防壁を検証できます。`
                  : `${entity.name}の盲点・手口・原価構造から着想を得た独自の転用アイデアや、別市場へのスライド仮説を記録してください。このメモはAIとの壁打ちや独自アイデア創出の着火剤として読み込まれます。`}
              </p>

              <textarea
                rows={4}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder={isHazardMode 
                  ? "例: なぜChatGPT登場でJasperは即死したのか？ OpenAIのAPIラッパーに留まらず、自前の独自データセットや業務フローの深い監禁（人質化）があれば生き残れたか？..."
                  : "例: このAPIラッパーの構造を士業の契約書レビューに応用できないか？ 初期の自演集客（Reddit）の代わりにXやnoteを活用し、初期100人を集める..."}
                className="w-full bg-[#060709] border border-white/[0.1] focus:border-white/[0.25] rounded p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.99]"
                  >
                    <Bot className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
                    <span>{isHazardMode ? 'この地雷の回避策をAIと壁打ちする' : 'この銘柄のデータでAIと壁打ちする'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 銘柄の着眼点サマリー */}
            <div className="border border-white/[0.06] rounded bg-white/[0.02] p-3 space-y-2">
              <span className="font-mono text-[10px] text-zinc-500 block uppercase">
                考察の武器（この銘柄のキーデータ）
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-[#060709] p-2 rounded border border-white/[0.04]">
                  <span className="text-zinc-500 block text-[9px]">人質にした財布</span>
                  <span className="text-zinc-200">{entity.targetPainWallet || '顧客の恐怖・怠惰'}</span>
                </div>
                <div className="bg-[#060709] p-2 rounded border border-white/[0.04]">
                  <span className="text-zinc-500 block text-[9px]">初動集客の泥臭い手口</span>
                  <span className="text-zinc-200">{entity.strategy.initialTraction[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

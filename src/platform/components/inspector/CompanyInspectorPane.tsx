'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FinancialEntity, IntelligenceTopicId } from '../../types/terminal';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import { 
  X, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
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
  Edit3
} from 'lucide-react';
import { AffiliateToolBadge, AffiliateToolList } from '../tools/AffiliateToolBadge';
import { findToolAffiliate } from '../../config/toolAffiliates';
import { UniversalIntelligenceStream } from './UniversalIntelligenceStream';

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
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab')?.toUpperCase() as TabType | undefined;
  const resolvedTab = tabParam === 'CORE' || tabParam === 'STREAM' || tabParam === 'FINANCIALS' || tabParam === 'PLAYBOOK' || tabParam === 'NOTES' ? tabParam : initialTab;
  const [activeTab, setActiveTab] = useState<TabType>(resolvedTab);

  useEffect(() => {
    if (tabParam === 'CORE' || tabParam === 'STREAM' || tabParam === 'FINANCIALS' || tabParam === 'PLAYBOOK' || tabParam === 'NOTES') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'j' || e.key === 'J') && onNextEntity) onNextEntity();
      if ((e.key === 'k' || e.key === 'K') && onPrevEntity) onPrevEntity();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNextEntity, onPrevEntity]);

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

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:flex-1 md:min-w-[480px] bg-[#08090C] border-t md:border-t-0 md:border-l border-white/[0.06] z-40 flex flex-col shrink-0 md:shrink select-none overflow-hidden shadow-2xl">
        
        {/* ========================================================= */}
        {/* 【上部極薄固定ヘッダー: 銘柄情報 ＆ アクション】 */}
        {/* ========================================================= */}
        <div className="border-b border-white/[0.06] bg-[#07080B] shrink-0">
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-zinc-300 font-bold shrink-0 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                {entity.ticker}
              </span>
              <div className="truncate">
                <h2 className="text-xs font-bold text-white truncate font-sans">
                  {entity.name}
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono block truncate">
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
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors"
                  title="前銘柄 (K)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <kbd className="bg-white/[0.04] px-1 rounded text-zinc-500">J/K</kbd>
                <button
                  onClick={onNextEntity}
                  disabled={!onNextEntity}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors"
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
                className="p-1 text-zinc-500 hover:text-white transition-colors"
                title="公式サイトを開く"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* クローズボタン */}
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* タグライン（1行スマート表示） */}
          <div className="px-3 pb-1 text-[11px] text-zinc-400 leading-snug font-sans truncate">
            {entity.tagline}
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
        </div>

        {/* ========================================================= */}
        {/* 【タブ切替バー: 5層特化 (CORE / STREAM / FINANCIALS / PLAYBOOK / NOTES)】 */}
        {/* ========================================================= */}
        <div className="flex items-center border-b border-white/[0.06] bg-[#07080A] text-[11px] font-sans shrink-0">
          <button
            onClick={() => setActiveTab('CORE')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'CORE'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            事業DNA (Core)
          </button>
          <button
            onClick={() => setActiveTab('STREAM')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 relative ${
              activeTab === 'STREAM'
                ? 'text-emerald-400 border-emerald-400 font-bold bg-emerald-950/20'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            全量インテリジェンス (Stream)
            {entity.observationsStream && entity.observationsStream.length > 0 && (
              <span className="ml-1 px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {entity.observationsStream.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('FINANCIALS')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'FINANCIALS'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            財務・稼働
          </button>
          <button
            onClick={() => setActiveTab('PLAYBOOK')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'PLAYBOOK'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Playbook
          </button>
          <button
            onClick={() => setActiveTab('NOTES')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 relative ${
              activeTab === 'NOTES'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            考察ノート
            {analystNote && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 align-middle" />
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* 【コンテンツゾーン: 明瞭なセクション区切り ＆ 高密度】 */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:space-y-6 text-xs font-sans">
          
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
          
          {/* ------------------------------------------------------- */}
          {/* TAB 1: 事業DNA (Core) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'CORE' && (
            <div className="space-y-6">
              {/* #01 事業の正体 */}
              {entity.essence && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                        #01
                      </span>
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        事業の正体・構造仕様 (BUSINESS DNA)
                      </span>
                    </div>
                  </div>
                  <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                    <div className="p-3 flex items-start gap-3">
                      <span className="w-24 text-[10px] font-mono text-zinc-400 shrink-0 font-medium">何屋か</span>
                      <span className="text-zinc-100 text-[11px] leading-relaxed font-medium">{entity.essence.whatItDoes}</span>
                    </div>
                    <div className="p-3 flex items-start gap-3">
                      <span className="w-24 text-[10px] font-mono text-zinc-400 shrink-0 font-medium">誰の財布</span>
                      <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.targetCustomer}</span>
                    </div>
                    <div className="p-3 flex items-start gap-3">
                      <span className="w-24 text-[10px] font-mono text-zinc-400 shrink-0 font-medium">切除する苦痛</span>
                      <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.painRelief}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* #02 突いた業界の盲点 */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
                return (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                          #02
                        </span>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                            突いた業界の盲点 (MARKET GLITCH)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-2 shadow-sm">
                      {punchline && (
                        <div className="text-white font-bold text-xs leading-snug border-l-2 border-white/60 pl-2.5">
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

              {/* #03 参入障壁の正体 */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
                return (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                          #03
                        </span>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                            参入障壁の正体 (7 POWERS MOAT)
                          </span>
                        </div>
                      </div>
                      <span className="bg-white/[0.06] text-zinc-300 border border-white/[0.1] px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {entity.strategy.moatType}
                      </span>
                    </div>
                    <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-2 shadow-sm">
                      {punchline && (
                        <div className="text-white font-bold text-xs leading-snug border-l-2 border-white/60 pl-2.5">
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

              {/* #04 大手が真似できない理由 */}
              {entity.strategy.incumbentDilemma && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                        #04
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                          大手が構造上真似できない理由 (INCUMBENT DILEMMA)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 shadow-sm">
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {entity.strategy.incumbentDilemma}
                    </p>
                  </div>
                </section>
              )}

              {/* 全量インテリジェンスストリームへの案内バナー */}
              <div 
                onClick={() => setActiveTab('STREAM')}
                className="border border-emerald-500/25 hover:border-emerald-500/50 rounded-md bg-[#080E0B] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        3層ハイブリッド完全表示保障
                      </span>
                      {entity.observationsStream && entity.observationsStream.length > 0 && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                          {entity.observationsStream.length}件の生データ
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                      動的特異点 ＆ 万能救済ストリームを開く
                    </h4>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans">
                      画一フレームで切り捨てられない生々しい裏帳簿・観測ログを全量閲覧
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 group-hover:text-emerald-300 shrink-0 pl-2">
                  <span className="hidden sm:inline">全量表示</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB: 全量インテリジェンス (Stream: Layer 2特異点 ＆ Layer 3万能救済) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'STREAM' && (
            <div className="space-y-6">
              <UniversalIntelligenceStream entity={entity} currency={currency} />
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 2: 財務・武器庫 (Financials) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'FINANCIALS' && (
            <div className="space-y-6">
              {/* #01 財務計器盤 (4連KPI + ウォーターフォールバー) */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #01
                    </span>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        財務計器盤 (EXECUTIVE KPI & CASH FLOW)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-3.5 shadow-sm">
                  {/* 4連コアKPI */}
                  <div className="grid grid-cols-4 gap-2 font-mono">
                    <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                      <span className="text-[9px] text-zinc-500 block uppercase">月商 (Rev)</span>
                      <span className="text-xs font-bold text-white tabular-nums">
                        {formatMoney(entity.pnl.monthlyRevenue)}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                      <span className="text-[9px] text-zinc-500 block uppercase">純手残り (Net)</span>
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        {formatMoney(entity.pnl.operatingProfit)}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                      <span className="text-[9px] text-zinc-500 block uppercase">利益率 (Margin)</span>
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        {entity.pnl.operatingMargin}%
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                      <span className="text-[9px] text-zinc-500 block uppercase">年成長率 (YoY)</span>
                      <span className="text-xs font-bold text-zinc-200 tabular-nums">
                        +{entity.growthRateYoY}%
                      </span>
                    </div>
                  </div>

                  {/* 損益流出ウォーターフォールバー */}
                  <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">損益流出分解 (100%基準)</span>
                      <span className="text-emerald-400 font-bold">手残り純利益 {profitPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/80 rounded-xs overflow-hidden flex border border-white/[0.08]">
                      {cogsPct > 0 && <div style={{ width: `${cogsPct}%` }} className="bg-zinc-600" title={`原価: ${cogsPct}%`} />}
                      {serverPct > 0 && <div style={{ width: `${serverPct}%` }} className="bg-zinc-700" title={`推論/サーバー: ${serverPct}%`} />}
                      {adPct > 0 && <div style={{ width: `${adPct}%` }} className="bg-zinc-500" title={`広告: ${adPct}%`} />}
                      {subPct > 0 && <div style={{ width: `${subPct}%` }} className="bg-zinc-700" title={`外注: ${subPct}%`} />}
                      {saasPct > 0 && <div style={{ width: `${saasPct}%` }} className="bg-zinc-800" title={`ツール: ${saasPct}%`} />}
                      {otherPct > 0 && <div style={{ width: `${otherPct}%` }} className="bg-zinc-800" title={`その他: ${otherPct}%`} />}
                      {profitPct > 0 && <div style={{ width: `${profitPct}%` }} className="bg-emerald-500" title={`純利益: ${profitPct}%`} />}
                    </div>
                  </div>
                </div>
              </section>

              {/* #02 P&L 会計スプレッドシートテーブル */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #02
                    </span>
                    <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                      月次損益実査テーブル (P&L AUDIT)
                    </span>
                  </div>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] text-xs font-mono shadow-sm">
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-zinc-400">直近月商 (Gross Revenue)</span>
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
                  <div className="p-2.5 space-y-1.5 text-[11px] text-zinc-500">
                    <div className="text-[10px] text-zinc-600 uppercase font-bold">販管費内訳 (OPEX)</div>
                    <div className="flex justify-between pl-2">
                      <span>サーバー/推論API費</span>
                      <span className="tabular-nums">{formatMoney(entity.pnl.operatingExpenses.serverAndApi)}</span>
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
                  <div className="p-2.5 flex justify-between items-center border-t border-white/[0.08] bg-emerald-950/20">
                    <span className="text-white font-bold">営業利益 (純手残り: {entity.pnl.operatingMargin}%)</span>
                    <span className="text-emerald-400 font-bold tabular-nums text-xs">
                      {formatMoney(entity.pnl.operatingProfit)}/月
                    </span>
                  </div>
                </div>
              </section>

              {/* #03 運用体制 ＆ 資本要件 */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #03
                    </span>
                    <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                      運用体制 ＆ 初期資本 (OPERATIONS)
                    </span>
                  </div>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] grid grid-cols-3 divide-x divide-white/[0.04] p-3 font-mono text-center text-[10px] shadow-sm">
                  <div>
                    <span className="text-zinc-500 block">人数</span>
                    <span className="text-white font-bold text-xs">{entity.operations.teamSize}人</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">週実働</span>
                    <span className="text-white font-bold text-xs">{entity.operations.weeklyHours}h</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">自動化度</span>
                    <span className="text-emerald-400 font-bold text-xs">{entity.operations.automationLevel}%</span>
                  </div>
                </div>
              </section>

              {/* #04 稼働インフラ：現場配管ツール */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #04
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
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
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: 実務Playbook (Tactics) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'PLAYBOOK' && (
            <div className="space-y-6">
              {/* #00 資本主義の裏帳簿：初期突破の手口と裏原価 (EXPOSURE AUDIT) */}
              {entity.exposureAudit && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-zinc-300 bg-white/[0.08] border border-white/[0.12] px-1.5 py-0.5 rounded">
                        AUDIT
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5 text-zinc-300" />
                        <span className="font-mono text-[11px] font-bold text-zinc-100 uppercase tracking-wider">
                          資本主義の裏帳簿：初期突破の手口と裏原価 (EXPOSURE AUDIT)
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] text-zinc-500">
                      FACT CHECKED
                    </span>
                  </div>

                  <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] text-xs font-sans shadow-sm">
                    {/* ① 初期ゲリラ戦・自演ログ */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                        <span className="text-zinc-500">01.</span>
                        <span className="text-zinc-200">初期ゲリラ戦・自演集客ログ (GUERRILLA TRACTION)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                        {entity.exposureAudit.guerrillaTraction}
                      </p>
                    </div>

                    {/* ② プラットフォーム規約の盲点ハック */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                        <span className="text-zinc-500">02.</span>
                        <span className="text-zinc-200">プラットフォーム規約の盲点ハック (PLATFORM GLITCH)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                        {entity.exposureAudit.platformGlitch}
                      </p>
                    </div>

                    {/* ③ 死線とピボット魚拓 */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                        <span className="text-zinc-500">03.</span>
                        <span className="text-zinc-200">死線とピボットの魚拓比較 (PIVOT SNAPSHOT)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                        {entity.exposureAudit.pivotSnapshot}
                      </p>
                    </div>

                    {/* ④ 表向き隠された裏原価 */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 font-bold">
                        <span className="text-zinc-500">04.</span>
                        <span className="text-zinc-200">裏ツール構成と現物原価のレントゲン (HIDDEN COST & API)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans pl-4">
                        {entity.exposureAudit.hiddenStackCost}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* #01 最初の100人を獲得した手順 */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #01
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        最初の100人を獲得した泥臭い手順 (TRACTION)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                  {entity.strategy.initialTraction.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-start gap-2.5 text-[11px] text-zinc-200">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0 font-bold">{idx + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* #02 再現・実行ステップ */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #02
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        再現・実行 Playbook (ACTION PLAYBOOK)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                  {entity.strategy.actionPlaybook.map((step, idx) => (
                    <div key={idx} className="p-3 text-[11px] text-zinc-200 leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </section>

              {/* #03 顧客獲得動線 */}
              {entity.acquisition && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                        #03
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                          顧客獲得動線 (ACQUISITION FUNNEL)
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400">
                      CAC: <strong className="text-emerald-400">{entity.acquisition.cacJpy === 0 ? '0円' : formatMoney(entity.acquisition.cacJpy)}</strong>
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
          {/* 【PRO EXCLUSIVE: 儲かり続ける4つの裏構造】 */}
          {/* ========================================================= */}
          {entity.meta && (
            <div className="relative border border-white/[0.1] rounded-md bg-[#0A0B0E] p-3.5 space-y-3 overflow-hidden shadow-2xl mt-6">
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-[11px] font-mono font-bold text-zinc-100 uppercase tracking-wider">
                      独占と暴利を生む4つの裏構造 (CORE MECHANISM)
                    </span>
                  </div>
                </div>
                {isPro ? (
                  <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
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
                  {/* #01 なぜ大手が手を出せないのか */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className="text-zinc-500">01.</span>
                      <span>なぜ大手が手を出せないのか（大手の自縛・参入拒絶）</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">大手の自爆（カニバリ）:</strong> {entity.meta.incumbentDilemma.cannibalizationBarrier}</div>
                      <div><strong className="text-zinc-300 font-mono">大企業病（美味い隙間）:</strong> {entity.meta.incumbentDilemma.scaleMismatchReason}</div>
                      <div><strong className="text-zinc-300 font-mono">即決の奇襲（速度の差）:</strong> {entity.meta.incumbentDilemma.decisionSpeedAdvantage}</div>
                    </div>
                  </div>

                  {/* #02 なぜ暴利でも客が群がるのか */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className="text-zinc-500">02.</span>
                      <span>なぜ暴利でも客が群がるのか（値切らせない急所）</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">錯覚の比較軸（アンカー）:</strong> {entity.meta.pricingPower.anchorComparison}</div>
                      <div><strong className="text-zinc-300 font-mono">人質の急所（恐怖のツボ）:</strong> {entity.meta.pricingPower.lossAversionTrigger}</div>
                      <div><strong className="text-zinc-300 font-mono">痛まない財布（会社の経費）:</strong> {entity.meta.pricingPower.budgetCategory}</div>
                    </div>
                  </div>

                  {/* #03 なぜ客が一生辞められないのか */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className="text-zinc-500">03.</span>
                      <span>なぜ客が一生辞められないのか（乗り換えの監禁構造）</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-sans">
                      <div><strong className="text-zinc-300 font-mono">データの監禁（人質化）:</strong> {entity.meta.lockInMechanism.dataHostage}</div>
                      <div><strong className="text-zinc-300 font-mono">業務への寄生（日常化）:</strong> {entity.meta.lockInMechanism.workflowIntegration}</div>
                      <div><strong className="text-zinc-300 font-mono">解約の激痛（乗り換え罰）:</strong> {entity.meta.lockInMechanism.switchingFriction}</div>
                    </div>
                  </div>

                  {/* #04 なぜ無借金で現金が膨らみ続けるのか */}
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px] font-bold">
                      <span className="text-zinc-500">04.</span>
                      <span>なぜ無借金で現金が膨らみ続けるのか（前金・暴利のカラクリ）</span>
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
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      <span>大手が手を出せず、客が一生逃げられない「4大独占構造」</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 max-w-sm font-sans leading-normal">
                      暴利でも客が群がるカラクリ、他社へ乗り換え不能にする罠、前金で手元に金が残る裏帳簿をすべて公開
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
          {/* TAB 4: 考察ノート ＆ AI壁打ち (NOTES) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'NOTES' && (
            <div className="space-y-5">
              <div className="border border-white/[0.08] rounded-md bg-[#0A0B10] p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white tracking-wider">
                      ANALYST_FIELD_NOTES: 極秘考察メモ
                    </span>
                  </div>
                  {analystNote && (
                    <span className="font-mono text-[10px] text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      自動保存済
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  {entity.name}の盲点・手口・原価構造から着想を得た独自の転用アイデアや、別市場へのスライド仮説を記録してください。このメモはAIとの壁打ちや独自アイデア創出の着火剤として読み込まれます。
                </p>

                <textarea
                  rows={5}
                  value={analystNote}
                  onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                  placeholder="例: このAPIラッパーの構造を士業の契約書レビューに応用できないか？ 初期の自演集客（Reddit）の代わりにXやnoteを活用し、初期100人を集める..."
                  className="w-full bg-[#060709] border border-white/[0.1] focus:border-white/[0.25] rounded p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  {onOpenSynthesisWithEntity && (
                    <button
                      onClick={() => onOpenSynthesisWithEntity(entity.id)}
                      className="w-full sm:flex-1 py-2 px-3 rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span>この銘柄のデータでAIと壁打ちする</span>
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
          )}

          {/* 全タブ共通: 最下部のアナリストクイックメモ */}
          {activeTab !== 'NOTES' && (
            <div className="border-t border-white/[0.06] pt-4 mt-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-zinc-500 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-zinc-400" />
                  アナリスト考察メモ（クリックして追記）
                </span>
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="font-mono text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                  >
                    <Bot className="w-3 h-3" />
                    AIと壁打ち
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder="この銘柄の転用メモ・着眼点を記録（自動保存）..."
                className="w-full bg-[#060709] border border-white/[0.06] focus:border-white/[0.2] rounded p-2 text-[11px] font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

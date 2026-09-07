'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FinancialEntity, IntelligenceTopicId } from '../../types/terminal';
import { INTELLIGENCE_DOSSIERS } from '../../data/intelligenceDossiers';
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
  FileText
} from 'lucide-react';

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
  initialTab?: TabType;
}

type TabType = 'CORE' | 'FINANCIALS' | 'PLAYBOOK';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
  onSelectTopic,
  initialTab = 'CORE',
}) => {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab')?.toUpperCase() as TabType | undefined;
  const resolvedTab = tabParam === 'CORE' || tabParam === 'FINANCIALS' || tabParam === 'PLAYBOOK' ? tabParam : initialTab;
  const [activeTab, setActiveTab] = useState<TabType>(resolvedTab);

  useEffect(() => {
    if (tabParam === 'CORE' || tabParam === 'FINANCIALS' || tabParam === 'PLAYBOOK') {
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
          <div className="px-3 pb-2 text-[11px] text-zinc-400 leading-snug font-sans truncate">
            {entity.tagline}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 【タブ切替バー: 3層特化 (CORE / FINANCIALS / PLAYBOOK)】 */}
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
            onClick={() => setActiveTab('FINANCIALS')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'FINANCIALS'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            財務・武器庫
          </button>
          <button
            onClick={() => setActiveTab('PLAYBOOK')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'PLAYBOOK'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            実務Playbook
          </button>
        </div>

        {/* ========================================================= */}
        {/* 【コンテンツゾーン: 明瞭なセクション区切り ＆ 高密度】 */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs font-sans">
          
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

              {/* #04 武器庫：ツールスタック */}
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                      #04
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        武器庫：ツールスタック ({entity.operations.toolStack.length}件)
                      </span>
                    </div>
                  </div>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    月額計: {formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}
                  </span>
                </div>
                <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] divide-y divide-white/[0.04] shadow-sm">
                  {entity.operations.toolStack.map((tool, idx) => (
                    <div key={idx} className="p-2.5 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{tool.name}</span>
                          <span className="text-zinc-500 text-[10px] font-mono">({tool.category})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 font-mono text-[10px] tabular-nums">
                            {formatMoney(tool.monthlyCost)}/月
                          </span>
                          {tool.url && (
                            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      {tool.purpose && (
                        <p className="text-[10px] text-zinc-400 leading-snug">
                          {tool.purpose}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: 実務Playbook (Tactics) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'PLAYBOOK' && (
            <div className="space-y-6">
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
                <span className="text-[9px] font-mono text-zinc-500">
                  DEEP AUDIT
                </span>
              </div>

              {/* 4大メタ分析モジュール群 (すりガラス遮断) */}
              <div className="relative pt-1">
                <div className="filter blur-[2.5px] opacity-25 select-none pointer-events-none space-y-3 text-xs font-sans">
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

                {/* 中央解錠ゲートウェイ */}
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
                    className="text-xs font-mono font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-4 py-1.5 rounded transition-colors shadow-2xl"
                  >
                    PROプランで独占の裏帳簿をすべて暴く (¥1,980〜)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  CreditCard,
  Layers,
  Flame,
  KeyRound,
  Wrench,
  Clock,
  Users,
  Lock
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
}

type TabType = 'ALL' | 'OVERVIEW' | 'PNL' | 'PLAYBOOK';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
}) => {
  const [copiedDm, setCopiedDm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDm(true);
    setTimeout(() => setCopiedDm(false), 2000);
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

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:w-[440px] lg:w-[470px] bg-[#08090C] border-t md:border-t-0 md:border-l border-white/[0.06] z-40 flex flex-col shrink-0 select-none overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="p-3 border-b border-white/[0.06] bg-[#07080B] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-zinc-300 font-bold shrink-0 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
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

        {/* タグライン */}
        <div className="px-3 py-1.5 bg-[#060709] border-b border-white/[0.04] text-[11px] text-zinc-400 leading-snug">
          {entity.tagline}
        </div>

        {/* 照射HUDステータスバー */}
        <div className="px-3 py-1 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>RAW AUDIT: 未公開財務実査照射中</span>
          </span>
          <span>
            推定年純利: <strong className="text-emerald-400 font-bold">{formatMoney(entity.pnl.estimatedAnnualNetProfit)}</strong>
          </span>
        </div>

        {/* タブ切り替え（静謐な無彩色） */}
        <div className="flex items-center border-b border-white/[0.06] bg-[#07080A] text-[11px] font-sans shrink-0">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
              activeTab === 'ALL'
                ? 'text-white border-white font-bold bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            全解剖 (ALL)
          </button>
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
              activeTab === 'OVERVIEW'
                ? 'text-white border-white font-medium bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            事業概要
          </button>
          <button
            onClick={() => setActiveTab('PNL')}
            className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
              activeTab === 'PNL'
                ? 'text-white border-white font-medium bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            P&L レントゲン
          </button>
          <button
            onClick={() => setActiveTab('PLAYBOOK')}
            className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
              activeTab === 'PLAYBOOK'
                ? 'text-white border-white font-medium bg-white/[0.04]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            実務Playbook
          </button>
        </div>

        {/* メイン詳細コンテンツ (高密度スクロールエリア) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs font-sans">
          {/* コアKPIストリップ */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'PNL') && (
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              <div className="bg-white/[0.02] border border-white/[0.06] p-2 rounded">
                <span className="text-[9px] text-zinc-500 block">直近月商</span>
                <span className="text-xs font-bold text-white tabular-nums block">
                  {formatMoney(entity.pnl.monthlyRevenue)}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] p-2 rounded">
                <span className="text-[9px] text-zinc-500 block">実効純手残り</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums block">
                  {formatMoney(entity.pnl.operatingProfit)}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] p-2 rounded">
                <span className="text-[9px] text-zinc-500 block">営業利益率</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums block">
                  {entity.pnl.operatingMargin}%
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] p-2 rounded">
                <span className="text-[9px] text-zinc-500 block">年成長率</span>
                <span className="text-xs font-bold text-zinc-200 tabular-nums block">
                  +{entity.growthRateYoY}%
                </span>
              </div>
            </div>
          )}

          {/* 損益流出ウォーターフォールバー (静謐な金融仕様) */}
          {(activeTab === 'ALL' || activeTab === 'PNL') && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-mono font-medium">損益流出ウォーターフォール (売上100%の分解)</span>
                <span className="text-emerald-400 font-mono font-bold">純利益: {profitPct}%</span>
              </div>
              <div className="w-full h-2 bg-black/60 rounded-xs overflow-hidden flex border border-white/[0.08]">
                {cogsPct > 0 && (
                  <div style={{ width: `${cogsPct}%` }} className="bg-zinc-600" title={`原価: ${cogsPct}%`} />
                )}
                {serverPct > 0 && (
                  <div style={{ width: `${serverPct}%` }} className="bg-zinc-700" title={`推論/サーバー: ${serverPct}%`} />
                )}
                {adPct > 0 && (
                  <div style={{ width: `${adPct}%` }} className="bg-zinc-500" title={`広告宣伝: ${adPct}%`} />
                )}
                {subPct > 0 && (
                  <div style={{ width: `${subPct}%` }} className="bg-zinc-700" title={`外注委託: ${subPct}%`} />
                )}
                {saasPct > 0 && (
                  <div style={{ width: `${saasPct}%` }} className="bg-zinc-800" title={`ツールSaaS: ${saasPct}%`} />
                )}
                {otherPct > 0 && (
                  <div style={{ width: `${otherPct}%` }} className="bg-zinc-800" title={`その他販管費: ${otherPct}%`} />
                )}
                {profitPct > 0 && (
                  <div style={{ width: `${profitPct}%` }} className="bg-emerald-500" title={`営業利益: ${profitPct}%`} />
                )}
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] font-mono text-zinc-500 pt-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-zinc-600" />原価 {cogsPct}%</span>
                {adPct > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-zinc-500" />広告 {adPct}%</span>}
                {serverPct > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-zinc-700" />基盤/API {serverPct}%</span>}
                {subPct > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-zinc-700" />外注 {subPct}%</span>}
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-emerald-500" /><strong className="text-emerald-400">純利益 {profitPct}%</strong></span>
              </div>
            </div>
          )}

          {/* 事業の正体 (Business Essence) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && entity.essence && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold text-[11px]">
                <Target className="w-3.5 h-3.5 text-zinc-400" />
                <span>事業の正体・提供価値 (Business DNA)</span>
              </div>
              <div className="space-y-1 text-[11px] leading-relaxed">
                <div>
                  <span className="text-zinc-500 font-mono text-[10px]">何屋か: </span>
                  <span className="text-zinc-200">{entity.essence.whatItDoes}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-mono text-[10px]">誰の財布: </span>
                  <span className="text-zinc-300">{entity.essence.targetCustomer}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-mono text-[10px]">切除する苦痛: </span>
                  <span className="text-zinc-300">{entity.essence.painRelief}</span>
                </div>
              </div>
            </div>
          )}

          {/* 突いた業界の盲点・不条理 */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
            (() => {
              const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
              return (
                <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    <span>突いた業界の盲点・不条理 (Market Glitch)</span>
                  </div>
                  {punchline && (
                    <div className="text-white font-bold text-[11px] leading-snug border-l-2 border-white/20 pl-2">
                      {punchline}
                    </div>
                  )}
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {detail}
                  </p>
                </div>
              );
            })()
          )}

          {/* 参入障壁 (7 Powers Moat) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
            (() => {
              const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
              return (
                <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                      <span>参入障壁の正体 (7 Powers Moat)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.08] px-1.5 py-0.2 rounded">
                      {entity.strategy.moatType}
                    </span>
                  </div>
                  {punchline && (
                    <div className="text-white font-bold text-[11px] leading-snug border-l-2 border-white/20 pl-2">
                      {punchline}
                    </div>
                  )}
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {detail}
                  </p>
                </div>
              );
            })()
          )}

          {/* 運用体制 ＆ 資本要件 */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                <span>運用体制 ＆ 資本要件</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  初期資本: {entity.operations.initialCapitalRequired === 0 ? '0円' : formatMoney(entity.operations.initialCapitalRequired)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-center text-[10px]">
                <div className="bg-white/[0.02] p-1.5 rounded border border-white/[0.03]">
                  <span className="text-zinc-500 block flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> 人数
                  </span>
                  <span className="text-white font-bold text-xs">{entity.operations.teamSize}人</span>
                </div>
                <div className="bg-white/[0.02] p-1.5 rounded border border-white/[0.03]">
                  <span className="text-zinc-500 block flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> 週実働
                  </span>
                  <span className="text-white font-bold text-xs">{entity.operations.weeklyHours}h</span>
                </div>
                <div className="bg-white/[0.02] p-1.5 rounded border border-white/[0.03]">
                  <span className="text-zinc-500 block flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" /> 自動化
                  </span>
                  <span className="text-emerald-400 font-bold text-xs">{entity.operations.automationLevel}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 武器庫：使用ツールスタック (無料公開はツール名と費用、詳細はPRO限定) */}
          {(activeTab === 'ALL' || activeTab === 'PNL' || activeTab === 'PLAYBOOK') && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                  <span>武器庫：使用ツールスタック ({entity.operations.toolStack.length}件)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  月額計: {formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}
                </span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {entity.operations.toolStack.map((tool, idx) => (
                  <div key={idx} className="bg-black/30 p-2 rounded border border-white/[0.03] space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
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
            </div>
          )}

          {/* P&L 詳細レントゲン */}
          {(activeTab === 'ALL' || activeTab === 'PNL') && (
            <div className="space-y-3 font-mono">
              <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-zinc-400">直近月商 (Revenue)</span>
                  <span className="text-white font-bold tabular-nums">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>- 売上原価 (COGS)</span>
                  <span className="tabular-nums text-zinc-400">
                    -{formatMoney(entity.pnl.cogs)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5 pt-1 text-zinc-300 font-medium">
                  <span>粗利益 (Gross Margin: {entity.pnl.grossMargin}%)</span>
                  <span className="tabular-nums text-white">
                    {formatMoney(entity.pnl.grossProfit)}
                  </span>
                </div>

                <div className="space-y-1 pt-1 text-[11px] text-zinc-500">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    販管費内訳 (Operating Expenses)
                  </div>
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
                  {entity.pnl.operatingExpenses.other > 0 && (
                    <div className="flex justify-between pl-2">
                      <span>その他販管費</span>
                      <span className="tabular-nums">{formatMoney(entity.pnl.operatingExpenses.other)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t border-white/[0.08] pt-2 text-xs">
                  <span className="text-white font-bold">営業利益 (純手残り: {entity.pnl.operatingMargin}%)</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {formatMoney(entity.pnl.operatingProfit)}/月
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 最初の100人を獲得した手順 */}
          {(activeTab === 'ALL' || activeTab === 'PLAYBOOK') && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>最初の100人を獲得した泥臭い手順 (Initial Traction)</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-300">
                {entity.strategy.initialTraction.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-black/20 p-1.5 rounded border border-white/[0.02]">
                    <span className="text-zinc-500 font-mono text-[10px] shrink-0">{idx + 1}.</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 再現実行ステップ */}
          {(activeTab === 'ALL' || activeTab === 'PLAYBOOK') && (
            <div className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>再現・実行 Playbook</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-zinc-300">
                {entity.strategy.actionPlaybook.map((step, idx) => (
                  <div key={idx} className="bg-black/30 p-2 rounded border border-white/[0.03] leading-relaxed">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 【PRO PAYWALL SECTION】今夜使えるズル・具体的実行兵器の遮断 */}
          {/* ========================================================= */}

          {/* 課金設計 ＆ 心理トリガー (PROペイウォール) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'PNL') && entity.pricing && (
            <div className="relative bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-[11px]">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>課金設計 ＆ 心理トリガー</span>
                </div>
                <span className="text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.08] px-1.5 py-0.2 rounded">
                  {entity.pricing.model}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 font-mono text-[10px]">
                <span>価格帯: <strong className="text-white font-sans">{entity.pricing.pricePoint}</strong></span>
                {entity.pricing.churnRate && (
                  <span>解約率: <strong className="text-zinc-200">{entity.pricing.churnRate}</strong></span>
                )}
              </div>

              {/* すりガラス遮断エリア */}
              <div className="relative mt-1">
                <div className="filter blur-[2px] opacity-30 select-none pointer-events-none p-2 bg-black/40 rounded border border-white/[0.03] text-[11px] text-zinc-300 leading-relaxed">
                  <span className="font-bold block text-[10px] mb-0.5">支払わせる本能の急所:</span>
                  {entity.pricing.psychologicalTrigger}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  <button
                    onClick={onOpenPro}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-white bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] px-2.5 py-1 rounded transition-colors shadow-lg"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>PRO限定：課金心理トリガーを解錠</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 大手が手を出せない構造的理由 (PROペイウォール) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && entity.strategy.incumbentDilemma && (
            <div className="relative bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-1.5 overflow-hidden">
              <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-[11px]">
                <Flame className="w-3.5 h-3.5 text-zinc-400" />
                <span>大手が構造上真似できない理由 (Incumbent Dilemma)</span>
              </div>
              {/* すりガラス遮断 */}
              <div className="relative">
                <p className="filter blur-[2px] opacity-30 select-none pointer-events-none text-zinc-400 text-[11px] leading-relaxed p-1">
                  {entity.strategy.incumbentDilemma}
                </p>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  <button
                    onClick={onOpenPro}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-white bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] px-2.5 py-1 rounded transition-colors shadow-lg"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>PRO限定：大手を無力化する急所を解錠</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 顧客獲得エンジン (PROペイウォール) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'PLAYBOOK') && entity.acquisition && (
            <div className="relative bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-zinc-400" />
                  <span>顧客獲得エンジン ＆ CAC</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  CAC: <strong className="text-emerald-400">{entity.acquisition.cacJpy === 0 ? '完全0円' : formatMoney(entity.acquisition.cacJpy)}</strong>
                </span>
              </div>
              {/* 主要動線は無料チラ見せ */}
              <div className="bg-black/30 p-2 rounded border border-white/[0.03] text-[11px] text-zinc-300">
                <span className="text-zinc-500 font-mono text-[10px] block mb-0.5">主要流入動線:</span>
                {entity.acquisition.primaryFunnel}
              </div>
              {/* 具体的ハックはすりガラス */}
              <div className="relative">
                <ul className="filter blur-[2px] opacity-30 select-none pointer-events-none space-y-1 text-[11px] text-zinc-400 pl-1">
                  {entity.acquisition.tactics.map((tactic, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-zinc-600 font-mono text-[10px]">▸</span>
                      <span>{tactic}</span>
                    </li>
                  ))}
                </ul>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  <button
                    onClick={onOpenPro}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-white bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] px-2.5 py-1 rounded transition-colors shadow-lg"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>PRO限定：顧客獲得の具体的手口を解錠</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* コールドDM実文テンプレート (PROペイウォール) */}
          {(activeTab === 'ALL' || activeTab === 'PLAYBOOK') && entity.strategy.coldOutreachTemplate && (
            <div className="relative bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-200">コールドDM実文テンプレート</span>
                <span className="text-[10px] font-mono text-zinc-500">成約率実証済み</span>
              </div>
              {/* すりガラス遮断 ＆ 解錠CTA */}
              <div className="relative">
                <pre className="filter blur-[2.5px] opacity-30 select-none pointer-events-none text-[10px] text-zinc-300 bg-black/50 p-2.5 rounded whitespace-pre-wrap font-sans border border-white/[0.04] leading-relaxed">
                  {entity.strategy.coldOutreachTemplate}
                </pre>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded gap-1.5 p-3 text-center">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-200">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>成約率15〜20%を記録した実文テンプレート</span>
                  </div>
                  <button
                    onClick={onOpenPro}
                    className="text-[11px] font-mono font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-3 py-1 rounded transition-colors shadow-xl"
                  >
                    PROプランで実文をコピー (¥1,980〜)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 特別会員限定・裏帳簿インサイト (PROペイウォール) */}
          {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'PLAYBOOK') && entity.strategy.secretInsight && (
            <div className="relative bg-white/[0.02] border border-white/[0.06] p-2.5 rounded space-y-1.5 overflow-hidden">
              <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-[11px]">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>裏帳簿の秘密インサイト（現場の非公開ハック）</span>
              </div>
              {/* すりガラス遮断 */}
              <div className="relative">
                <p className="filter blur-[2.5px] opacity-30 select-none pointer-events-none text-[11px] text-zinc-300 leading-relaxed bg-black/40 p-2 rounded border border-white/[0.03]">
                  {entity.strategy.secretInsight}
                </p>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                  <button
                    onClick={onOpenPro}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-white bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] px-2.5 py-1 rounded transition-colors shadow-lg"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>PRO限定：非公開ハックを解錠</span>
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

'use client';

import React, { useState, useEffect } from 'react';
import { FinancialEntity } from '../../types/terminal';
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
  Zap
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

type TabType = 'CORE' | 'FINANCIALS' | 'PLAYBOOK';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('CORE');

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

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:w-[450px] lg:w-[470px] bg-[#08090C] border-t md:border-t-0 md:border-l border-white/[0.06] z-40 flex flex-col shrink-0 select-none overflow-hidden shadow-2xl">
        
        {/* ========================================================= */}
        {/* 【上部固定ゾーン 1: ヘッダー ＆ ナビゲーション】 */}
        {/* ========================================================= */}
        <div className="p-3 border-b border-white/[0.06] bg-[#07080B] flex items-center justify-between shrink-0">
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

        {/* ========================================================= */}
        {/* 【上部固定ゾーン 2: 計器盤 Executive KPI Strip ＆ ウォーターフォール】 */}
        {/* ========================================================= */}
        <div className="bg-[#060709] border-b border-white/[0.06] p-3 space-y-2.5 shrink-0">
          {/* タグライン */}
          <div className="text-[11px] text-zinc-400 leading-snug font-sans truncate">
            {entity.tagline}
          </div>

          {/* 4連コアKPI（カードではなく高密度1行ストリップ） */}
          <div className="grid grid-cols-4 gap-2 font-mono py-1 border-y border-white/[0.04]">
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase">月商 (Rev)</span>
              <span className="text-xs font-bold text-white tabular-nums">
                {formatMoney(entity.pnl.monthlyRevenue)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase">純手残り (Net)</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {formatMoney(entity.pnl.operatingProfit)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase">利益率 (Margin)</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {entity.pnl.operatingMargin}%
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase">年成長率 (YoY)</span>
              <span className="text-xs font-bold text-zinc-200 tabular-nums">
                +{entity.growthRateYoY}%
              </span>
            </div>
          </div>

          {/* 損益流出ウォーターフォールバー (静謐な金融仕様) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span className="text-zinc-500">損益流出分解 (100%基準)</span>
              <span className="text-emerald-400 font-bold">手残り純利益 {profitPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded-xs overflow-hidden flex border border-white/[0.08]">
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

        {/* ========================================================= */}
        {/* 【タブ切替バー: 3層特化 (ALL全廃)】 */}
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
        {/* 【下部コンテンツゾーン: スクロール最小・高密度テーブル】 */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs font-sans">
          
          {/* ------------------------------------------------------- */}
          {/* TAB 1: 事業DNA (Core) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'CORE' && (
            <div className="space-y-3.5">
              {/* 事業の正体 (Key-Valueテーブル形式) */}
              {entity.essence && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    事業の正体・構造仕様 (Business DNA)
                  </div>
                  <div className="border border-white/[0.06] rounded bg-white/[0.01] divide-y divide-white/[0.04]">
                    <div className="p-2 flex items-start gap-2">
                      <span className="w-20 text-[10px] font-mono text-zinc-500 shrink-0">何屋か</span>
                      <span className="text-zinc-200 text-[11px] leading-relaxed font-medium">{entity.essence.whatItDoes}</span>
                    </div>
                    <div className="p-2 flex items-start gap-2">
                      <span className="w-20 text-[10px] font-mono text-zinc-500 shrink-0">誰の財布</span>
                      <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.targetCustomer}</span>
                    </div>
                    <div className="p-2 flex items-start gap-2">
                      <span className="w-20 text-[10px] font-mono text-zinc-500 shrink-0">切除する苦痛</span>
                      <span className="text-zinc-300 text-[11px] leading-relaxed">{entity.essence.painRelief}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 突いた業界の盲点・不条理 */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3 text-zinc-400" />
                      <span>突いた業界の盲点 (Market Glitch)</span>
                    </div>
                    <div className="border border-white/[0.06] rounded bg-white/[0.01] p-2.5 space-y-1.5">
                      {punchline && (
                        <div className="text-white font-bold text-[11px] leading-snug border-l-2 border-white/40 pl-2">
                          {punchline}
                        </div>
                      )}
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {detail}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* 参入障壁の正体 (Moat) */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-zinc-400" />
                        <span>参入障壁 (7 Powers Moat)</span>
                      </span>
                      <span className="bg-white/[0.04] text-zinc-400 border border-white/[0.08] px-1 py-0.2 rounded text-[9px]">
                        {entity.strategy.moatType}
                      </span>
                    </div>
                    <div className="border border-white/[0.06] rounded bg-white/[0.01] p-2.5 space-y-1.5">
                      {punchline && (
                        <div className="text-white font-bold text-[11px] leading-snug border-l-2 border-white/40 pl-2">
                          {punchline}
                        </div>
                      )}
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {detail}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* 大手が手を出せない理由 */}
              {entity.strategy.incumbentDilemma && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <Flame className="w-3 h-3 text-zinc-400" />
                    <span>大手が構造上真似できない理由 (Incumbent Dilemma)</span>
                  </div>
                  <div className="border border-white/[0.06] rounded bg-white/[0.01] p-2.5">
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      {entity.strategy.incumbentDilemma}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 2: 財務・武器庫 (Financials) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'FINANCIALS' && (
            <div className="space-y-3.5">
              {/* P&L 会計スプレッドシートテーブル */}
              <div className="space-y-1.5 font-mono">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  月次損益実査テーブル (P&L Audit)
                </div>
                <div className="border border-white/[0.06] rounded bg-white/[0.01] divide-y divide-white/[0.04] text-xs">
                  <div className="p-2 flex justify-between items-center">
                    <span className="text-zinc-400">直近月商 (Gross Revenue)</span>
                    <span className="text-white font-bold tabular-nums">{formatMoney(entity.pnl.monthlyRevenue)}</span>
                  </div>
                  <div className="p-2 flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 pl-2">└ 売上原価 (COGS)</span>
                    <span className="text-zinc-400 tabular-nums">-{formatMoney(entity.pnl.cogs)}</span>
                  </div>
                  <div className="p-2 flex justify-between items-center bg-white/[0.02]">
                    <span className="text-zinc-300 font-medium">粗利益 (Gross Profit: {entity.pnl.grossMargin}%)</span>
                    <span className="text-white font-medium tabular-nums">{formatMoney(entity.pnl.grossProfit)}</span>
                  </div>
                  <div className="p-2 space-y-1 text-[11px] text-zinc-500">
                    <div className="text-[10px] text-zinc-600 uppercase">販管費内訳 (OPEX)</div>
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
                  <div className="p-2 flex justify-between items-center border-t border-white/[0.08] bg-emerald-950/10">
                    <span className="text-white font-bold">営業利益 (純手残り: {entity.pnl.operatingMargin}%)</span>
                    <span className="text-emerald-400 font-bold tabular-nums text-xs">
                      {formatMoney(entity.pnl.operatingProfit)}/月
                    </span>
                  </div>
                </div>
              </div>

              {/* 運用体制 ＆ 資本要件 */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  運用体制 ＆ 初期資本
                </div>
                <div className="border border-white/[0.06] rounded bg-white/[0.01] grid grid-cols-3 divide-x divide-white/[0.04] p-2 font-mono text-center text-[10px]">
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
              </div>

              {/* 武器庫：ツールスタック (高密度行テーブル) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-zinc-400" />
                    <span>武器庫：ツールスタック ({entity.operations.toolStack.length}件)</span>
                  </span>
                  <span>月額計: {formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}</span>
                </div>
                <div className="border border-white/[0.06] rounded bg-white/[0.01] divide-y divide-white/[0.04]">
                  {entity.operations.toolStack.map((tool, idx) => (
                    <div key={idx} className="p-2 space-y-0.5">
                      <div className="flex justify-between items-center text-[11px]">
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
                        <p className="text-[10px] text-zinc-500 leading-snug">
                          {tool.purpose}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: 実務Playbook (Tactics) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'PLAYBOOK' && (
            <div className="space-y-3.5">
              {/* 最初の100人を獲得した手順 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <Users className="w-3 h-3 text-zinc-400" />
                  <span>最初の100人を獲得した泥臭い手順</span>
                </div>
                <div className="border border-white/[0.06] rounded bg-white/[0.01] divide-y divide-white/[0.04]">
                  {entity.strategy.initialTraction.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-start gap-2 text-[11px] text-zinc-300">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 再現実行ステップ */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-zinc-400" />
                  <span>再現・実行 Playbook</span>
                </div>
                <div className="border border-white/[0.06] rounded bg-white/[0.01] divide-y divide-white/[0.04]">
                  {entity.strategy.actionPlaybook.map((step, idx) => (
                    <div key={idx} className="p-2 text-[11px] text-zinc-300 leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* 顧客獲得動線 (無料サマリー) */}
              {entity.acquisition && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-zinc-400" />
                      <span>顧客獲得動線</span>
                    </span>
                    <span>CAC: <strong className="text-emerald-400">{entity.acquisition.cacJpy === 0 ? '0円' : formatMoney(entity.acquisition.cacJpy)}</strong></span>
                  </div>
                  <div className="border border-white/[0.06] rounded bg-white/[0.01] p-2 text-[11px] text-zinc-300">
                    {entity.acquisition.primaryFunnel}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 【単一 PRO Vault（黒金庫）】画面最下部に集約配置 */}
          {/* ========================================================= */}
          <div className="relative border border-white/[0.08] rounded bg-[#0A0B0E] p-3 space-y-2 overflow-hidden shadow-xl mt-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider">
                  PRO VAULT: 実戦裏帳簿アセット
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                LOCKED ASSETS
              </span>
            </div>

            {/* すりガラス遮断エリア (課金トリガー ＆ コールドDM実文 ＆ 非公開ハック) */}
            <div className="relative">
              <div className="filter blur-[2px] opacity-25 select-none pointer-events-none space-y-2 text-[10px] text-zinc-400 font-mono leading-relaxed">
                <div>
                  <span className="text-zinc-300 font-bold block">【課金の心理トリガー】</span>
                  {entity.pricing?.psychologicalTrigger || '顧客が抗えずに金を払う深層心理トリガー'}
                </div>
                <div>
                  <span className="text-zinc-300 font-bold block">【成約コールドDM実文】</span>
                  {entity.strategy.coldOutreachTemplate || '件名: 〇〇様、先日の調達おめでとうございます...'}
                </div>
                <div>
                  <span className="text-zinc-300 font-bold block">【現場の非公開ハック】</span>
                  {entity.strategy.secretInsight || 'GPUサーバーレス推論の待機コストを完全ゼロにする独自バッチ構成'}
                </div>
              </div>

              {/* 中央解錠ゲートウェイ */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded gap-2 p-3 text-center">
                <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-300" />
                  <span>成約DM実文 ＆ 課金トリガー ＆ 非公開ハック</span>
                </div>
                <button
                  onClick={onOpenPro}
                  className="text-xs font-mono font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-4 py-1.5 rounded transition-colors shadow-2xl"
                >
                  PROプランで全アセットを解錠 (¥1,980〜)
                </button>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

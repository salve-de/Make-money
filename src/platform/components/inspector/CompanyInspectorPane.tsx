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
  ShieldCheck
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
}

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
}) => {
  const [copiedDm, setCopiedDm] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PNL' | 'PLAYBOOK'>('OVERVIEW');

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

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:w-96 lg:w-[400px] bg-[#08090C] border-t md:border-t-0 md:border-l border-white/[0.06] z-40 flex flex-col shrink-0 select-none overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="p-3 border-b border-white/[0.06] bg-[#07080B] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-zinc-500 shrink-0">
              {entity.ticker}
            </span>
            <div className="truncate">
              <h2 className="text-xs font-medium text-white truncate font-sans">
                {entity.name}
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono block">
                {entity.legalEntity || entity.founder}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* J/K ナビゲーション */}
            <div className="hidden sm:flex items-center gap-0.5 mr-1 font-mono text-[10px] text-zinc-500">
              <button
                onClick={onPrevEntity}
                disabled={!onPrevEntity}
                className="p-1 hover:text-white disabled:opacity-20"
                title="前銘柄 (K)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <kbd className="bg-white/[0.04] px-1 rounded text-zinc-500">J/K</kbd>
              <button
                onClick={onNextEntity}
                disabled={!onNextEntity}
                className="p-1 hover:text-white disabled:opacity-20"
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
              className="p-1 text-zinc-500 hover:text-white"
              title="公式サイトを開く"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* クローズボタン */}
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* タブ切り替え（モノトーン） */}
        <div className="flex items-center border-b border-white/[0.06] bg-[#07080A] text-[11px] font-sans">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-2 text-center transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'text-white border-b-2 border-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            事業概要
          </button>
          <button
            onClick={() => setActiveTab('PNL')}
            className={`flex-1 py-2 text-center transition-colors ${
              activeTab === 'PNL'
                ? 'text-white border-b-2 border-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            P&L レントゲン
          </button>
          <button
            onClick={() => setActiveTab('PLAYBOOK')}
            className={`flex-1 py-2 text-center transition-colors ${
              activeTab === 'PLAYBOOK'
                ? 'text-white border-b-2 border-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            実務Playbook
          </button>
        </div>

        {/* メイン詳細コンテンツ */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs font-sans">
          {activeTab === 'OVERVIEW' && (
            <>
              {/* コアKPIストリップ */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded">
                  <span className="text-[10px] text-zinc-500 block">直近月商</span>
                  <span className="text-sm font-medium text-white tabular-nums">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded">
                  <span className="text-[10px] text-zinc-500 block">実効純利益 / 月</span>
                  <span className="text-sm font-medium text-zinc-200 tabular-nums">
                    {formatMoney(entity.pnl.operatingProfit)}
                  </span>
                </div>
              </div>

              {/* 突いた業界の盲点 */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
                return (
                  <div className="bg-amber-950/20 border border-amber-800/40 p-2.5 rounded space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>突いた業界の盲点・不条理</span>
                    </div>
                    {punchline ? (
                      <>
                        <div className="text-amber-200 font-bold text-[12px] leading-snug">
                          {punchline}
                        </div>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                          {detail}
                        </p>
                      </>
                    ) : (
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* 参入障壁 (7 Powers Moat) */}
              {(() => {
                const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
                return (
                  <div className="bg-emerald-950/20 border border-emerald-800/40 p-2.5 rounded space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>参入障壁の正体 (Moat)</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                        {entity.strategy.moatType}
                      </span>
                    </div>
                    {punchline ? (
                      <>
                        <div className="text-emerald-200 font-bold text-[12px] leading-snug">
                          {punchline}
                        </div>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                          {detail}
                        </p>
                      </>
                    ) : (
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* 運用体制 */}
              <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded space-y-2">
                <div className="text-[11px] font-medium text-zinc-400">
                  体制 ＆ 自動化度
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-center text-[10px]">
                  <div className="bg-white/[0.02] p-1.5 rounded">
                    <span className="text-zinc-500 block">人数</span>
                    <span className="text-white">{entity.operations.teamSize}人</span>
                  </div>
                  <div className="bg-white/[0.02] p-1.5 rounded">
                    <span className="text-zinc-500 block">週実働</span>
                    <span className="text-white">{entity.operations.weeklyHours}h</span>
                  </div>
                  <div className="bg-white/[0.02] p-1.5 rounded">
                    <span className="text-zinc-500 block">自動化</span>
                    <span className="text-white">{entity.operations.automationLevel}%</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'PNL' && (
            <div className="space-y-3 font-mono">
              <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-zinc-500">直近月商 (Revenue)</span>
                  <span className="text-white tabular-nums">
                    {formatMoney(entity.pnl.monthlyRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>- 売上原価 (COGS)</span>
                  <span className="tabular-nums">
                    {formatMoney(entity.pnl.cogs)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5 pt-1 text-zinc-300 font-medium">
                  <span>粗利益 (Gross: {entity.pnl.grossMargin}%)</span>
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
                </div>

                <div className="flex justify-between border-t border-white/[0.08] pt-2 text-xs">
                  <span className="text-white font-medium">営業利益 (純手残り: {entity.pnl.operatingMargin}%)</span>
                  <span className="text-white font-medium tabular-nums">
                    {formatMoney(entity.pnl.operatingProfit)}/月
                  </span>
                </div>
              </div>

              {/* 使用ツール一覧 */}
              <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded space-y-1.5">
                <div className="text-[11px] font-medium text-zinc-400 font-sans">
                  使用ツールスタック
                </div>
                <div className="space-y-1 text-[11px]">
                  {entity.operations.toolStack.map((tool, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                      <div>
                        <span className="text-zinc-200">{tool.name}</span>
                        <span className="text-zinc-600 text-[10px] ml-1.5 font-sans">({tool.category})</span>
                      </div>
                      <span className="text-zinc-500 tabular-nums">
                        {formatMoney(tool.monthlyCost)}/月
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PLAYBOOK' && (
            <div className="space-y-3">
              {/* 最初の100人を獲得した手順 */}
              <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded space-y-2">
                <div className="text-[11px] font-medium text-white">
                  最初の100人を獲得した手順
                </div>
                <ul className="space-y-1.5 text-[11px] text-zinc-300">
                  {entity.strategy.initialTraction.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 再現実行ステップ */}
              <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded space-y-2">
                <div className="text-[11px] font-medium text-zinc-400">
                  再現・実行 Playbook
                </div>
                <div className="space-y-1.5 text-[11px] text-zinc-300">
                  {entity.strategy.actionPlaybook.map((step, idx) => (
                    <div key={idx} className="bg-white/[0.01] p-2 rounded border border-white/[0.03]">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* コールドDM実文 */}
              {entity.strategy.coldOutreachTemplate && (
                <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400">コールドDM実文テンプレート</span>
                    <button
                      onClick={() => copyToClipboard(entity.strategy.coldOutreachTemplate!)}
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] px-2 py-0.5 rounded transition-colors"
                    >
                      {copiedDm ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDm ? 'コピー済' : 'コピー'}</span>
                    </button>
                  </div>
                  <pre className="text-[10px] text-zinc-300 bg-black/40 p-2 rounded whitespace-pre-wrap font-sans border border-white/[0.03] leading-relaxed">
                    {entity.strategy.coldOutreachTemplate}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

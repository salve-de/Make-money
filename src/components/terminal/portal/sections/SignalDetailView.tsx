'use client';

import React from 'react';
import { PORTAL_SIGNALS } from '@/data/portalSignals';
import { CompanyRecord } from '@/types/terminal';

interface SignalDetailViewProps {
  signalId: string;
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onBackToSignalsList: () => void;
  onBackToPortal: () => void;
}

export const SignalDetailView: React.FC<SignalDetailViewProps> = ({
  signalId,
  companies,
  onSelectCompany,
  onBackToSignalsList,
  onBackToPortal,
}) => {
  const signal = PORTAL_SIGNALS.find((s) => s.id === signalId) || PORTAL_SIGNALS[0];
  const relatedCompanies = companies.filter((c) => signal.relatedCompanyIds.includes(c.id));

  return (
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 flex-wrap">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors"
            >
              ポータル・トップ
            </button>
            <span className="text-zinc-600">/</span>
            <button
              onClick={onBackToSignalsList}
              className="hover:text-white transition-colors"
            >
              市場シグナル一覧
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">{signal.title}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {signal.badge}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {signal.demandMetric} • {signal.competitionMetric}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {signal.title}
            </h1>
            <p className="text-sm text-zinc-300 font-medium">
              {signal.catchphrase}
            </p>
          </div>
        </div>
      </div>

      {/* メイン詳細ボディ */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* 指標マトリクス */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">想定元手</span>
            <span className="text-sm font-bold text-white">{signal.estimatedCapital}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">想定月利</span>
            <span className="text-sm font-bold text-emerald-400">{signal.estimatedMonthlyProfit}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">粗利率</span>
            <span className="text-sm font-bold text-white">{signal.grossMargin}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">投資回収期間</span>
            <span className="text-sm font-bold text-white">{signal.paybackDays}</span>
          </div>
        </div>

        {/* 概要リード */}
        <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            概要・シグナル検知サマリー
          </span>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
            {signal.summary}
          </p>
          <div className="pt-2 text-xs font-mono text-zinc-400 border-t border-zinc-800/60">
            主なターゲット市場: <span className="text-white font-medium">{signal.targetMarket}</span>
          </div>
        </div>

        {/* 1. なぜ今この歪みが発生しているのか */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">MARKET GLITCH ORIGIN</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              1. なぜ今この歪みが発生しているのか？（構造的要因）
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {signal.glitchOrigin.map((g, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-400 font-bold">要点 0{idx + 1}</span>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">{g.heading}</h3>
                <p className="text-xs text-zinc-400 font-normal leading-relaxed">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 完コピ参入手順書 */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">EXECUTION PLAYBOOK</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              2. 参入・収益化の実行手順（3ステップ）
            </h2>
          </div>

          <div className="space-y-3">
            {signal.monetizationTactics.map((t, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1.5 flex flex-col sm:flex-row sm:items-start gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-300 shrink-0 self-start">
                  {t.step}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t.action}</h3>
                  <p className="text-xs text-zinc-400 font-normal leading-relaxed">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 必要な武器・ツール */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">ESSENTIAL WEAPONS</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              3. 実戦で必要なツールスタック
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {signal.essentialTools.map((tool, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
                <div className="text-xs font-bold text-white">{tool.name}</div>
                <div className="text-[11px] text-zinc-400 font-normal">{tool.role}</div>
                <div className="text-[10px] font-mono text-zinc-300 pt-1 border-t border-zinc-800/60">
                  コスト: {tool.cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 注意事項・地雷回避 */}
        <div className="p-4 rounded-lg bg-[#0E1015] border border-amber-900/40 space-y-1">
          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
            防衛警告：初心者が陥りがちな落とし穴
          </span>
          <p className="text-xs text-zinc-300 leading-relaxed font-normal">
            {signal.cautionRisk}
          </p>
        </div>

        {/* 関連実在台帳 */}
        {relatedCompanies.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                関連する実在ビジネス台帳（損益計算書・ツール内訳）
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedCompanies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-white group-hover:text-zinc-200 transition-colors">
                      {c.japaneseName}
                    </span>
                    <span className="text-xs font-mono text-zinc-400 group-hover:text-white">
                      台帳を開く →
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 font-normal">{c.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

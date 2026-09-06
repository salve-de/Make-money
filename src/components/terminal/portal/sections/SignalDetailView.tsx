'use client';

import React from 'react';
import { PORTAL_SIGNALS } from '@/data/portalSignals';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';

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
    <div className="flex-1 bg-slate-50 overflow-y-auto font-sans text-slate-900">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 shadow-xs">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 flex-wrap">
            <button
              onClick={onBackToPortal}
              className="hover:text-slate-900 transition-colors font-semibold"
            >
              ポータル・トップ
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={onBackToSignalsList}
              className="hover:text-slate-900 transition-colors font-semibold"
            >
              市場シグナル一覧
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">{signal.title}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {signal.badge}
              </span>
              <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {signal.demandMetric}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {signal.competitionMetric}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {signal.title}
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              {signal.catchphrase}
            </p>
          </div>
        </div>
      </div>

      {/* メイン詳細ボディ */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* 指標マトリクス */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] text-slate-500 block">想定元手</span>
            <span className="text-sm font-bold text-slate-800">{signal.estimatedCapital}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-1">
            <span className="text-[10px] text-emerald-700 block font-semibold">想定月利</span>
            <span className="text-sm font-bold text-emerald-700">{signal.estimatedMonthlyProfit}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] text-slate-500 block">粗利率</span>
            <span className="text-sm font-bold text-slate-800">{signal.grossMargin}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] text-slate-500 block">投資回収期間</span>
            <span className="text-sm font-bold text-slate-800">{signal.paybackDays}</span>
          </div>
        </div>

        {/* 概要リード */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase tracking-wider">
            概要・シグナル検知サマリー
          </span>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {signal.summary}
          </p>
          <div className="pt-2 text-xs font-mono text-slate-500 border-t border-slate-100">
            主なターゲット市場: <span className="text-slate-900 font-semibold">{signal.targetMarket}</span>
          </div>
        </div>

        {/* 1. なぜ今この歪みが発生しているのか */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MARKET GLITCH ORIGIN</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              1. なぜ今この歪みが発生しているのか？（構造的要因）
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {signal.glitchOrigin.map((g, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
                <span className="text-[10px] font-mono text-indigo-600 font-bold">要点 0{idx + 1}</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{g.heading}</h3>
                <p className="text-xs text-slate-500 font-normal leading-relaxed">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 完コピ参入手順書 */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">EXECUTION PLAYBOOK</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              2. 参入・収益化の実行手順（3ステップ）
            </h2>
          </div>

          <div className="space-y-3">
            {signal.monetizationTactics.map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5 flex flex-col sm:flex-row sm:items-start gap-3">
                <span className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 font-mono text-[10px] text-indigo-700 font-bold shrink-0 self-start">
                  {t.step}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{t.action}</h3>
                  <p className="text-xs text-slate-500 font-normal leading-relaxed">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 必要な武器・ツール */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">ESSENTIAL WEAPONS</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              3. 実戦で必要なツールスタック
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {signal.essentialTools.map((tool, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-900">{tool.name}</div>
                <div className="text-[11px] text-slate-500 font-normal">{tool.role}</div>
                <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-100">
                  コスト: {tool.cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 参入リスク要因と防衛策 */}
        <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
          <span className="text-[10px] font-mono text-amber-800 font-bold uppercase">
            参入リスク要因：事前に考慮すべき構造的障壁
          </span>
          <p className="text-xs text-amber-900/90 leading-relaxed font-normal">
            {signal.cautionRisk}
          </p>
        </div>

        {/* 関連実在台帳 */}
        {relatedCompanies.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                関連する実在ビジネス台帳（損益計算書・ツール内訳）
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedCompanies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                >
                  <div className="flex items-center gap-3">
                    <CompanyLogo name={c.name} size="sm" category={c.category} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {c.japaneseName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {c.teamSize === 1 ? '完全1人' : `${c.teamSize}名運営`}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                      台帳を開く →
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 font-normal leading-relaxed">{c.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';
import { StatistaDualView } from './StatistaDualView';

interface MainAnalysisViewProps {
  company: CompanyRecord;
  onOpenOfferModal?: () => void;
  onOpenProModal?: () => void;
}

export type AnalysisTab = 'FINANCIALS' | 'OVERVIEW' | 'MOAT' | 'STACK' | 'COMPETITORS';

export const MainAnalysisView: React.FC<MainAnalysisViewProps> = ({
  company,
  onOpenOfferModal,
  onOpenProModal
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('FINANCIALS');

  const getMoatPowerName = (moat: MoatPower) => {
    switch (moat) {
      case 'PROCESS_POWER': return '組織プロセスパワー';
      case 'NETWORK_EFFECTS': return 'ネットワーク効果';
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング (逆張り対抗)';
      case 'SWITCHING_COSTS': return 'スイッチングコスト (高移行障壁)';
      case 'BRANDING': return 'ブランド力 (第一想起独占)';
      case 'CORNERED_RESOURCE': return '独占的資源 (特許・独占契約)';
      case 'SCALE_ECONOMIES': return '規模の経済 (限界費用低下)';
    }
  };

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(2)}兆`;
    }
    if (valJpy >= 100000000) {
      return `¥${(valJpy / 100000000).toFixed(1)}億円`;
    }
    return `¥${(valJpy / 10000).toFixed(0)}万円`;
  };

  const tabs: { id: AnalysisTab; label: string }[] = [
    { id: 'FINANCIALS', label: '損益計算書 (財務諸表分析)' },
    { id: 'OVERVIEW', label: '事業概要 (ビジネスモデル)' },
    { id: 'MOAT', label: '参入障壁 (七つの堀)' },
    { id: 'STACK', label: '使用道具・設備 (技術スタック)' },
    { id: 'COMPETITORS', label: '競合比較 (業界マトリクス)' }
  ];

  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto flex flex-col p-5 select-none">
      {/* 1. 企業ヘッドライン・概要バー */}
      <div className="border-b border-white/[0.08] pb-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                {company.japaneseName}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-400">
                {company.ticker}
              </span>
              {company.verifiedStatus === 'AUDITED_PUBLIC' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  有価証券報告書監査済
                </span>
              )}
              {company.verifiedStatus === 'VERIFIED_STRIPE' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  Stripe生データ連携済
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              {company.tagline}
            </p>
          </div>

          {/* 右バリュー・アクション */}
          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <div className="text-[10px] text-zinc-500">想定事業価値</div>
              <div className="text-sm font-bold text-zinc-100">
                {formatShortAmount(company.estimatedValuationJpy)}
              </div>
            </div>

            {company.isForSale && (
              <button
                onClick={onOpenOfferModal}
                className="h-8 px-3 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded transition-colors"
              >
                買収・出資打診
              </button>
            )}
          </div>
        </div>

        {/* メタデータバッジ群（Apple HIG基準） */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-zinc-400 font-mono">
          <div className="px-2 py-0.5 rounded bg-zinc-850 border border-white/5">
            創業: {company.foundedYear}年
          </div>
          <div className="px-2 py-0.5 rounded bg-zinc-850 border border-white/5">
            体制: {company.teamSize}名 (週{company.weeklyHours}h)
          </div>
          <div className="px-2 py-0.5 rounded bg-zinc-850 border border-white/5">
            拠点: {company.headquarters}
          </div>
          <div className="px-2 py-0.5 rounded bg-zinc-850 border border-white/5 text-amber-300">
            堀スコア: {company.moatScore}点
          </div>
        </div>
      </div>

      {/* 2. Apple型セグメントコントロールタブ */}
      <div className="mb-4">
        <div className="h-9 bg-[#14161C] p-1 rounded-lg border border-white/[0.08] flex items-center overflow-x-auto no-scrollbar gap-1 max-w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 h-full text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. タブコンテンツ */}
      <div className="flex-1 space-y-4">
        {/* ① 損益計算書タブ (スタティスタ型二重表示) */}
        {activeTab === 'FINANCIALS' && (
          <div className="space-y-4">
            <StatistaDualView
              financials={company.financials}
              companyName={company.japaneseName}
              actionHeadline={company.actionHeadline}
            />

            {/* ユニットエコノミクス分析カード */}
            {(company.cacJpy !== undefined || company.ltvJpy !== undefined) && (
              <div className="bg-[#13151A] border border-white/[0.08] rounded-lg p-4">
                <div className="text-[10px] font-mono text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                  UNIT ECONOMICS & COHORT
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-zinc-850/50 rounded border border-white/5">
                    <div className="text-zinc-500 text-[10px]">顧客獲得費用 (CAC)</div>
                    <div className="text-base font-bold text-zinc-200">
                      {company.cacJpy === 0 ? '¥0 (完全自然流入)' : `¥${company.cacJpy?.toLocaleString()}`}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-850/50 rounded border border-white/5">
                    <div className="text-zinc-500 text-[10px]">顧客生涯価値 (LTV)</div>
                    <div className="text-base font-bold text-zinc-200">
                      ¥{company.ltvJpy?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-850/50 rounded border border-white/5">
                    <div className="text-zinc-500 text-[10px]">LTV / CAC 倍率</div>
                    <div className="text-base font-bold text-emerald-400">
                      {company.ltvCacRatio}x
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-850/50 rounded border border-white/5">
                    <div className="text-zinc-500 text-[10px]">月次解約率 (Churn)</div>
                    <div className="text-base font-bold text-zinc-200">
                      {company.monthlyChurnPercent}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ② 事業概要タブ */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4">
            <div className="bg-[#13151A] border border-white/[0.08] rounded-lg p-5">
              <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                EXECUTIVE BUSINESS SUMMARY
              </h3>
              <p className="text-sm text-zinc-200 leading-relaxed font-sans mb-4">
                {company.executiveSummary}
              </p>

              <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                0から1への初期集客・牽引力獲得手順 (INITIAL TRACTION)
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-sans p-3 bg-zinc-850/60 rounded border border-white/5">
                {company.initialTractionStrategy}
              </p>
            </div>
          </div>
        )}

        {/* ③ 参入障壁（七つの堀）タブ */}
        {activeTab === 'MOAT' && (
          <div className="space-y-4">
            <div className="bg-[#13151A] border border-white/[0.08] rounded-lg p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">中核となる堀 (7 POWERS)</span>
                  <div className="text-base font-bold text-indigo-400">
                    {getMoatPowerName(company.primaryMoat)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-500">独占防壁スコア</span>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {company.moatScore}<span className="text-xs text-zinc-500">/100</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-zinc-200 leading-relaxed mb-4">
                {company.coreMoatDescription}
              </div>

              {/* 堀の解説ブロック */}
              <div className="p-3 bg-zinc-850/40 rounded border border-white/5 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">アナリスト評価: </span>
                他社が同等の資本を投下しても模倣に最低3年〜5年を要する構造的優位性が担保されています。価格競争に巻き込まれず、継続的に価格決定権（Pricing Power）を行使可能な体質です。
              </div>
            </div>
          </div>
        )}

        {/* ④ 使用道具・設備タブ */}
        {activeTab === 'STACK' && (
          <div className="bg-[#13151A] border border-white/[0.08] rounded-lg p-5">
            <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              稼働ソフトウェア・インフラ・設備スタック
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                    <th className="py-2 text-left font-medium">ツール・設備名</th>
                    <th className="py-2 text-left font-medium">カテゴリ</th>
                    <th className="py-2 text-right font-medium">推定月額費用</th>
                    <th className="py-2 text-left font-medium pl-4">用途・役割</th>
                    <th className="py-2 text-center font-medium">代替難易度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {company.tools.map((t, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                      <td className="py-2.5 font-semibold text-zinc-100">{t.name}</td>
                      <td className="py-2.5 text-zinc-400">{t.category}</td>
                      <td className="py-2.5 text-right font-medium">{formatShortAmount(t.monthlyCostJpy)}/月</td>
                      <td className="py-2.5 text-zinc-300 pl-4 font-sans text-[11px]">{t.purpose}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          t.replacementDifficulty === 'HIGH' ? 'text-zinc-100 bg-zinc-800 border border-zinc-700 font-semibold' : t.replacementDifficulty === 'MEDIUM' ? 'text-zinc-300 bg-zinc-850 border border-zinc-800' : 'text-zinc-400 bg-zinc-900 border border-zinc-800/80'
                        }`}>
                          {t.replacementDifficulty === 'HIGH' ? '極めて困難' : t.replacementDifficulty === 'MEDIUM' ? '中程度' : '即座に可能'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⑤ 競合比較タブ */}
        {activeTab === 'COMPETITORS' && (
          <div className="bg-[#13151A] border border-white/[0.08] rounded-lg p-5">
            <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              同業他社との財務・参入障壁マトリクス
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                    <th className="py-2 text-left font-medium">企業名</th>
                    <th className="py-2 text-left font-medium">企業規模</th>
                    <th className="py-2 text-right font-medium">年間売上高</th>
                    <th className="py-2 text-right font-medium">営業利益率</th>
                    <th className="py-2 text-left font-medium pl-4">参入障壁の比較</th>
                    <th className="py-2 text-left font-medium">価格決定権</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {company.competitors.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                      <td className="py-2.5 font-semibold text-zinc-100">{c.name}</td>
                      <td className="py-2.5 text-zinc-400">{c.scaleLabel}</td>
                      <td className="py-2.5 text-right font-medium">{formatShortAmount(c.annualRevenueJpy)}</td>
                      <td className="py-2.5 text-right font-semibold text-zinc-200">{c.operatingMarginPercent.toFixed(1)}%</td>
                      <td className="py-2.5 text-zinc-400 pl-4 font-sans text-[11px]">{c.moatSummary}</td>
                      <td className="py-2.5 text-zinc-300 font-sans text-[11px]">{c.pricingPower}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 特別会員限定・非公開インサイト秘密金庫 (すりガラス) */}
        <div className="relative bg-[#13151A] border border-white/[0.08] rounded-lg p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                機関PRO限定 非公開運用インサイト・実務プレイブック
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">限定開示</span>
          </div>

          <p className="text-xs text-zinc-300 mb-3 font-sans">
            {company.proSecretInsight}
          </p>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end text-xs text-zinc-500">
            <button
              onClick={onOpenProModal}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono font-medium underline"
            >
              全企業の非公開台帳を一括取得 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

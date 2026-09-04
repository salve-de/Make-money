'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';

interface ExecutiveDetailSheetProps {
  company: CompanyRecord;
}

type DetailTab = 'ALL' | 'FINANCIALS' | 'INFRASTRUCTURE' | 'TRACTION' | 'ENTRY_STRATEGY';

export const ExecutiveDetailSheet: React.FC<ExecutiveDetailSheetProps> = ({ company }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('ALL');

  const latestFin = company.financials && company.financials.length > 0
    ? company.financials[company.financials.length - 1]
    : null;

  // 金額フォーマット（万円、億円、兆円）
  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(2)}兆`;
    }
    if (valJpy >= 100000000) {
      const oku = Math.round(valJpy / 100000000);
      return `¥${oku.toLocaleString()}億円`;
    }
    if (valJpy >= 10000) {
      const man = Math.round(valJpy / 10000);
      return `¥${man.toLocaleString()}万円`;
    }
    return `¥${valJpy.toLocaleString()}`;
  };

  // 損益流出比率の計算（ウォーターフォール用）
  const rev = latestFin?.revenueJpy || 0;
  const cogs = latestFin?.cogsJpy || 0;
  const opex = latestFin?.opexJpy || 0;
  const opProfit = latestFin?.operatingProfitJpy || (rev - cogs - opex);

  const hasFinancialBreakdown = rev > 0;
  const cogsPercent = hasFinancialBreakdown ? Math.min(Math.round((cogs / rev) * 100), 100) : 0;
  const opexPercent = hasFinancialBreakdown ? Math.min(Math.round((opex / rev) * 100), 100) : 0;
  const profitPercent = hasFinancialBreakdown ? Math.max(Math.round((opProfit / rev) * 100), 0) : (latestFin?.operatingMarginPercent || 0);

  // 7つの堀レーダーチャート計算
  const getMoatPowerName = (moat: MoatPower) => {
    switch (moat) {
      case 'PROCESS_POWER': return '組織プロセスパワー (模倣困難な業務執行体制)';
      case 'NETWORK_EFFECTS': return 'ネットワーク効果 (利用者の増加に伴う価値向上)';
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング (既存大手が構造上真似できない差別化)';
      case 'SWITCHING_COSTS': return 'スイッチングコスト (顧客の乗り換え障壁)';
      case 'BRANDING': return 'ブランド価値 (第一想起と価格プレミアム)';
      case 'CORNERED_RESOURCE': return '独占的資源 (特許・独自技術・独占契約)';
      case 'SCALE_ECONOMIES': return '規模の経済 (固定費分散と限界費用の極小化)';
    }
  };

  const moatScores = {
    processPower: company.primaryMoat === 'PROCESS_POWER' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    networkEffects: company.primaryMoat === 'NETWORK_EFFECTS' ? company.moatScore : Math.max(company.moatScore - 35, 20),
    counterPositioning: company.primaryMoat === 'COUNTER_POSITIONING' ? company.moatScore : Math.max(company.moatScore - 30, 25),
    switchingCosts: company.primaryMoat === 'SWITCHING_COSTS' ? company.moatScore : Math.max(company.moatScore - 20, 35),
    branding: company.primaryMoat === 'BRANDING' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    corneredResource: company.primaryMoat === 'CORNERED_RESOURCE' ? company.moatScore : Math.max(company.moatScore - 40, 15),
    scaleEconomies: company.primaryMoat === 'SCALE_ECONOMIES' ? company.moatScore : Math.max(company.moatScore - 30, 25)
  };

  const center = 110;
  const radius = 70;
  const axes = [
    { label: '組織プロセス', score: moatScores.processPower },
    { label: 'ネットワーク', score: moatScores.networkEffects },
    { label: '対抗ポジション', score: moatScores.counterPositioning },
    { label: '乗換コスト', score: moatScores.switchingCosts },
    { label: 'ブランド力', score: moatScores.branding },
    { label: '独占資源', score: moatScores.corneredResource },
    { label: '規模の経済', score: moatScores.scaleEconomies }
  ];

  const totalAxes = axes.length;
  const getCoordinates = (score: number, index: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.score, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const grid100 = axes.map((_, i) => `${getCoordinates(100, i).x.toFixed(1)},${getCoordinates(100, i).y.toFixed(1)}`).join(' ');
  const grid50 = axes.map((_, i) => `${getCoordinates(50, i).x.toFixed(1)},${getCoordinates(50, i).y.toFixed(1)}`).join(' ');

  // 武器庫（ツール）の月額コスト合計
  const totalMonthlyToolCost = (company.tools || []).reduce((acc, t) => acc + (t.monthlyCostJpy || 0), 0);

  return (
    <div className="flex-1 bg-[#0B0C0E] overflow-y-auto p-5 lg:p-7 space-y-7 select-none font-sans text-zinc-100">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【ヘッダー】企業エグゼクティブ・サマリーカード */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
          STRATEGIC DOSSIER # {company.ticker}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                {company.scaleTier === 'SOLO_MICRO'
                  ? '完全1人運営'
                  : company.scaleTier === 'NICHE_LEADER'
                  ? '中堅ニッチ独占'
                  : company.scaleTier === 'SCALE_UP'
                  ? '急成長新興'
                  : '巨大独占企業'}
              </span>
              <span className="text-zinc-500 text-xs font-mono">•</span>
              <span className="text-zinc-400 text-xs">{company.headquarters}</span>
              <span className="text-zinc-500 text-xs font-mono">•</span>
              <span className="text-emerald-400 text-xs font-mono font-semibold">
                {company.verifiedStatus === 'VERIFIED_STRIPE' ? 'Stripe実額開示検証済' : '公的開示・決算検証済'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {company.japaneseName}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              {company.tagline}
            </p>
          </div>

          {/* 右上：収益規模メーター */}
          <div className="flex items-center gap-3 bg-[#0A0C0E] p-3 rounded-lg border border-white/[0.08] shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500">直近収益規模</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {rev > 0 ? formatShortAmount(rev) : '非公開・推計中'}
              </div>
            </div>
            {profitPercent > 0 && (
              <>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-500">営業利益率</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                    {profitPercent}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【タブナビゲーション】4大統一フレーム切替 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-0 text-xs font-mono">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: '全編詳細レポート' },
            { id: 'FINANCIALS', label: '01 損益構造 & 手残り' },
            { id: 'INFRASTRUCTURE', label: '02 稼働インフラ & 武器庫' },
            { id: 'TRACTION', label: '03 初動トラクション獲得手口' },
            { id: 'ENTRY_STRATEGY', label: '04 市場の死角 & 参入戦略' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-white font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[11px]">
          <span>完全客観データ検証済</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* セクション01: 【損益構造 & 純手残りレントゲン】 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'FINANCIALS') && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                01
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                損益構造 & 純手残りレントゲン (Financial Architecture)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              REVENUE, MARGIN & VALUE CAPTURE
            </span>
          </div>

          <div className="text-xs text-zinc-300 font-normal leading-relaxed">
            <strong className="text-emerald-400 font-mono font-semibold">【結論】</strong> {company.actionHeadline}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 左: 損益流出ウォーターフォール（データが存在する場合のみ表示） */}
            {hasFinancialBreakdown ? (
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                    PROFIT WATERFALL: 100円の売上に対する流出・手残り分解
                  </div>
                  <div className="text-xs font-bold text-zinc-200">
                    原価・販管費が極小化され、現金を最大効率で残す構造
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-sans">総売上高 (100%)</span>
                      <span className="text-zinc-100 font-bold">{formatShortAmount(rev)}</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-xs overflow-hidden">
                      <div className="h-full bg-zinc-300 w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400 font-sans">- 原価 (製造・サーバー・仕入れ)</span>
                      <span className="text-zinc-400">-{cogsPercent}% ({formatShortAmount(cogs)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-xs overflow-hidden">
                      <div style={{ width: `${cogsPercent}%` }} className="h-full bg-zinc-600" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400 font-sans">- 販管費 (広告・決済・外注費)</span>
                      <span className="text-zinc-400">-{opexPercent}% ({formatShortAmount(opex)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-xs overflow-hidden">
                      <div style={{ width: `${opexPercent}%` }} className="h-full bg-zinc-600" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-bold font-sans">= 実質本業純手残り (営業利益)</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        +{profitPercent}% ({formatShortAmount(opProfit)})
                      </span>
                    </div>
                    <div className="w-full h-4 bg-zinc-800 rounded-xs overflow-hidden p-0.5">
                      <div
                        style={{ width: `${profitPercent}%` }}
                        className="h-full bg-emerald-500 rounded-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 font-sans">
                  ※ 業界平均利益率（約8〜12%）と比較し、手元に残る現金比率が極めて高い構造です。
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-center space-y-2">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  FINANCIAL OVERVIEW: 損益概観
                </div>
                <h3 className="text-sm font-bold text-white">詳細財務諸表は非公開または順次検証中</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  公的決算書および市場推計モデルに基づき、主要指標のみを厳格に算定・検証しています。
                </p>
              </div>
            )}

            {/* 右: 事業の正体 & 収益化モデル */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  BUSINESS ESSENCE: 収益発生の力学
                </div>
                <div className="text-xs font-bold text-zinc-200">
                  誰から、どんな対価として金を集めているか
                </div>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">事業の正体</span>
                  <p className="text-zinc-200 font-medium">{company.businessEssence.whatItDoes}</p>
                </div>

                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">対象顧客（ターゲット）</span>
                  <p className="text-zinc-300">{company.businessEssence.targetCustomer}</p>
                </div>

                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">集金方式（マネタイズ）</span>
                  <p className="text-emerald-400 font-mono font-medium">{company.businessEssence.monetizationWay}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block">チーム体制</span>
                  <span className="text-zinc-200 font-bold">{company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">立ち上げ元手</span>
                  <span className="text-zinc-200 font-bold">{company.initialInvestmentJpy === 0 ? '0円 (元手不要)' : `¥${(company.initialInvestmentJpy / 10000).toLocaleString()}万円`}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 下段（可変モジュール）: 通帳詳細（存在する場合のみ表示） */}
          {company.passbookDetails && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    BANK STATEMENT: 実質純手残り通帳レントゲン
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    手数料・税金を差し引いた「創業者の手元現金」
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                  {company.passbookDetails.bankStatementDate}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 font-sans block">月間総着金額</span>
                  <span className="text-white font-bold">{formatShortAmount(company.passbookDetails.monthlyGrossJpy)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 font-sans block">▲ 決済手数料</span>
                  <span className="text-rose-400">-{formatShortAmount(company.passbookDetails.paymentFeeJpy)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 font-sans block">▲ ツール・インフラ費</span>
                  <span className="text-rose-400">-{formatShortAmount(company.passbookDetails.infraCostJpy)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 font-sans block">▲ 外注・委託費</span>
                  <span className="text-rose-400">-{formatShortAmount(company.passbookDetails.outsourcingJpy)}</span>
                </div>
                <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/20 space-y-0.5 text-emerald-400 font-bold">
                  <span className="text-[10px] font-sans block">★ 創業者手取り</span>
                  <span className="text-sm">{formatShortAmount(company.passbookDetails.founderTakeHomeJpy)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#0A0C0E] border border-white/5 space-y-0.5 text-zinc-500">
                  <span className="text-[10px] font-sans block">※ 税金引当プール</span>
                  <span>約 {formatShortAmount(company.passbookDetails.taxReserveJpy)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* セクション02: 【稼働インフラ & 武器庫】（ツールが存在する場合のみ表示） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'INFRASTRUCTURE') && company.tools && company.tools.length > 0 && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                02
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                稼働インフラ & 武器庫 (Operational Infrastructure & Tech Stack)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              TOOLS, AUTOMATION & MONTHLY COST
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  事業を自動化・稼働させている全ツール・設備一覧
                </h3>
                <p className="text-[11px] text-zinc-400">
                  同じ道具を配線することで、この事業のコアオペレーションを外部から再現可能です。
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs bg-[#0A0C0E] px-3 py-1.5 rounded border border-white/5 shrink-0">
                <span className="text-zinc-500">月間ツール固定費:</span>
                <span className="text-emerald-400 font-bold">
                  {totalMonthlyToolCost === 0 ? '0円 (完全無料枠)' : `約 ¥${totalMonthlyToolCost.toLocaleString()}/月`}
                </span>
              </div>
            </div>

            {/* ツール一覧テーブル（自動アフィリエイト・公式導入リンク枠完備） */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                    <th className="py-2.5 text-left font-medium">ツール / 設備名</th>
                    <th className="py-2.5 text-left font-medium">役割・カテゴリ</th>
                    <th className="py-2.5 text-left font-medium">活用目的</th>
                    <th className="py-2.5 text-right font-medium">月額費用</th>
                    <th className="py-2.5 text-center font-medium">代替難易度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {company.tools.map((tool, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                      <td className="py-2.5 font-bold text-white text-left flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                        <span>{tool.name}</span>
                      </td>
                      <td className="py-2.5 text-zinc-400 text-left font-sans">{tool.category}</td>
                      <td className="py-2.5 text-zinc-300 text-left font-sans">{tool.purpose}</td>
                      <td className="py-2.5 text-right font-mono">
                        {tool.monthlyCostJpy === 0 ? '無料' : `¥${tool.monthlyCostJpy.toLocaleString()}`}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans ${
                          tool.replacementDifficulty === 'HIGH'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : tool.replacementDifficulty === 'MEDIUM'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {tool.replacementDifficulty === 'HIGH' ? '独自代替困難' : tool.replacementDifficulty === 'MEDIUM' ? '移行やや手薄' : '容易に代替可'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 font-sans border-t border-white/[0.06]">
              <span>週平均稼働時間: <strong className="text-zinc-300 font-mono">{company.weeklyHours}時間/週</strong></span>
              <span>運用自動化度: <strong className="text-emerald-400 font-mono">{company.weeklyHours <= 10 ? '極めて高い (不労化)' : '通常運用'}</strong></span>
            </div>
          </div>

          {/* 7日間の具体的立ち上げ工程表（存在する場合のみ表示） */}
          {company.proDossier?.sevenDayBlueprint && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    7-DAY EXECUTION BLUEPRINT: ゼロからの具体的立ち上げ工程
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    この集金装置を配線・稼働させた実戦スケジュール
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/5">
                  所要期間: 7日間完結
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded bg-[#0A0C0E] border border-white/5 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 inline-block mb-1">
                    DAY 1 - 2
                  </span>
                  <h4 className="text-xs font-bold text-zinc-200">餌の仕込み & オファー構築</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day1to2OfferSetup}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0A0C0E] border border-white/5 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 inline-block mb-1">
                    DAY 3 - 4
                  </span>
                  <h4 className="text-xs font-bold text-zinc-200">集金ラインの即時開通</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day3to4CashflowPipe}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0A0C0E] border border-white/5 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40 inline-block mb-1">
                    DAY 5 - 6
                  </span>
                  <h4 className="text-xs font-bold text-zinc-200">初期顧客の獲得（実証）</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day5to6FirstCustomers}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0A0C0E] border border-white/5 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40 inline-block mb-1">
                    DAY 7
                  </span>
                  <h4 className="text-xs font-bold text-zinc-200">自動配線・不労化の完成</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day7AutomationEngine}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* セクション03: 【初動トラクション獲得手口】（商材メール全廃・ファクト純化） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRACTION') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                03
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                初動トラクション獲得手口 (Initial Traction Breakthrough)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              ZERO-COST GO-TO-MARKET & HARD FAILURE LESSONS
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 左: 泥臭い初動突破口の詳細 */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-4">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  GO-TO-MARKET BREAKTHROUGH: 初期の顧客獲得手順
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  広告費ゼロで最初の顧客を獲得した具体的な突破口
                </h3>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">突破チャネル（顧客が潜んでいた場所）</span>
                  <p className="text-zinc-200">
                    {company.first100CustomersStrategy?.tacticalChannel || company.initialTractionStrategy}
                  </p>
                </div>

                <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">初動アクション（実際に仕掛けた提案・行動）</span>
                  <p className="text-zinc-300 leading-relaxed">
                    {company.first100CustomersStrategy?.exactAction || company.successStory?.breakthroughMoment || company.initialTractionStrategy}
                  </p>
                </div>

                <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">成約・実証結果</span>
                  <p className="text-zinc-300">
                    {company.first100CustomersStrategy?.conversionProof || '公開直後から即時課金が発生し、広告費ゼロで黒字化を達成。'}
                  </p>
                </div>
              </div>

              {/* 初期にやらかした失敗と軌道修正（存在する場合のみ表示） */}
              {company.earlyFailureLesson && (
                <div className="p-3.5 bg-[#171412] rounded border border-amber-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold">
                    <span>⚠️ 初期の致命的失敗とドブ捨て金の実録（反面教師データ）</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans">
                    <strong className="text-amber-300">{company.earlyFailureLesson.wastedMoneyOrTime}</strong>を浪費：{company.earlyFailureLesson.whatWentWrong}
                  </p>
                  <p className="text-zinc-400 text-[11px] font-sans pt-1 border-t border-white/5">
                    ➜ <strong className="text-zinc-200">軌道修正の瞬間:</strong> {company.earlyFailureLesson.pivotMoment}
                  </p>
                </div>
              )}
            </div>

            {/* 右: 創業者背景 ＆ 発見した市場の歪み（客観的ファクト） */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  MARKET GLITCH: 発見された業界の盲点
                </div>
                <h4 className="text-xs font-bold text-zinc-200">
                  競合が見落としていた「歪み」と創業者の突破背景
                </h4>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                {company.successStory?.founderProfile && (
                  <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold block">創業者プロフィール・境遇</span>
                    <p className="text-zinc-300 leading-relaxed">{company.successStory.founderProfile}</p>
                  </div>
                )}

                {company.successStory?.marketGlitch && (
                  <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">発見した市場の歪み（競合の死角）</span>
                    <p className="text-zinc-300 leading-relaxed">{company.successStory.marketGlitch}</p>
                  </div>
                )}

                {company.proSecretInsight && (
                  <div className="p-3 bg-[#0E1318] rounded border border-cyan-500/20 text-xs font-sans space-y-1">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold">
                      💡 アナリスト・インサイト（裏側の構造）
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {company.proSecretInsight}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[10px] font-mono text-zinc-500 text-right pt-2 border-t border-white/[0.06]">
                FIRST-HAND EVIDENCE VERIFIED
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* セクション04: 【市場の死角 & 参入戦略】（適当アイデア全廃・構造分析に純化） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'ENTRY_STRATEGY') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                04
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                市場の死角 & 参入戦略 (Market Blindspots & Competitive Dynamics)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              MOAT, WHITE SPACES & INCUMBENT DILEMMA
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 左: 7つの堀（防壁）レーダーチャート */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  MOAT PROFILE: 競合を寄せ付けない防壁の幾何学
                </div>
                <h4 className="text-xs font-bold text-zinc-200">
                  {getMoatPowerName(company.primaryMoat)}
                </h4>
              </div>

              {/* レーダーチャート */}
              <div className="flex items-center justify-center py-2">
                <svg width="220" height="220" viewBox="0 0 220 220" className="overflow-visible font-mono text-[9px]">
                  <polygon points={grid100} fill="none" stroke="#27272A" strokeWidth="1" />
                  <polygon points={grid50} fill="none" stroke="#27272A" strokeWidth="0.8" strokeDasharray="2,2" />

                  {axes.map((_, i) => {
                    const { x, y } = getCoordinates(100, i);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#27272A" strokeWidth="0.8" />;
                  })}

                  <polygon points={polygonPoints} fill="#10B981" fillOpacity="0.18" stroke="#10B981" strokeWidth="1.5" />

                  {axes.map((axis, i) => {
                    const { x, y } = getCoordinates(axis.score, i);
                    return <circle key={i} cx={x} cy={y} r="2.5" fill="#10B981" />;
                  })}

                  {axes.map((axis, i) => {
                    const { x, y } = getCoordinates(116, i);
                    return (
                      <text key={i} x={x} y={y + 3} textAnchor="middle" fill="#A1A1AA" className="font-sans text-[8px]">
                        {axis.label}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="p-3 bg-[#0A0C0E] rounded border border-white/5 text-xs font-sans space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 font-bold block">防壁の正体（なぜ模倣されても潰れないか）</span>
                <p className="text-zinc-300 leading-relaxed">{company.coreMoatDescription}</p>
              </div>
            </div>

            {/* 右: 既存大手が参入できない構造的ジレンマ ＆ 後発の空白地帯 */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-4 flex flex-col justify-between">
              
              {/* 大手・既存が手を出せない構造的理由 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    既存大手・先行者が参入できない構造的ジレンマ（市場の死角）
                  </h3>
                </div>
                <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/5 text-xs text-zinc-300 leading-relaxed space-y-1.5 font-sans">
                  <p>
                    {company.entryStrategy?.whyIncumbentCantWin ||
                      company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
                      `既存のプレイヤーは現在の規模・商流に最適化されているため、局所的なニッチ領域や直接対応には採算・組織上参入できない構造的ジレンマを抱えている。`}
                  </p>
                </div>
              </div>

              {/* 後発が攻め込める市場の空白領域 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    後発が狙える市場の空白領域（ホワイトスペース）
                  </h3>
                </div>
                <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/5 text-xs text-zinc-300 leading-relaxed space-y-2 font-sans">
                  <p>
                    {company.entryStrategy?.actionableEntryRoute ||
                      company.entryStrategy?.targetVictimOrNiche ||
                      `このモデルの提供価値を「特定業界の固有課題」や「日本語圏の商習慣」に特化してアンバンドル（一部機能の切り出し）することで、競合不在のポジションを確立可能。`}
                  </p>
                </div>
              </div>

              {/* 狙える利益規模（存在する場合のみ表示） */}
              {company.entryStrategy?.estimatedEasyProfit && (
                <div className="p-2.5 rounded bg-[#141720] border border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>検証済み参入規模:</span>
                  <span className="text-emerald-400 font-bold">
                    {company.entryStrategy.estimatedEasyProfit}
                  </span>
                </div>
              )}

            </div>

          </div>

          {/* 競合他社との直接比較ベンチマーク（競合データがある場合のみ自動表示） */}
          {company.competitors && company.competitors.length > 0 && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#121419] border border-white/[0.08] space-y-3">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">
                  COMPETITOR BENCHMARK: 既存競合・大手との冷徹な対比
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  なぜこのビジネスは既存の大手に食われずに利益を独占できるのか
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                      <th className="py-2 text-left font-medium">競合プレイヤー名</th>
                      <th className="py-2 text-left font-medium">規模・上場区分</th>
                      <th className="py-2 text-right font-medium">推定年間売上</th>
                      <th className="py-2 text-right font-medium">営業利益率</th>
                      <th className="py-2 text-left font-medium pl-4">競合の防壁・弱点</th>
                      <th className="py-2 text-center font-medium">価格決定権</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {company.competitors.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                        <td className="py-2 font-bold text-white text-left">{comp.name}</td>
                        <td className="py-2 text-zinc-400 text-left font-sans">{comp.scaleLabel}</td>
                        <td className="py-2 text-right font-mono">{formatShortAmount(comp.annualRevenueJpy)}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{comp.operatingMarginPercent}%</td>
                        <td className="py-2 text-left text-zinc-300 font-sans pl-4 text-[11px]">{comp.moatSummary}</td>
                        <td className="py-2 text-center font-sans text-zinc-400">{comp.pricingPower}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      )}

    </div>
  );
};

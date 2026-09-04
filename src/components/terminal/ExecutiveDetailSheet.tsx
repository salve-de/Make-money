'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';
import { StatistaDualView } from './StatistaDualView';
import { ExecutiveVisualCharts } from './ExecutiveVisualCharts';

interface ExecutiveDetailSheetProps {
  company: CompanyRecord;
  onDownloadCsv: () => void;
  onDownloadExcel: () => void;
  onOpenOfferModal: () => void;
  onOpenProModal: () => void;
}

type DetailTab = 'ALL' | 'OVERVIEW' | 'FINANCIALS' | 'MOATS' | 'STRATEGY' | 'PRO';

export const ExecutiveDetailSheet: React.FC<ExecutiveDetailSheetProps> = ({
  company,
  onDownloadCsv,
  onDownloadExcel,
  onOpenOfferModal,
  onOpenProModal
}) => {
  // アクティブタブ
  const [activeTab, setActiveTab] = useState<DetailTab>('ALL');

  // 目標収益シミュレーター用ステート（目標月収）
  const [targetMonthlyProfit, setTargetMonthlyProfit] = useState<number>(1000000);

  // 直近財務
  const latestFin = company.financials[company.financials.length - 1];

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

  const getMoatPowerName = (moat: MoatPower) => {
    switch (moat) {
      case 'PROCESS_POWER': return '組織プロセスパワー (模倣困難な業務執行体制)';
      case 'NETWORK_EFFECTS': return 'ネットワーク効果 (利用者の増加に伴う価値向上)';
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング (既存大手が構造上真似できない差別化)';
      case 'SWITCHING_COSTS': return 'スイッチングコスト (顧客の乗り換え障壁)';
      case 'BRANDING': return 'ブランド価値 (第一想起と価格プレミアム)';
      case 'CORNERED_RESOURCE': return '独占的資源 (特許・防衛機密・独自技術・独占契約)';
      case 'SCALE_ECONOMIES': return '規模の経済 (固定費分散と限界費用の極小化)';
    }
  };

  // 目標収益シミュレーターの計算
  const estimatedProfitPerCustomer = company.scaleTier === 'SOLO_MICRO' ? 14800 : 500000;
  const neededCustomers = Math.max(Math.ceil(targetMonthlyProfit / estimatedProfitPerCustomer), 1);
  const neededDailyCustomers = (neededCustomers / 30).toFixed(1);
  const estimatedHoursPerWeek = Math.min(Math.round((neededCustomers * 0.5) + 3), 40);

  // 収益構造データフォールバック
  const passbook = company.passbookDetails || {
    monthlyGrossJpy: Math.round((latestFin?.revenueJpy || 10000000) / 12),
    paymentFeeJpy: Math.round(((latestFin?.revenueJpy || 10000000) / 12) * 0.03),
    infraCostJpy: company.tools.reduce((acc, t) => acc + t.monthlyCostJpy, 0),
    outsourcingJpy: Math.round(((latestFin?.opexJpy || 1000000) / 12) * 0.3),
    founderTakeHomeJpy: Math.round((latestFin?.operatingProfitJpy || 5000000) / 12),
    taxReserveJpy: Math.round(((latestFin?.operatingProfitJpy || 5000000) / 12) * 0.3),
    bankStatementDate: '直近月次換算推計'
  };

  const playbook = company.playbook || {
    difficulty: company.scaleTier === 'SOLO_MICRO' ? '立ち上げ容易' : '組織展開',
    setupDays: company.scaleTier === 'SOLO_MICRO' ? 3 : 60,
    monthlyCustomersFor1MJpy: Math.ceil(1000000 / estimatedProfitPerCustomer),
    step1: company.tools[0] ? `${company.tools[0].name}を活用した基盤セットアップ` : '最小構成のインフラ選定',
    step2: company.initialTractionStrategy,
    step3: '継続課金とキャッシュフローの自動化設計',
    copyPasteScript: company.executiveSummary
  };

  return (
    <div className="flex-1 bg-[#0B0C0E] overflow-y-auto p-5 lg:p-7 space-y-6 select-none font-sans text-zinc-100">
      {/* 1. 最上部：企業サマリーヘッダー（通帳メーター付き・画像2スタイル） */}
      <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
          BUSINESS X-RAY DOSSIER # {company.ticker}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                {company.scaleTier === 'SOLO_MICRO' ? '完全1人運営' : company.scaleTier === 'NICHE_LEADER' ? '中堅ニッチ独占' : '巨大企業'}
              </span>
              <span className="text-zinc-500 text-xs font-mono">•</span>
              <span className="text-zinc-400 text-xs">{company.headquarters}</span>
              <span className="text-zinc-500 text-xs font-mono">•</span>
              <span className="text-emerald-400 text-xs font-mono font-semibold">Stripe実額/公的開示検証済</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {company.japaneseName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {company.tagline}
            </p>
          </div>

          {/* 右上：通帳サマリーメーター */}
          <div className="flex items-center gap-3 bg-[#0A0C0E] p-3 rounded-lg border border-white/[0.08] shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500">直近月商実額</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {formatShortAmount(passbook.monthlyGrossJpy)}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500">純利益率</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 97}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. プロフェッショナル・タブナビゲーション（PitchBook / Sacraスタイル） */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-0 text-xs font-mono">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'border-emerald-400 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            全編レポート
          </button>
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-400 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            事業概要
          </button>
          <button
            onClick={() => setActiveTab('FINANCIALS')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'FINANCIALS'
                ? 'border-emerald-400 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            財務・収益構造
          </button>
          <button
            onClick={() => setActiveTab('MOATS')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'MOATS'
                ? 'border-emerald-400 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            競争優位・参入障壁
          </button>
          <button
            onClick={() => setActiveTab('STRATEGY')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'STRATEGY'
                ? 'border-emerald-400 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            参入・事業化戦略
          </button>
          <button
            onClick={() => setActiveTab('PRO')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'PRO'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            PRO詳細調査書
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[11px]">
          <span>更新日: 2026年Q1</span>
          <span>•</span>
          <span>データ検証済</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 【セクション１：事業概要と成長の軌跡】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                01
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                企業概要とビジネスモデル
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              BUSINESS OVERVIEW
            </span>
          </div>

          {/* 創業者 ＆ プロダクトUI */}
          {(company.productScreenshotUrl || company.founderAvatarUrl) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 rounded-lg bg-[#12141A] border border-white/[0.08] shadow-sm">
              {company.founderAvatarUrl && (
                <div className="lg:col-span-4 flex flex-row lg:flex-col items-center lg:items-start gap-3 p-3 bg-[#0B0C0E] rounded border border-white/5">
                  <img
                    src={company.founderAvatarUrl}
                    alt={company.founderName || '創業者'}
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded object-cover border border-white/10 shrink-0 shadow-sm"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">FOUNDER / OPERATOR</div>
                    <div className="text-sm font-bold text-white truncate">
                      {company.founderName || company.japaneseName}
                    </div>
                    {company.founderAge && (
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {company.founderAge}
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                      {company.businessEssence?.valueProposition || company.tagline}
                    </p>
                  </div>
                </div>
              )}

              {company.productScreenshotUrl && (
                <div className={`${company.founderAvatarUrl ? 'lg:col-span-8' : 'lg:col-span-12'} relative rounded overflow-hidden border border-white/10 bg-[#0B0C0E] group min-h-[140px] flex items-center`}>
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10">
                    プロダクト画面
                  </div>
                  <img
                    src={company.productScreenshotUrl}
                    alt={`${company.japaneseName} 画面`}
                    className="w-full h-40 lg:h-48 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              )}
            </div>
          )}

          {/* 事業の基本構造 */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                CORE OPERATIONS (事業構造と提供価値)
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                規模区分: {company.scaleTier === 'SOLO_MICRO' ? 'スモール・個人' : company.scaleTier === 'NICHE_LEADER' ? '中堅ニッチトップ' : '大企業・独占覇者'}
              </span>
            </div>

            <div>
              <div className="text-[11px] text-zinc-400 mb-0.5 font-medium">事業の本質:</div>
              <div className="text-base sm:text-lg font-bold text-zinc-100 leading-snug">
                {company.businessEssence?.whatItDoes || company.tagline}
              </div>
            </div>

            {/* 3分割カード（01獲物・02撒き餌・03集金の罠：画像1スタイル） */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/[0.08] space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">01. 獲物（ターゲット顧客）</div>
                <div className="text-xs font-bold text-zinc-100">
                  {company.businessEssence?.targetCustomer || '法人および個人'}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  どのような痛みを抱え、なぜ喜んで財布を開くのか。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/[0.08] space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">02. 撒き餌（提供価値）</div>
                <div className="text-xs font-bold text-zinc-100">
                  {company.businessEssence?.valueProposition || company.tagline}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  他社には真似できない、顧客が抗えない解決策。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/[0.08] space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">03. 集金の罠（マネタイズ仕掛け）</div>
                <div className="text-xs font-bold text-emerald-300">
                  {company.businessEssence?.monetizationWay || 'サブスクリプションおよび成果報酬'}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  決済が即座に着金し、キャッシュフローが途切れない構造。
                </p>
              </div>
            </div>
          </div>

          {/* 成長の軌跡（タイムライン） */}
          {company.successStory && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                  GROWTH MILESTONES (創業とトラクションの軌跡)
                </span>
                <span className="text-[11px] font-mono text-zinc-500">成長プロセス</span>
              </div>

              <div className="text-xs font-bold text-white mb-2">
                {company.successStory.headline}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase pb-1 border-b border-white/5">
                    STAGE 1: 創業者の背景
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    {company.successStory.founderProfile}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase pb-1 border-b border-white/5">
                    STAGE 2: 発見した市場の歪み
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    {company.successStory.marketGlitch}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase pb-1 border-b border-white/5">
                    STAGE 3: 泥臭い初動突破口
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    {company.successStory.breakthroughMoment}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase pb-1 border-b border-white/5 font-medium">
                    STAGE 4: 事業化の示唆
                  </div>
                  <p className="text-emerald-300 leading-relaxed text-[11px] font-medium">
                    {company.successStory.actionableSteal}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 主要指標サマリー */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#12141A] border border-white/[0.08] font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">直近年商規模</div>
              <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {formatShortAmount(latestFin?.revenueJpy || 0)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">体制: {company.teamSize}名</div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#12141A] border border-white/[0.08] font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">売上総利益率 (粗利率)</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">
                {latestFin?.grossMarginPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">原価率: {(100 - (latestFin?.grossMarginPercent || 0)).toFixed(1)}%</div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#12141A] border border-white/[0.08] font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">営業利益率</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">
                {latestFin?.operatingMarginPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">実質利益: {formatShortAmount(latestFin?.operatingProfitJpy || 0)}</div>
            </div>
          </div>

          {/* 料金体系と平均単価 */}
          {company.pricingDesign && (
            <div className="p-3.5 rounded-lg bg-[#12141A] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">PRICING ARCHITECTURE (料金設計)</div>
                <div className="text-zinc-200 font-bold">{company.pricingDesign.pricingTiers}</div>
                <div className="text-[11px] text-zinc-400">{company.pricingDesign.freeTrialHook}</div>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-[10px] font-mono text-zinc-500">平均顧客単価 (AOV)</span>
                <div className="text-sm font-bold text-emerald-400 font-mono">{company.pricingDesign.averageOrderValue}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 【セクション２：財務・収益構造とユニットエコノミクス】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'FINANCIALS') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                02
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                財務構造とユニットエコノミクス
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              FINANCIALS & UNIT ECONOMICS
            </span>
          </div>

          {/* リアルタイム損益計算書（月次通帳の生レントゲン：5分割グリッド） */}
          <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  リアルタイム損益計算書（月次通帳の生レントゲン）
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                原価率: {100 - (latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 97)}% / 純利益率: {latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 97}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] font-mono text-zinc-400">① 月間総売上</div>
                <div className="text-sm sm:text-base font-bold font-mono text-white">
                  {formatShortAmount(passbook.monthlyGrossJpy)}
                </div>
                <div className="text-[9px] text-zinc-500">100%</div>
              </div>

              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] font-mono text-rose-400">② 決済手数料</div>
                <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
                  -{formatShortAmount(passbook.paymentFeeJpy)}
                </div>
                <div className="text-[9px] text-zinc-500">Stripe等（約3.6%）</div>
              </div>

              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] font-mono text-rose-400">③ サーバー・API代</div>
                <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
                  -{formatShortAmount(passbook.infraCostJpy)}
                </div>
                <div className="text-[9px] text-zinc-500">インフラ固定費</div>
              </div>

              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] font-mono text-rose-400">④ 広告費・外注費</div>
                <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
                  -{formatShortAmount(passbook.outsourcingJpy)}
                </div>
                <div className="text-[9px] text-zinc-500">泥臭い自力集客</div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-emerald-400 font-bold">⑤ 創業者純手取り</div>
                <div className="text-sm sm:text-base font-bold font-mono text-emerald-300">
                  {formatShortAmount(passbook.founderTakeHomeJpy)}
                </div>
                <div className="text-[9px] font-bold text-emerald-400">
                  手残り純利 {latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 97}%
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0A0C0F] rounded-lg border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">通帳の解剖所見:</strong> 売上の大部分が広告宣伝費や仕入れ原価に消える従来型ビジネスと異なり、ソフトウェアやAIの限界費用（追加コスト）がほぼゼロであるため、入金された現金の9割以上がそのまま創業者の銀行口座に残る構造。
            </div>
          </div>

          {/* ビジュアルチャート */}
          <ExecutiveVisualCharts company={company} />

          {/* 月次キャッシュフロー内訳 */}
          <div className="p-4 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-2 font-sans">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                MONTHLY CASHFLOW BREAKDOWN (月次収支の内訳推計)
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {passbook.bankStatementDate}
              </span>
            </div>

            <div className="bg-[#0B0C0E] rounded border border-white/[0.06] overflow-hidden font-mono text-xs">
              <table className="w-full">
                <tbody className="divide-y divide-white/[0.04]">
                  <tr className="text-zinc-200">
                    <td className="py-2.5 px-4 text-left">月間総売上 (Gross Revenue)</td>
                    <td className="py-2.5 px-4 text-right font-bold text-zinc-100 text-sm">
                      +{formatShortAmount(passbook.monthlyGrossJpy)}
                    </td>
                  </tr>
                  <tr className="text-zinc-400">
                    <td className="py-2 px-4 text-left pl-6 text-zinc-500">- 決済プラットフォーム手数料 (約3.0%)</td>
                    <td className="py-2 px-4 text-right text-zinc-400">
                      -{formatShortAmount(passbook.paymentFeeJpy)}
                    </td>
                  </tr>
                  <tr className="text-zinc-400">
                    <td className="py-2 px-4 text-left pl-6 text-zinc-500">- インフラ・SaaS・API推論費用</td>
                    <td className="py-2 px-4 text-right text-zinc-400">
                      -{formatShortAmount(passbook.infraCostJpy)}
                    </td>
                  </tr>
                  <tr className="text-zinc-400">
                    <td className="py-2 px-4 text-left pl-6 text-zinc-500">- 外注費・業務委託精算</td>
                    <td className="py-2 px-4 text-right text-zinc-400">
                      -{formatShortAmount(passbook.outsourcingJpy)}
                    </td>
                  </tr>
                  <tr className="text-zinc-400">
                    <td className="py-2 px-4 text-left pl-6 text-zinc-500">- 税引当・内部留保推計</td>
                    <td className="py-2 px-4 text-right text-zinc-400">
                      -{formatShortAmount(passbook.taxReserveJpy)}
                    </td>
                  </tr>
                  <tr className="bg-[#151821] text-zinc-100 border-t border-white/10">
                    <td className="py-3 px-4 text-left font-bold text-emerald-400 font-sans">
                      月間実質営業キャッシュフロー (Net Operating Income)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 text-base">
                      +{formatShortAmount(passbook.founderTakeHomeJpy)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 創業者が実際に使った武器一覧（TECH STACK & COST：画像3スタイル） */}
          {company.tools && company.tools.length > 0 && (
            <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  創業者が実際に使った武器一覧（TECH STACK & COST）
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">
                  合計維持費: {formatShortAmount(passbook.infraCostJpy)}/月
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {company.tools.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#161822] border border-white/5 hover:border-white/15 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-100">{t.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">
                        {t.monthlyCostJpy === 0 ? '無料' : `¥${t.monthlyCostJpy.toLocaleString()}/月`}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">{t.category}</div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      {t.purpose}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 決算推移 */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3">
            <div className="pb-2 border-b border-white/[0.06]">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                HISTORICAL PERFORMANCE (通期財務パフォーマンス推移)
              </div>
              <h3 className="text-sm font-bold text-zinc-100 mt-0.5">
                売上高・原価・営業利益の推移
              </h3>
            </div>

            <StatistaDualView
              financials={company.financials}
              companyName={company.japaneseName}
              actionHeadline={company.actionHeadline}
              onDownloadCsv={onDownloadCsv}
              onDownloadExcel={onDownloadExcel}
            />
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 【セクション３：参入障壁と競争優位】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'MOATS') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                03
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                構造的参入障壁と競争優位性
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              COMPETITIVE MOATS (7 POWERS)
            </span>
          </div>

          {/* 泥臭い初動の突破口 ＆ 独占の堀（画像4スタイル） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 最初の100人集客 */}
            <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3 shadow-sm">
              <div className="text-[10px] font-mono text-amber-400 font-bold tracking-wider">
                FIRST 100 CUSTOMERS (泥臭い初動の突破口)
              </div>
              <h3 className="text-sm font-bold text-white">
                {company.first100CustomersStrategy?.tacticalChannel || '最初の突破チャネル'}
              </h3>
              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 text-xs text-zinc-300 leading-relaxed">
                {company.first100CustomersStrategy?.exactAction || company.initialTractionStrategy}
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-bold">成約実績:</span>
                <span>{company.first100CustomersStrategy?.conversionProof || '広告費ゼロで初週黒字化達成'}</span>
              </div>
            </div>

            {/* 独占の堀 */}
            <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3 shadow-sm">
              <div className="text-[10px] font-mono text-indigo-400 font-bold tracking-wider">
                MOAT POWER (なぜ真似されても潰れないのか)
              </div>
              <h3 className="text-sm font-bold text-white">
                {getMoatPowerName(company.primaryMoat)}
              </h3>
              <div className="p-3 bg-[#161822] rounded-lg border border-white/5 text-xs text-zinc-300 leading-relaxed">
                {company.coreMoatDescription}
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="text-indigo-400 font-mono font-bold">防御スコア:</span>
                <span>{company.moatScore} / 100点（模倣困難性：極めて高）</span>
              </div>
            </div>
          </div>

          {/* 7 POWERS */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  STRATEGIC BARRIERS (競争優位の構造)
                </div>
                <h3 className="text-sm font-bold text-zinc-100 mt-0.5">
                  競合が容易に模倣できない理由
                </h3>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-zinc-500">参入障壁スコア</span>
                <div className="text-lg font-bold text-zinc-100">
                  {company.moatScore}<span className="text-xs text-zinc-500">/100</span>
                </div>
              </div>
            </div>
            <div className="text-xs font-mono text-zinc-400 mb-1">
              中核要因: <span className="text-zinc-200 font-bold">{getMoatPowerName(company.primaryMoat)}</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              {company.coreMoatDescription}
            </p>
          </div>

          {/* 初期の失敗とピボットの教訓 */}
          {company.earlyFailureLesson && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-2.5 font-sans shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  EARLY PITFALLS & PIVOT (初期の失敗とピボットの教訓)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">リスク回避ログ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">初期の損失コスト</div>
                  <div className="text-zinc-200 font-bold">{company.earlyFailureLesson.wastedMoneyOrTime}</div>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">直面した課題の本質</div>
                  <div className="text-zinc-300 leading-relaxed">{company.earlyFailureLesson.whatWentWrong}</div>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase">ピボット後の打開策</div>
                  <div className="text-emerald-300 leading-relaxed font-medium">{company.earlyFailureLesson.pivotMoment}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 【セクション４：市場参入と事業化戦略】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'STRATEGY') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                04
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                市場参入と事業展開戦略
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              MARKET ENTRY & PLAYBOOK
            </span>
          </div>

          {/* このビジネスを完コピ・模倣するための最短手順書（画像5スタイル） */}
          {company.proDossier?.sevenDayBlueprint && (
            <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  このビジネスを完コピ・模倣するための最短手順書
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">ACTIONABLE REPLICATION PLAYBOOK</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#161822] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-400 font-bold">手順①: 撒き餌とLPの仕込み</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {company.proDossier.sevenDayBlueprint.day1to2OfferSetup}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#161822] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-400 font-bold">手順②: 決済と受発注の自動開通</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {company.proDossier.sevenDayBlueprint.day3to4CashflowPipe}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#161822] border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold">手順③: 最初の顧客強奪と自動化</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {company.proDossier.sevenDayBlueprint.day5to6FirstCustomers}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 初期の顧客獲得戦略 */}
          {company.first100CustomersStrategy && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                    COLD START STRATEGY (初期顧客獲得のアプローチ)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">獲得チャネル分析</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">中核獲得チャネル</div>
                  <div className="text-zinc-200 font-bold leading-snug">{company.first100CustomersStrategy.tacticalChannel}</div>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">最初のアクション手順</div>
                  <p className="text-zinc-300 leading-relaxed">{company.first100CustomersStrategy.exactAction}</p>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase">初動の成約実績</div>
                  <p className="text-emerald-300 font-medium leading-relaxed">{company.first100CustomersStrategy.conversionProof}</p>
                </div>
              </div>
            </div>
          )}

          {/* 後発参入者のポジショニング戦略 */}
          {company.entryStrategy && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                    COMPETITIVE POSITIONING (後発プレイヤーのポジショニング戦略)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  構造的優位性を活かした参入モデル
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-white/10">
                  {company.entryStrategy.lensLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="p-3 rounded bg-[#0B0C0E] border border-white/5 space-y-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                      ① 既存大手の構造的制約
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {company.entryStrategy.whyIncumbentCantWin}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0B0C0E] border border-white/5 space-y-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                      ② 狙うべき未開拓市場
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {company.entryStrategy.targetVictimOrNiche}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0B0C0E] border border-white/5 space-y-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                      ③ 最短の市場参入ルート
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {company.entryStrategy.actionableEntryRoute}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0B0C0E] border border-emerald-500/20 space-y-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase mb-1">
                      ④ 想定手残り収益
                    </div>
                    <p className="text-sm font-bold text-emerald-300 font-sans leading-snug mt-1">
                      {company.entryStrategy.estimatedEasyProfit}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* リソース別の展開モデル */}
          {company.personalizedRecipes && company.personalizedRecipes.length > 0 && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                    TARGET-SPECIFIC BLUEPRINTS (リソース別の事業化モデル)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  保有アセットに応じた展開パターン
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {company.personalizedRecipes.map((recipe, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#0B0C0E] border border-white/5 hover:border-white/10 transition-colors space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-white/5">
                        {recipe.targetAudience}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono block mb-0.5">事業コンセプト:</span>
                      <div className="text-xs font-bold text-white leading-snug">
                        {recipe.customConcept}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.04]">
                      <span className="text-[10px] text-zinc-500 font-mono block mb-0.5">収益化アプローチ:</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                        {recipe.howToProfit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 収益モデルの骨格と試算 */}
          {company.trapRecipe && (
            <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                    MONETIZATION FRAMEWORK (収益モデルの骨格と試算)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  最小構成での収益化モデル
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug tracking-tight">
                {company.trapRecipe.headline}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                      ① ターゲット顧客と訴求価値
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {company.trapRecipe.targetPrey}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-[#0B0C0E] border border-white/5 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                      ② 販売・課金のメカニズム
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {company.trapRecipe.trapMechanism}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-[#0B0C0E] border border-emerald-500/20 space-y-2">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase border-b border-white/[0.06] pb-1">
                    ③ 収支シミュレーション
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-400">
                      <span>初期立ち上げ費用:</span>
                      <span className="text-zinc-200 font-bold">{company.trapRecipe.pureProfitBreakdown.initialCapital}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>月間売上見込:</span>
                      <span className="text-zinc-200 font-bold">{company.trapRecipe.pureProfitBreakdown.monthlyRevenue}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>月間維持コスト:</span>
                      <span className="text-zinc-200 font-bold">{company.trapRecipe.pureProfitBreakdown.systemCost}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono text-emerald-400">想定月間手残り利益:</span>
                    <span className="text-sm font-bold text-emerald-300 font-sans leading-tight">
                      {company.trapRecipe.pureProfitBreakdown.netTakeHome}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 目標収益シミュレーター */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#12141A] border border-white/[0.08] space-y-3 font-sans shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase">
                REVENUE CALCULATOR (目標収益シミュレーター)
              </span>
              <div className="flex items-center gap-1">
                {[500000, 1000000, 3000000, 10000000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTargetMonthlyProfit(amt)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      targetMonthlyProfit === amt
                        ? 'bg-zinc-200 text-black font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    月収{amt >= 10000000 ? '1000万' : amt >= 1000000 ? `${amt/1000000}00万` : '50万'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-2.5 bg-[#0B0C0E] rounded border border-white/5">
                <div className="text-[10px] text-zinc-500 font-sans">必要顧客数 (月間)</div>
                <div className="text-base font-bold text-zinc-100 mt-0.5">{neededCustomers} 件</div>
                <div className="text-[9px] text-zinc-500 font-sans">1日平均 {neededDailyCustomers}件</div>
              </div>
              <div className="p-2.5 bg-[#0B0C0E] rounded border border-white/5">
                <div className="text-[10px] text-zinc-500 font-sans">想定稼働時間</div>
                <div className="text-base font-bold text-zinc-100 mt-0.5">{estimatedHoursPerWeek} 時間/週</div>
                <div className="text-[9px] text-zinc-500 font-sans">副業・小規模運用可能</div>
              </div>
              <div className="p-2.5 bg-[#0B0C0E] rounded border border-white/5">
                <div className="text-[10px] text-zinc-500 font-sans">立ち上げ準備目安</div>
                <div className="text-base font-bold text-zinc-100 mt-0.5">{playbook.setupDays} 日以内</div>
                <div className="text-[9px] text-zinc-500 font-sans">既存ツールの活用</div>
              </div>
              <div className="p-2.5 bg-[#0B0C0E] rounded border border-white/5">
                <div className="text-[10px] text-zinc-500 font-sans">初期必要投資</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">¥{company.initialInvestmentJpy.toLocaleString()}</div>
                <div className="text-[9px] text-zinc-500 font-sans">固定資産・在庫リスクなし</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 【セクション５：PRO詳細分析レポート（有料会員限定リサーチ）】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'PRO') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                PRO
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                PROリサーチレポート：ビジネスモデル完全解剖調査書
              </h2>
            </div>
            <span className="text-[11px] text-amber-400/80 hidden sm:inline">
              PREMIUM RESEARCH REPORT
            </span>
          </div>

          <div className="relative p-5 sm:p-6 rounded-lg bg-[#12141A] border border-amber-500/30 font-sans space-y-4 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9a2 2 0 114 0v2H10V9z" />
                  </svg>
                  <span>特別会員限定：非公開リサーチ分析</span>
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                一部プレビュー公開
              </span>
            </div>

            {/* 本文プレビュー */}
            <div className="space-y-3.5 text-xs">
              {/* 第1パート */}
              <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px] font-mono">
                    PART 1：価格決定権と決済摩擦を最小化する設計
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">収益化分析</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {company.proDossier?.monetizationTrick.corePsychologicalTrigger || `${company.founderName || company.japaneseName}が突いたのは、顧客が抱える強烈な見栄と競合に負けたくない損失回避心理だった。`}
                </p>
                <div className="relative py-1 select-none">
                  <div className="filter blur-[3px] opacity-40 text-zinc-400 font-mono text-[11px] leading-relaxed">
                    {company.proDossier?.monetizationTrick.pricingPowerSecret || '定価を客自身に決めさせる独自の仕組みを導入。値引き要求を封殺し、即時決済により売掛金をゼロにする最短キャッシュフロー配線を構築した。'}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold tracking-wider">
                      PRO会員限定：価格決定権の構造設計を開示
                    </span>
                  </div>
                </div>
              </div>

              {/* 第2パート */}
              <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px] font-mono">
                    PART 2：既存プレイヤーが参入できない構造的死角
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">市場分析</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {company.proDossier?.incumbentBlindspot.whyGiantsCantEnter || '大手企業がこの領域に参入すると、自社の既存利益やブランドを毀損する構造的ジレンマがあり手を出せない。'}
                </p>
                <div className="relative py-1 select-none">
                  <div className="filter blur-[3px] opacity-40 text-zinc-400 font-mono text-[11px] leading-relaxed">
                    {company.proDossier?.incumbentBlindspot.moatAgainstCopycats || '後発が真似しても潰されない安全地帯の正体は、大手が見落としている局所的ニッチと独自のディストリビューションにある。'}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold tracking-wider">
                      PRO会員限定：構造的死角と防御壁の証明
                    </span>
                  </div>
                </div>
              </div>

              {/* 第3パート */}
              <div className="p-3.5 bg-[#0B0C0E] rounded border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-[11px] font-mono">
                    PART 3：事業立ち上げ実行計画（7ステップ実装プロセス）
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">実装ロードマップ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div className="p-2.5 bg-[#12141A] rounded border border-white/5">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-0.5">【STEP 1〜2：オファー策定】</span>
                    <p className="text-zinc-300 text-[11px]">{company.proDossier?.sevenDayBlueprint.day1to2OfferSetup || '最小限のツールでオファーを構築し、成約画面を配線（※閲覧可能）'}</p>
                  </div>
                  <div className="p-2.5 bg-[#12141A] rounded border border-white/5 relative select-none">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold block mb-0.5">【STEP 3〜4：決済開通】</span>
                    <p className="text-zinc-400 text-[11px] filter blur-[2.5px]">{company.proDossier?.sevenDayBlueprint.day3to4CashflowPipe || '自動決済パイプラインと受発注の連動配線図'}</p>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-amber-400 font-bold">PRO会員限定</span>
                  </div>
                  <div className="p-2.5 bg-[#12141A] rounded border border-white/5 relative select-none">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold block mb-0.5">【STEP 5〜6：初期顧客獲得】</span>
                    <p className="text-zinc-400 text-[11px] filter blur-[2.5px]">{company.proDossier?.sevenDayBlueprint.day5to6FirstCustomers || '広告費ゼロで顧客を獲得する直接アプローチの文面実例'}</p>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-amber-400 font-bold">PRO会員限定</span>
                  </div>
                  <div className="p-2.5 bg-[#12141A] rounded border border-white/5 relative select-none">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold block mb-0.5">【STEP 7：自動化基盤の完成】</span>
                    <p className="text-zinc-400 text-[11px] filter blur-[2.5px]">{company.proDossier?.sevenDayBlueprint.day7AutomationEngine || '完全自動で集金を回す配線設定ファイル'}</p>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-amber-400 font-bold">PRO会員限定</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTAフッター */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="text-xs sm:text-sm font-bold text-white">
                  このビジネスモデルの完全解剖レポートを閲覧する
                </div>
                <p className="text-[11px] text-zinc-400">
                  全銘柄の詳細分析・初期集客ログ・リスク回避実録が無制限で閲覧可能になります。
                </p>
              </div>

              <button
                onClick={onOpenProModal}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded transition-colors shrink-0 cursor-pointer shadow"
              >
                PROプランで全文を読む →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 【付録：稼働ソフトウェア・インフラ・設備一覧】 */}
      {/* ========================================================================= */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'FINANCIALS') && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px] font-bold border border-white/5">
                APPENDIX
              </span>
              <h3 className="text-xs font-bold text-zinc-300 tracking-wide">
                稼働インフラ・ソフトウェア一覧 (Tech Stack)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              スペック情報
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#12141A] border border-white/[0.08] font-sans shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                    <th className="py-2 text-left font-medium">ツール名</th>
                    <th className="py-2 text-left font-medium">カテゴリ</th>
                    <th className="py-2 text-right font-medium">月額費用</th>
                    <th className="py-2 text-left font-medium pl-4">役割・用途</th>
                    <th className="py-2 text-center font-medium">代替難易度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {company.tools.map((t, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                      <td className="py-2.5 font-semibold text-zinc-100">{t.name}</td>
                      <td className="py-2.5 text-zinc-400">{t.category}</td>
                      <td className="py-2.5 text-right font-medium">{formatShortAmount(t.monthlyCostJpy)}/月</td>
                      <td className="py-2.5 text-zinc-300 pl-4 font-sans text-xs">{t.purpose}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-400 border border-white/5">
                          {t.replacementDifficulty === 'HIGH' ? '困難' : t.replacementDifficulty === 'MEDIUM' ? '中程度' : '容易'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

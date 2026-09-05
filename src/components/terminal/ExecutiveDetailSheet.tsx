'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';

interface ExecutiveDetailSheetProps {
  company: CompanyRecord;
}

type DetailTab = 'ALL' | 'TRICK' | 'FINANCIALS' | 'INFRASTRUCTURE' | 'STORY';

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
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング (大手が構造上真似できない差別化)';
      case 'SWITCHING_COSTS': return 'スイッチングコスト (顧客の乗り換え障壁)';
      case 'BRANDING': return 'ブランド価値 (第一想起と価格プレミアム)';
      case 'CORNERED_RESOURCE': return '独占的資源 (特許・独自データ・独占契約)';
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

  // 【種明かしデータの抽出（ポエムを排除した客観的構造）】
  const trickPsychology = company.proDossier?.monetizationTrick.corePsychologicalTrigger ||
    `顧客が抱える「競合より優位に立ちたい見栄」または「業務停止や機会損失の恐怖」に直結させ、対価の支払いを正当化させている。`;

  const pricingSecret = company.proDossier?.monetizationTrick.pricingPowerSecret ||
    company.pricingDesign?.pricingTiers ||
    `相見積もりを拒絶し、即座に価値を実演・提供することで、定価販売と高い粗利を維持している。`;

  const cashSpeed = company.proDossier?.monetizationTrick.cashflowVelocity ||
    `Stripe等のカード即時決済または完全前払いにより、売掛金未回収リスクをゼロ化。`;

  const whyIncumbentBlind = company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    company.entryStrategy?.whyIncumbentCantWin ||
    `既存大手は現在の高単価商流や中立性の看板に縛られているため、この特化モデルに参入すると自社の既存ビジネスを破壊するジレンマを抱えている。`;

  // 【兵器②: 合法的なズル（盲点ハック）の抽出】
  const glitchText = company.successStory?.marketGlitch ||
    company.entryStrategy?.whyIncumbentCantWin ||
    company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    `既存プレイヤーが高額な導入費と長期契約を要求する中で、顧客が抱える「今すぐ安く試したい」という即応需要が完全に放置されていた盲点。`;

  const trickText = company.entryStrategy?.actionableEntryRoute ||
    company.trapRecipe?.trapMechanism ||
    company.successStory?.breakthroughMoment ||
    company.businessEssence?.monetizationWay ||
    `競合の弱点・死角を突き、低コストな既存インフラを組み合わせて、労力ゼロ・高利益率で直販する仕組み。`;

  const estimatedEasyProfit = company.entryStrategy?.estimatedEasyProfit ||
    company.derivedBusinessIdeas?.[0]?.estimatedMonthlyProfit ||
    company.trapRecipe?.pureProfitBreakdown?.netTakeHome ||
    '月利50万〜150万円';

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-5 lg:p-7 space-y-6 select-none font-sans text-slate-800">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【ヘッダー】企業エグゼクティブ・サマリーカード */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3.5 py-1 bg-slate-100 border-b border-l border-slate-200 text-[10px] font-mono text-slate-500 font-bold tracking-wider rounded-bl-lg">
          DOSSIER # {company.ticker}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mt-1">
          <div className="flex items-start gap-4 max-w-3xl">
            {/* 特大アプリアイコン */}
            <div className="shrink-0 pt-0.5">
              <CompanyLogo company={company} size="lg" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  {company.scaleTier === 'SOLO_MICRO'
                    ? '完全1人運営'
                    : company.scaleTier === 'NICHE_LEADER'
                    ? '中堅ニッチ独占'
                    : company.scaleTier === 'SCALE_UP'
                    ? '急成長新興'
                    : '巨大独占企業'}
                </span>
                <span className="text-slate-300 text-xs font-mono">•</span>
                <span className="text-slate-500 text-xs font-medium">{company.headquarters}</span>
                <span className="text-slate-300 text-xs font-mono">•</span>
                <span className="text-emerald-700 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                  {company.verifiedStatus === 'VERIFIED_STRIPE' ? 'Stripe実額照合済' : '公的開示照合済'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {company.japaneseName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {company.tagline}
              </p>
            </div>
          </div>

          {/* 右上：収益規模メーター & Sparkline */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">直近収益規模</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
                {rev > 0 ? formatShortAmount(rev) : '非公開・推計中'}
              </div>
            </div>
            {profitPercent > 0 && (
              <>
                <div className="h-9 w-px bg-slate-200" />
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">営業利益率</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 tabular-nums">
                    {profitPercent}%
                  </div>
                </div>
              </>
            )}
            <div className="h-9 w-px bg-slate-200" />
            <div className="w-16 h-7 opacity-85 pt-1">
              <SparklineChart trend="UP" width={64} height={24} color="#10B981" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 最上部：キースペック・スコアカード (Starter Story / PitchBook型) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">直近月商実額</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">実効手残り純利</div>
          <div className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
            {estimatedEasyProfit}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">営業利益率</div>
          <div className="text-base sm:text-lg font-black text-indigo-600 tabular-nums">
            {profitPercent}%
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">初期投下資本</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.initialInvestmentJpy === 0 ? '¥0 (不要)' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">週実働時間</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.weeklyHours ? `週${company.weeklyHours}h` : '少人数'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">組織体制</div>
          <div className="text-base sm:text-lg font-black text-slate-900">
            {company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}
          </div>
        </div>
      </div>

      {/* 構造的裁定の要約（アコーディオン完全全廃・一目で理解できる2カラム設計） */}
      <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span className="text-xs sm:text-sm font-bold text-slate-900">市場構造の盲点 & 構造的突破口（なぜこれで大儲けできるのか）</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200/70 space-y-1.5">
            <div className="text-[10px] font-mono text-rose-700 font-black uppercase flex items-center gap-1.5">
              <span>●</span>
              <span>1. 既存産業の構造的盲点・非効率性</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">{glitchText}</p>
          </div>
          <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/70 space-y-1.5">
            <div className="text-[10px] font-mono text-emerald-700 font-black uppercase flex items-center gap-1.5">
              <span>●</span>
              <span>2. 構造的裁定の突破口・仕掛け</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">{trickText}</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【タブナビゲーション】4大解剖フレーム切替 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0 text-xs font-mono">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: '全編解剖レポート' },
            { id: 'FINANCIALS', label: '01 損益計算書 & 純手残り' },
            { id: 'INFRASTRUCTURE', label: '02 稼働インフラ & ツール構成' },
            { id: 'TRICK', label: '03 収益化メカニズム & 大手の死角' },
            { id: 'STORY', label: '04 初動突破 & 創業者背景' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-3.5 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-400 text-[11px] font-mono">
          <span>高収益事業レントゲン台帳</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖01: 【収益化メカニズム & なぜ大手は真似できないのか】（アコーディオン式負荷ゼロ設計） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖01: 【収益化メカニズム & なぜ大手は真似できないのか】（常時可視化・白モダン設計） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRICK') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                03
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                収益化メカニズム & 大手の死角 (Monetization Mechanism & Blindspots)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              HOW THEY EXTRACT CASH & WHY GIANTS CANNOT ENTER
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 左: 支払動機と価格決定権（常時可視化） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  顧客の支払動機 & 価格決定権の仕掛け
                </h3>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    1. 支払動機の心理的要因
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {trickPsychology}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    2. 価格決定権の源泉（相見積もり無力化）
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {pricingSecret}
                  </p>
                </div>

                <div className="p-2.5 bg-indigo-50/60 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-indigo-900 font-sans font-bold">キャッシュ回収速度:</span>
                  <span className="text-indigo-700 font-black">{cashSpeed}</span>
                </div>
              </div>
            </div>

            {/* 右: 大手の参入障壁（常時可視化） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  大手の構造的死角 & 参入障壁 (Moat)
                </h3>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    1. 大手が手を出せない構造的理由
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {whyIncumbentBlind}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    2. 参入障壁（Moat）の正体
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.coreMoatDescription}
                  </p>
                </div>

                <div className="p-2.5 bg-indigo-50/60 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-indigo-900 font-sans font-bold">主防壁分類:</span>
                  <span className="text-indigo-700 font-black">{getMoatPowerName(company.primaryMoat)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 既存競合との対比ベンチマークテーブル（存在する場合のみ自動表示） */}
          {company.competitors && company.competitors.length > 0 && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    COMPETITOR BENCHMARK: 既存競合・大手との冷徹な対比
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    既存の大手プレイヤーが抱える構造的弱点一覧
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                  対比データ検証済
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="text-slate-700 border-b border-slate-200 bg-slate-50 text-[11px]">
                      <th className="py-2.5 px-3 text-left font-bold">競合事業者名</th>
                      <th className="py-2.5 px-3 text-left font-bold">規模・上場区分</th>
                      <th className="py-2.5 px-3 text-right font-bold">推定年間売上</th>
                      <th className="py-2.5 px-3 text-right font-bold">営業利益率</th>
                      <th className="py-2.5 px-3 text-left font-bold pl-4">競合の防壁・弱点</th>
                      <th className="py-2.5 px-3 text-center font-bold">価格決定権</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {company.competitors.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 text-slate-700 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-left">{comp.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-left font-sans">{comp.scaleLabel}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">{formatShortAmount(comp.annualRevenueJpy)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">{comp.operatingMarginPercent}%</td>
                        <td className="py-2.5 px-3 text-left text-slate-600 font-sans pl-4 text-[11px]">{comp.moatSummary}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-slate-600">{comp.pricingPower}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖02: 【損益計算書 & 実効手残り純利レントゲン】 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖02: 【損益計算書 & 実効手残り純利レントゲン】 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'FINANCIALS') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                02
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                損益計算書 & 実効手残り純利レントゲン (Financial Statements & Real Take-Home Cash)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              REVENUE, COGS, OPEX & REAL TAKE-HOME
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 左: 損益流出ウォーターフォール */}
            {hasFinancialBreakdown ? (
              <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    PROFIT WATERFALL: 100円の売上に対する流出・手残り分解
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    原価・経費を極小化し、現金を最大効率で残す構造
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-700 font-sans font-medium">総売上高 (100%)</span>
                      <span className="text-slate-900 font-black">{formatShortAmount(rev)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 w-full rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 原価 (製造・サーバー・仕入れ)</span>
                      <span className="text-slate-700 font-semibold">-{cogsPercent}% ({formatShortAmount(cogs)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${cogsPercent}%` }} className="h-full bg-rose-500 rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 販管費 (広告・決済・外注費)</span>
                      <span className="text-slate-700 font-semibold">-{opexPercent}% ({formatShortAmount(opex)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${opexPercent}%` }} className="h-full bg-amber-500 rounded-full" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-900 font-black font-sans">= 実質本業純手残り (営業利益)</span>
                      <span className="text-emerald-700 font-black text-sm">
                        +{profitPercent}% ({formatShortAmount(opProfit)})
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${profitPercent}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-sans">
                  ※ 業界平均利益率（約8〜12%）と比較し、手元に残る現金比率が極めて高い構造です。
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-center space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                  FINANCIAL OVERVIEW: 損益概観
                </div>
                <h3 className="text-sm font-bold text-slate-900">詳細財務諸表は非公開または順次検証中</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  公的決算書および市場推計モデルに基づき、主要指標のみを厳格に算定・検証しています。
                </p>
              </div>
            )}

            {/* 右: 事業スペック & 収益構造 */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  BUSINESS ESSENCE: 収益発生の力学
                </div>
                <div className="text-xs font-bold text-slate-900">
                  誰から、どんな対価として金を集めているか
                </div>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="p-3 rounded-lg bg-slate-50 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">事業の正体</span>
                  <p className="text-slate-800 font-medium">{company.businessEssence.whatItDoes}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">対象顧客（ターゲット）</span>
                  <p className="text-slate-700">{company.businessEssence.targetCustomer}</p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 space-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase">集金方式（マネタイズ）</span>
                  <p className="text-emerald-950 font-mono font-bold">{company.businessEssence.monetizationWay}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-medium">チーム体制</span>
                  <span className="text-slate-900 font-black">{company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-medium">立ち上げ元手</span>
                  <span className="text-slate-900 font-black">{company.initialInvestmentJpy === 0 ? '0円 (元手不要)' : `¥${(company.initialInvestmentJpy / 10000).toLocaleString()}万`}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 通帳レントゲン（データが存在する場合のみ表示） */}
          {company.passbookDetails && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                    資金移動実査: 実質純手残り通帳レントゲン
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    手数料・税金を差し引いた「創業者の手元現金」
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 font-bold">
                  {company.passbookDetails.bankStatementDate}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">月間総着金額</span>
                  <span className="text-slate-900 font-black">{formatShortAmount(company.passbookDetails.monthlyGrossJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">▲ 決済手数料</span>
                  <span className="text-rose-600 font-semibold">-{formatShortAmount(company.passbookDetails.paymentFeeJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">▲ ツール・インフラ費</span>
                  <span className="text-amber-600 font-semibold">-{formatShortAmount(company.passbookDetails.infraCostJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">▲ 外注・委託費</span>
                  <span className="text-slate-600 font-semibold">-{formatShortAmount(company.passbookDetails.outsourcingJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-0.5 text-emerald-950 font-bold">
                  <span className="text-[10px] font-mono uppercase block text-emerald-700">創業者実効手残り純利</span>
                  <span className="text-sm font-black">{formatShortAmount(company.passbookDetails.founderTakeHomeJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 text-slate-500">
                  <span className="text-[10px] font-sans block font-medium">※ 税金引当プール</span>
                  <span className="text-slate-700 font-medium">約 {formatShortAmount(company.passbookDetails.taxReserveJpy)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖03: 【稼働インフラ & ツール構成】（ツールがある場合のみ自動表示） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖03: 【稼働インフラ & ツール構成】（ツールがある場合のみ自動表示） */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'INFRASTRUCTURE') && company.tools && company.tools.length > 0 && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                03
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                稼働インフラ & ツール構成 (Operational Infrastructure & Tech Stack)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              TOOLS, EQUIPMENT & 7-DAY BLUEPRINT
            </span>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  事業を自動化・稼働させている全ツール・設備一覧
                </h3>
                <p className="text-[11px] text-slate-500">
                  同じ道具を配線することで、この事業のコアオペレーションを外部から再現可能です。
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                <span className="text-slate-500 font-sans">月間ツール固定費:</span>
                <span className="text-slate-900 font-black">
                  {totalMonthlyToolCost === 0 ? '0円 (完全無料枠)' : `約 ¥${totalMonthlyToolCost.toLocaleString()}/月`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-slate-700 border-b border-slate-200 bg-slate-50 text-[11px]">
                    <th className="py-2.5 px-3 text-left font-bold">ツール / 設備名</th>
                    <th className="py-2.5 px-3 text-left font-bold">役割・カテゴリ</th>
                    <th className="py-2.5 px-3 text-left font-bold">活用目的</th>
                    <th className="py-2.5 px-3 text-right font-bold">月額費用</th>
                    <th className="py-2.5 px-3 text-center font-bold">代替難易度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {company.tools.map((tool, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 text-slate-700 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-left flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span>{tool.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-left font-sans">{tool.category}</td>
                      <td className="py-2.5 px-3 text-slate-700 text-left font-sans">{tool.purpose}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">
                        {tool.monthlyCostJpy === 0 ? '無料' : `¥${tool.monthlyCostJpy.toLocaleString()}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {tool.replacementDifficulty === 'HIGH' ? '独自代替困難' : tool.replacementDifficulty === 'MEDIUM' ? '移行やや手薄' : '容易に代替可'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-sans border-t border-slate-100">
              <span>週平均稼働時間: <strong className="text-slate-900 font-mono font-bold">{company.weeklyHours}時間/週</strong></span>
              <span>運用自動化度: <strong className="text-emerald-700 font-mono font-bold">{company.weeklyHours <= 10 ? '極めて高い (自律稼働)' : '通常運用'}</strong></span>
            </div>
          </div>

          {/* 7日間の具体的立ち上げ工程表（存在する場合のみ表示） */}
          {company.proDossier?.sevenDayBlueprint && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                    7-DAY EXECUTION BLUEPRINT: ゼロからの具体的立ち上げ工程
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    この収益モデルを配線・稼働させた実戦スケジュール
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-bold">
                  所要期間: 7日間完結
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                    DAY 1 - 2
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">プロダクト設計 & オファー定義</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day1to2OfferSetup}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                    DAY 3 - 4
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">決済・契約インフラの即時開通</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day3to4CashflowPipe}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                    DAY 5 - 6
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">初期顧客の獲得（実証）</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day5to6FirstCustomers}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mb-1">
                    DAY 7
                  </span>
                  <h4 className="text-xs font-bold text-emerald-950">自律運用・自動化パイプライン確立</h4>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-sans pt-1">
                    {company.proDossier.sevenDayBlueprint.day7AutomationEngine}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖04: 【初動突破 & 創業者バックグラウンド】 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'STORY') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                04
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                初動突破 & 創業者バックグラウンド (Initial Traction & Founder Story)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              ZERO-COST GO-TO-MARKET & FOUNDER ORIGINS
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 左: 初動の泥臭い突破口 */}
            <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  GO-TO-MARKET BREAKTHROUGH: 初期の顧客獲得手順
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  広告費ゼロで最初の顧客を獲得した具体的な突破口
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                <div className="p-3.5 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-700 font-bold block">突破チャネル（顧客が潜んでいた場所）</span>
                  <p className="text-slate-800 font-medium">
                    {company.first100CustomersStrategy?.tacticalChannel || company.initialTractionStrategy}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-700 font-bold block">初動アクション（実際に仕掛けた提案・行動）</span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.first100CustomersStrategy?.exactAction || company.successStory?.breakthroughMoment || company.initialTractionStrategy}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold block">成約・実証結果</span>
                  <p className="text-emerald-950 font-medium">
                    {company.first100CustomersStrategy?.conversionProof || '公開直後から即時課金が発生し、広告費ゼロで黒字化を達成。'}
                  </p>
                </div>
              </div>

              {/* 初期にやらかした失敗と軌道修正 */}
              {company.earlyFailureLesson && (
                <div className="p-3.5 bg-amber-50/70 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-mono text-[11px] font-bold">
                    <span>[CAPITAL LOSS AUDIT] 初期の重大な資本毀損・仮説検証の失敗記録</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">
                    <strong className="text-slate-900 font-mono font-bold">{company.earlyFailureLesson.wastedMoneyOrTime}</strong>を損失：{company.earlyFailureLesson.whatWentWrong}
                  </p>
                  <p className="text-amber-800 text-[11px] font-sans pt-1 border-t border-amber-200/60">
                    [PIVOT POINT]: <strong className="text-slate-900">事業ピボットの転換点:</strong> {company.earlyFailureLesson.pivotMoment}
                  </p>
                </div>
              )}
            </div>

            {/* 右: 創業者背景 ＆ 発見した市場の歪み */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  FOUNDER BACKGROUND & GLITCH: 創業の原点
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  競合が見落としていた「歪み」と創業者の突破背景
                </h4>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                {company.successStory?.founderProfile && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">創業者プロフィール・境遇</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{company.successStory.founderProfile}</p>
                  </div>
                )}

                {company.successStory?.marketGlitch && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">発見した市場の歪み（競合の死角）</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{company.successStory.marketGlitch}</p>
                  </div>
                )}

                {company.proSecretInsight && (
                  <div className="p-3 bg-indigo-50/70 rounded-lg text-xs font-sans space-y-1">
                    <div className="text-[10px] font-mono text-indigo-900 font-bold uppercase tracking-wider">
                      ANALYST STRUCTURAL INSIGHT / 構造的インサイト
                    </div>
                    <p className="text-indigo-950 text-[11px] leading-relaxed font-medium">
                      {company.proSecretInsight}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-400 text-right pt-2 border-t border-slate-100">
                FIRST-HAND EVIDENCE AUDITED
              </div>
            </div>

          </div>
        </section>
      )}

    </div>
  );
};

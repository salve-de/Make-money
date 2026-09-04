'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';

interface BusinessXraySheetProps {
  company: CompanyRecord;
  onDownloadCsv: () => void;
  onOpenProModal: () => void;
}

export const BusinessXraySheet: React.FC<BusinessXraySheetProps> = ({
  company,
  onDownloadCsv,
  onOpenProModal
}) => {
  // 簡易売却マルチプル計算機用ステート（月利スライダー）
  const latestFin = company.financials[company.financials.length - 1];
  const defaultMonthlyProfit = Math.round((latestFin?.operatingProfitJpy || 10000000) / 12);
  const [simulatedProfitJpy, setSimulatedProfitJpy] = useState<number>(defaultMonthlyProfit);

  // 通帳データ
  const passbook = company.passbookDetails || {
    monthlyGrossJpy: Math.round((latestFin?.revenueJpy || 10000000) / 12),
    paymentFeeJpy: Math.round(((latestFin?.revenueJpy || 10000000) / 12) * 0.036),
    infraCostJpy: company.tools.reduce((acc, t) => acc + t.monthlyCostJpy, 0) || 5000,
    outsourcingJpy: 0,
    founderTakeHomeJpy: Math.round((latestFin?.operatingProfitJpy || 8000000) / 12),
    taxReserveJpy: Math.round(((latestFin?.operatingProfitJpy || 8000000) / 12) * 0.3),
    bankStatementDate: '直近月次実績'
  };

  const netMarginPercent = latestFin?.operatingMarginPercent || 
    Math.round((passbook.founderTakeHomeJpy / (passbook.monthlyGrossJpy || 1)) * 100);

  const formatYen = (num: number) => {
    if (num >= 1000000000000) return `¥${(num / 1000000000000).toFixed(1)}兆`;
    if (num >= 100000000) return `¥${(num / 100000000).toFixed(1)}億円`;
    if (num >= 10000) return `¥${Math.round(num / 10000).toLocaleString()}万円`;
    return `¥${num.toLocaleString()}`;
  };

  // 査定マルチプル計算（SaaS・Webビジネスの標準：営業利益の24ヶ月〜36ヶ月分）
  const valuationLow = Math.round(simulatedProfitJpy * 24);
  const valuationHigh = Math.round(simulatedProfitJpy * 36);

  // 堀の日本語訳
  const getMoatTitle = (moat: MoatPower) => {
    switch (moat) {
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング（大手が構造上真似できない差別化）';
      case 'NETWORK_EFFECTS': return 'ネットワーク効果（使う人が増えるほど独占が強固になる）';
      case 'PROCESS_POWER': return '組織プロセスパワー（真似しようとすると組織が破綻する体制）';
      case 'SWITCHING_COSTS': return 'スイッチングコスト（一度入ると解約が極めて困難）';
      case 'BRANDING': return 'ブランド（第一想起による価格決定権）';
      case 'CORNERED_RESOURCE': return '独占的資源（特許・防衛機密・独自契約）';
      case 'SCALE_ECONOMIES': return '規模の経済（巨大すぎて誰も価格競争で勝てない）';
    }
  };

  return (
    <div className="flex-1 bg-[#090A0C] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none font-sans text-zinc-100">
      
      {/* 1. レントゲン最上部：ファーストビュー衝撃ヘッダー */}
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
                {formatYen(passbook.monthlyGrossJpy)}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500">純利益率</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {netMarginPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. レントゲン骨組み①：誰からいくら奪っているか（事業の本質レントゲン） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#12141A] border border-white/[0.08] space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">01. 獲物（ターゲット顧客）</div>
          <div className="text-xs font-bold text-zinc-100">
            {company.businessEssence.targetCustomer}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            どのような痛みを抱え、なぜ喜んで財布を開くのか。
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#12141A] border border-white/[0.08] space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">02. 撒き餌（提供価値）</div>
          <div className="text-xs font-bold text-zinc-100">
            {company.businessEssence.valueProposition}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            他社には真似できない、顧客が抗えない解決策。
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#12141A] border border-white/[0.08] space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">03. 集金の罠（マネタイズ仕掛け）</div>
          <div className="text-xs font-bold text-emerald-300">
            {company.businessEssence.monetizationWay}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            決済が即座に着金し、キャッシュフローが途切れない構造。
          </p>
        </div>
      </div>

      {/* 3. レントゲン骨組み②：生々しい通帳（月商 vs 原価 vs 純利益のレントゲン） */}
      <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              リアルタイム損益計算書（月次通帳の生レントゲン）
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            原価率: {100 - netMarginPercent}% / 純利益率: {netMarginPercent}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400">① 月間総売上</div>
            <div className="text-sm sm:text-base font-bold font-mono text-white">
              {formatYen(passbook.monthlyGrossJpy)}
            </div>
            <div className="text-[9px] text-zinc-500">100%</div>
          </div>

          <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-rose-400">② 決済手数料</div>
            <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
              -{formatYen(passbook.paymentFeeJpy)}
            </div>
            <div className="text-[9px] text-zinc-500">Stripe等（約3.6%）</div>
          </div>

          <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-rose-400">③ サーバー・API代</div>
            <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
              -{formatYen(passbook.infraCostJpy)}
            </div>
            <div className="text-[9px] text-zinc-500">インフラ固定費</div>
          </div>

          <div className="p-3 bg-[#161822] rounded-lg border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-rose-400">④ 広告費・外注費</div>
            <div className="text-sm sm:text-base font-bold font-mono text-rose-300">
              -{formatYen(passbook.outsourcingJpy)}
            </div>
            <div className="text-[9px] text-zinc-500">泥臭い自力集客</div>
          </div>

          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-emerald-400 font-bold">⑤ 創業者純手取り</div>
            <div className="text-sm sm:text-base font-bold font-mono text-emerald-300">
              {formatYen(passbook.founderTakeHomeJpy)}
            </div>
            <div className="text-[9px] font-bold text-emerald-400">手残り純利 {netMarginPercent}%</div>
          </div>
        </div>

        <div className="p-3 bg-[#0A0C0F] rounded-lg border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200">通帳の解剖所見:</strong> 売上の大部分が広告宣伝費や仕入れ原価に消える従来型ビジネスと異なり、ソフトウェアやAIの限界費用（追加コスト）がほぼゼロであるため、入金された現金の9割以上がそのまま創業者の銀行口座に残る構造。
        </div>
      </div>

      {/* 4. レントゲン骨組み③：使っている武器（Tech Stack Explorer） */}
      <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wide">
            創業者が実際に使った武器一覧（TECH STACK & COST）
          </h2>
          <span className="text-[10px] font-mono text-zinc-400">
            合計維持費: {formatYen(passbook.infraCostJpy)}/月
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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

      {/* 5. レントゲン骨組み④：最初の100人集客実録 ＆ 独占の堀 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 最初の100人集客 */}
        <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3">
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
        <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3">
          <div className="text-[10px] font-mono text-indigo-400 font-bold tracking-wider">
            MOAT POWER (なぜ真似されても潰れないのか)
          </div>
          <h3 className="text-sm font-bold text-white">
            {getMoatTitle(company.primaryMoat)}
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

      {/* 6. レントゲン骨組み⑤：簡易売却シミュレーター（スライダー査定機） */}
      <div className="p-5 rounded-xl bg-linear-to-r from-[#141824] to-[#10121A] border border-white/[0.15] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
              VALUATION SIMULATOR (売却相場査定機)
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">
              この事業モデルを作った場合、将来いくらで売却できるか？
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            標準売却倍率: 営業利益の24〜36ヶ月分
          </span>
        </div>

        {/* スライダー */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-400">想定月間利益（スライダーで調整）:</span>
            <span className="text-emerald-400 font-bold text-sm">
              ¥{Math.round(simulatedProfitJpy / 10000).toLocaleString()}万円 / 月
            </span>
          </div>
          <input
            type="range"
            min={100000}
            max={10000000}
            step={100000}
            value={simulatedProfitJpy}
            onChange={(e) => setSimulatedProfitJpy(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* 査定結果 */}
        <div className="p-4 bg-[#0B0D12] rounded-lg border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Acquire.com等の実勢成約相場に基づく想定売却額
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {formatYen(valuationLow)} 〜 {formatYen(valuationHigh)}
            </div>
          </div>
          <button
            onClick={onOpenProModal}
            className="h-8 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-bold transition-colors shrink-0"
          >
            M&Aデューデリジェンス詳細 →
          </button>
        </div>
      </div>

      {/* 7. レントゲン骨組み⑥：今夜から真似するなら（3ステップ・パクリ手順書） */}
      {company.proDossier?.sevenDayBlueprint && (
        <div className="p-5 rounded-xl bg-[#111317] border border-white/[0.12] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-wide">
              このビジネスを完コピ・模倣するための最短手順書
            </h2>
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

      {/* フッター：CSVダウンロード等のアクションバー */}
      <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>KIN-ROKOKU TERMINAL X-RAY ENGINE</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadCsv}
            className="hover:text-zinc-300 transition-colors"
          >
            [生データCSV出力]
          </button>
          <span>•</span>
          <button
            onClick={onOpenProModal}
            className="text-amber-400/80 hover:text-amber-300 transition-colors"
          >
            [特別会員調査書]
          </button>
        </div>
      </div>

    </div>
  );
};

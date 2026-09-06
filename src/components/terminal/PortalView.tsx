'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { SparklineChart } from '@/components/terminal/SparklineChart';
import { WeeklyNewsletterSection } from '@/components/terminal/WeeklyNewsletterSection';
import { ArrowRight, ChevronRight, Sparkles, Filter, Database, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';

interface PortalViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
  onNavigateToTerminal: () => void;
  onFilterTheme?: (tag: string) => void;
  onOpenCollectionsList?: () => void;
  onOpenCollectionDetail?: (collectionId: string) => void;
  onOpenSignalsList?: () => void;
  onOpenSignalDetail?: (signalId: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenIdeasVault?: () => void;
  onOpenFinder?: () => void;
}

export const PortalView: React.FC<PortalViewProps> = ({
  companies,
  onSelectCompany,
  onNavigateToTerminal,
  onFilterTheme,
  onOpenCollectionsList,
  onOpenCollectionDetail,
  onOpenSignalsList,
  onOpenSignalDetail,
  onOpenLeaderboard,
  onOpenIdeasVault,
  onOpenFinder
}) => {
  // 金額フォーマット関数
  const formatShortAmount = (amountJpy: number): string => {
    if (!amountJpy || amountJpy === 0) return '¥0';
    if (amountJpy >= 100_000_000) {
      const oku = (amountJpy / 100_000_000).toFixed(1);
      return `¥${oku.replace('.0', '')}億円`;
    }
    if (amountJpy >= 10_000) {
      const man = Math.round(amountJpy / 10_000);
      return `¥${man.toLocaleString()}万円`;
    }
    return `¥${amountJpy.toLocaleString()}`;
  };

  // 個人開発・ソロプレナー特化
  const soloDevCompanies = companies.filter(c => c.teamSize === 1).slice(0, 3);

  // 実績急上昇上位5社
  const trendingHotCompanies = [...companies]
    .filter(c => c.scaleTier === 'SOLO_MICRO' || c.teamSize <= 3)
    .sort((a, b) => {
      const aTakeHome = a.passbookDetails?.founderTakeHomeJpy || Math.round((a.financials[a.financials.length - 1]?.operatingProfitJpy || 0) / 12);
      const bTakeHome = b.passbookDetails?.founderTakeHomeJpy || Math.round((b.financials[b.financials.length - 1]?.operatingProfitJpy || 0) / 12);
      return bTakeHome - aTakeHome;
    })
    .slice(0, 5);

  const soloCount = companies.filter(c => c.teamSize === 1).length;
  const soloRatio = companies.length > 0 ? Math.round((soloCount / companies.length) * 100) : 0;
  
  // 動的指標計算（ゼロ除算防御）
  const avgMargin = companies.length > 0
    ? (
        companies.reduce((sum, c) => {
          const latestFin = c.financials && c.financials.length > 0 ? c.financials[c.financials.length - 1] : null;
          return sum + (latestFin?.operatingMarginPercent || 0);
        }, 0) / companies.length
      ).toFixed(1)
    : '0.0';

  const maxMonthlyRevenue = companies.length > 0
    ? Math.max(
        ...companies.map(c => {
          const latestFin = c.financials && c.financials.length > 0 ? c.financials[c.financials.length - 1] : null;
          const monthlyFromAnnual = latestFin ? Math.round(latestFin.revenueJpy / 12) : 0;
          return c.passbookDetails?.monthlyGrossJpy || monthlyFromAnnual || 0;
        })
      )
    : 0;

  const formattedMaxRev = formatShortAmount(maxMonthlyRevenue);

  return (
    <div className="flex-1 bg-white overflow-y-auto font-sans text-slate-900 select-none">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. エグゼクティブ・サマリーボード（McKinsey / PitchBook 規格） */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10 py-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* 上段：タイトル ＆ マクロ指標マトリクス */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 text-white font-bold tracking-wider uppercase">
                  MARKET INDEX
                </span>
                <span>公的決算書・決済明細照合済み 高収益事業構造データベース</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                高収益ビジネス 財務構造 ＆ 資本効率インデックス
              </h1>
            </div>

            {/* 4連マクロKPIマトリクス（1px境界線グリッド） */}
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border border-slate-200 rounded-lg divide-x divide-y sm:divide-y-0 divide-slate-200 shrink-0 font-mono">
              <div className="px-4 py-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">実査台帳</div>
                <div className="text-base sm:text-lg font-bold text-slate-950 tabular-nums">{companies.length} 社</div>
              </div>
              <div className="px-4 py-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">平均営業利益率</div>
                <div className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums">{avgMargin}%</div>
              </div>
              <div className="px-4 py-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">単独最高月商</div>
                <div className="text-base sm:text-lg font-bold text-slate-950 tabular-nums">{formattedMaxRev}</div>
              </div>
              <div className="px-4 py-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">完全1人比率</div>
                <div className="text-base sm:text-lg font-bold text-slate-950 tabular-nums">{soloRatio}%</div>
              </div>
            </div>
          </div>

          {/* 下段：クイック絞り込み ＆ 端末オープンボタン */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400 mr-1">注目切り口:</span>
              {[
                { label: '完全1人・年商億超', tag: '完全1人' },
                { label: '初期費用0円・AI無人化', tag: '初期0円' },
                { label: '地方実業・現場DX', tag: '地方実業' },
                { label: '利益率50%超・独占', tag: '独占' },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (onFilterTheme) onFilterTheme(btn.tag);
                    onNavigateToTerminal();
                  }}
                  className="h-6.5 px-2.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 hover:text-slate-950 transition-colors font-medium cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <button
              onClick={onNavigateToTerminal}
              className="h-7.5 px-3.5 rounded bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>企業財務データベースを開く</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </section>

      {/* メインコンテンツエリア（max-w-7xl 統一規格） */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-10">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. 【実査済み高収益ビジネス TOP 5（通帳・決済照合）】           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2.5">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                TOP MICRO PERFORMERS
              </div>
              <h2 className="text-base font-bold text-slate-950 mt-0.5 group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
                <span>実査済み高収益ビジネス TOP 5（通帳・決済明細照合）</span>
                {onOpenLeaderboard && <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-950" />}
              </h2>
            </div>
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-slate-700 hover:text-slate-950 font-mono font-semibold flex items-center gap-1 self-start sm:self-auto bg-white px-2.5 py-1 rounded border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span>完全ランキング（全社）</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-[11px]">
                  <th className="py-2.5 px-4 w-12 text-center font-bold">順位</th>
                  <th className="py-2.5 px-4 font-bold">事業者 / モデル</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell font-bold text-center">組織体制</th>
                  <th className="py-2.5 px-4 text-right font-bold whitespace-nowrap">月商実績</th>
                  <th className="py-2.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">実効手残り純利</th>
                  <th className="py-2.5 px-4 text-right font-bold whitespace-nowrap">利益率</th>
                  <th className="py-2.5 px-4 hidden md:table-cell text-center font-bold">推移</th>
                  <th className="py-2.5 px-3 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {trendingHotCompanies.map((c, idx) => {
                  const latestFin = c.financials[c.financials.length - 1];
                  const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
                  const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
                  const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <CompanyLogo id={c.id} size="sm" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-950 group-hover:text-slate-700 transition-colors">
                              {c.japaneseName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md font-normal">
                              {c.tagline}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium whitespace-nowrap inline-block">
                          {c.teamSize === 1 ? '完全1人' : `${c.teamSize}人体制`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums font-mono whitespace-nowrap">
                        {formatShortAmount(monthlyRev)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-mono font-bold whitespace-nowrap inline-block">
                          {formatShortAmount(founderTakeHome)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 tabular-nums font-bold font-mono whitespace-nowrap">
                        {netMargin}%
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-center">
                        <div className="flex justify-center">
                          <SparklineChart color="#10B981" width={52} height={16} />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 group-hover:text-slate-950">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. 【リソース適合診断・即時照合バナー（コンサル規格）】          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div 
          onClick={() => (onOpenFinder ? onOpenFinder() : onOpenIdeasVault?.())}
          className="p-5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 select-none group"
        >
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-1.5 py-0.2 rounded bg-slate-950 text-white font-bold uppercase tracking-wider">
                DIAGNOSTIC
              </span>
              <span className="text-slate-500 font-semibold">
                保有リソース（資本・時間・スキル・市場）から事業モデルを逆引き
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-950 group-hover:text-slate-800 transition-colors">
              手札適合診断：実在22社の損益分岐点から、あなたの初期アプローチと価格決定権を算出
            </h3>
            <p className="text-xs text-slate-600 font-normal">
              初期資本ゼロ・週末稼働から着手可能なモデルと、初日から使える営業文面・ツールスタックを提示します。
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            <button
              type="button"
              className="px-4 py-2 bg-slate-950 group-hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Sparkles size={13} className="text-slate-300" />
              <span>リソース適合診断を開く</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. 【高単価産業の構造的余剰利益を獲得する実効モデル TOP 4】        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2.5">
            <div>
              <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                HIGH-MARGIN ARBITRAGE
              </div>
              <h2 className="text-base font-bold text-slate-950 mt-0.5">
                高単価産業の構造的余剰利益を獲得する実効モデル TOP 4
              </h2>
            </div>
            {onOpenIdeasVault && (
              <button
                onClick={onOpenIdeasVault}
                className="text-xs text-slate-700 hover:text-slate-950 font-semibold font-mono flex items-center gap-1 self-start sm:self-auto bg-white px-2.5 py-1 rounded border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span>実践機会台帳を開く</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">実効モデル / 対象市場</div>
              <div className="col-span-4">創業者の着眼点（隙間の正体）</div>
              <div className="col-span-2 text-right">実効手残り月利</div>
              <div className="col-span-1 text-center">詳細</div>
            </div>

            {/* 一覧行リスト */}
            <div className="divide-y divide-slate-100 text-xs">
              {[
                {
                  companyId: 'outbid-lol',
                  title: '地域No.1オークション推薦看板',
                  target: '美容クリニック・審美歯科（客単価30万〜100万円）',
                  insight: '最上位1枠の掲載権をオークション化し、競合より優位に立ちたい院長の虚栄心を入札合戦へ変換。',
                  profit: '+¥100万〜',
                  capital: '¥0 (Stripe直結)'
                },
                {
                  companyId: 'keyence-challenger-edge',
                  title: '中古iPad格安AI外観検査システム',
                  target: '地方町工場・金属加工（キーエンス500万の見積書）',
                  insight: '500万円の見積を断念した工場長に、中古iPad＋画像判定AIで初期20万＋月1.5万保守を即決導入。',
                  profit: '月利150万円',
                  capital: '¥3万 (中古端末)'
                },
                {
                  companyId: 'solo-local-dx',
                  title: 'LINE写真査定・提携施工業者送客モデル',
                  target: '遺品整理・特殊清掃・外壁洗浄（単価30万〜）',
                  insight: '粗利80%超の現場産業。LINE自動見積もりで一次受けし、提携職人に丸投げ送客して紹介料を獲得。',
                  profit: '月利100万円',
                  capital: '¥0 (機材不要)'
                },
                {
                  companyId: 'solo-local-dx',
                  title: '助成金・補助金LLMドラフト自動生成代行',
                  target: '地方中小企業（IT導入補助金・省力化投資）',
                  insight: '100頁超の公募要領を独自プロンプトで15分初稿生成。着手金ゼロ・採択成果報酬で受注。',
                  profit: '+¥200万〜',
                  capital: '¥0 (LLM運用)'
                }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => onSelectCompany(item.companyId)}
                  className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center group"
                >
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0 w-full">
                    <CompanyLogo id={item.companyId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-950 group-hover:text-slate-700 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.target}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 text-[11px] text-slate-600 line-clamp-2">
                    {item.insight}
                  </div>

                  <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 tabular-nums">
                      {item.profit}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 hidden md:block">
                      初期 {item.capital}
                    </span>
                  </div>

                  <div className="col-span-1 hidden md:flex items-center justify-center text-slate-400 group-hover:text-slate-950">
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 5. 【完全1人・個人開発で年商数千万〜億超えモデル】              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2.5">
            <div>
              <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                SOLO ARCHITECTURE
              </div>
              <h2 className="text-base font-bold text-slate-950 mt-0.5">
                完全1人・従業員ゼロで年商数千万〜億を叩き出すモデル
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              オフィスなし・人件費ゼロ・APIとツールで自動化
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">事業者 / 創業者</div>
              <div className="col-span-4">自動化の仕掛け・事業の正体</div>
              <div className="col-span-2 text-right">月商規模 / 純利益</div>
              <div className="col-span-1 text-center">詳細</div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {soloDevCompanies.map((c) => {
                const latestFin = c.financials[c.financials.length - 1];
                const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
                const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
                const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCompany(c.id)}
                    className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center group"
                  >
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0 w-full">
                      <CompanyLogo id={c.id} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-950 group-hover:text-slate-700 transition-colors">
                            {c.japaneseName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                            完全1人
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {c.businessEssence?.whatItDoes || c.tagline}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 text-[11px] text-slate-600 line-clamp-2">
                      {c.businessEssence?.monetizationWay || 'Stripe決済・デジタル自動配信・利益率高位維持'}
                    </div>

                    <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                      <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        {formatShortAmount(founderTakeHome)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5 hidden md:block">
                        月商 {formatShortAmount(monthlyRev)} ({netMargin}%)
                      </span>
                    </div>

                    <div className="col-span-1 hidden md:flex items-center justify-center text-slate-400 group-hover:text-slate-950">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ニュースレターセクション */}
        <WeeklyNewsletterSection />
      </div>
    </div>
  );
};

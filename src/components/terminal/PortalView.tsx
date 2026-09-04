'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';
import { DossierModal } from './portal/DossierModal';

interface PortalViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onNavigateToTerminal: () => void;
  onFilterTheme?: (tag: string) => void;
  onOpenCollectionsList?: () => void;
  onOpenCollectionDetail?: (collectionId: string) => void;
  onOpenSignalsList?: () => void;
  onOpenSignalDetail?: (signalId: string) => void;
  onOpenLeaderboard?: () => void;
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
}) => {
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  // 1. 最近話題・急上昇 TOP 5 (HOT)
  const soloOnlyList = companies.filter((c) => c.scaleTier === 'SOLO_MICRO');
  const trendingHotCompanies = [
    companies.find((c) => c.id === 'outbid-lol') || soloOnlyList[0],
    companies.find((c) => c.id === 'solo-headshotpro') || soloOnlyList[1],
    companies.find((c) => c.id === 'solo-photoai') || soloOnlyList[2],
    companies.find((c) => c.id === 'solo-easlo') || soloOnlyList[3],
    companies.find((c) => c.id === 'habit-app-23yo') || soloOnlyList[4],
  ].filter(Boolean) as CompanyRecord[];

  // 2. 完全1人・個人開発で爆益モデル
  const soloDevCompanies = [
    companies.find((c) => c.id === 'solo-easlo') || soloOnlyList[0],
    companies.find((c) => c.id === 'solo-boilerplate') || soloOnlyList[1],
    companies.find((c) => c.id === 'solo-headshotpro') || soloOnlyList[2],
  ].filter(Boolean) as CompanyRecord[];

  // 3. 地味だが手堅い地方実業・現場DX
  const localCashCowCompanies = companies.filter(
    (c) => c.tags.includes('地方実業') || c.tags.includes('無人貸倉庫') || c.businessModel === 'LOCAL_DX'
  ).slice(0, 3);

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000).toLocaleString()}億円`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000).toLocaleString()}万円`;
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="flex-1 bg-[#090A0D] overflow-y-auto select-none font-sans text-zinc-100">
      
      {/* ========================================================================= */}
      {/* 1. 巨大ヒーローセクション */}
      {/* ========================================================================= */}
      <section className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-10 lg:py-14">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>事業構造・損益データ分析プラットフォーム</span>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              誰が、どこで、<br className="hidden sm:inline" />
              どうやって利益を生み出しているのか。
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
              美談や精神論を排除し、売上規模、粗利率、使用ツール、初期の集客経路まで。<br className="hidden sm:inline" />
              スモールビジネスから高収益企業まで、利益を生み出す仕組みと実態を客観的に記録した情報台帳。
            </p>
          </div>

          {/* クイックテーマセレクター */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-zinc-500 font-mono">注目の切り口:</span>
            {[
              { label: '完全1人・年商億超え', tag: '完全1人' },
              { label: '初期費用0円・AI無人化', tag: '初期0円' },
              { label: '地方実業・現場DX', tag: '地方実業' },
              { label: '利益率50%超・独占覇者', tag: '独占' },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (onFilterTheme) onFilterTheme(btn.tag);
                  onNavigateToTerminal();
                }}
                className="h-7 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {btn.label}
              </button>
            ))}
            <button
              onClick={onNavigateToTerminal}
              className="h-7 px-3.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold transition-colors ml-auto hidden sm:flex items-center gap-1.5 shadow-sm"
            >
              <span>全22社台帳を開く</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 space-y-14">
        
        {/* ========================================================================= */}
        {/* セクション①: 【最近話題・急上昇 TOP 5】 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                HOT & TRENDING EARNERS
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>今特に話題の急上昇・爆益ビジネス TOP 5</span>
                {onOpenLeaderboard && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenLeaderboard ? (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>ランキング完全台帳を開く →</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-500 font-mono">
                直近実績・Stripe等照合済み
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {trendingHotCompanies.map((c, idx) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-3.5 sm:p-4 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-zinc-300 shrink-0">
                      {idx + 1}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors truncate">
                          {c.japaneseName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {c.teamSize === 1 ? '完全1人' : `${c.teamSize}人`}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {c.headquarters}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate font-normal">
                        {c.businessEssence?.whatItDoes || c.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60 font-mono">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-zinc-500">月商実額</div>
                      <div className="text-xs sm:text-sm font-bold text-white tabular-nums">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-emerald-500/90 font-medium">純手取り</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
                        {formatShortAmount(founderTakeHome)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">利益率</div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-300 tabular-nums">
                        {netMargin}%
                      </div>
                    </div>

                    <div className="text-zinc-500 group-hover:text-white transition-colors pl-1">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* セクション②: 【完全1人・個人開発で爆益】 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
                SOLO & INDIE HACKERS
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                完全1人・個人開発で年商数千万〜億を抜くモデル
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              オフィスなし・従業員ゼロ・AIとツールで自動化
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {soloDevCompanies.map((c) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        完全1人運営
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {c.headquarters}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                      {c.japaneseName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {c.businessEssence?.whatItDoes || c.tagline}
                    </p>

                    <div className="p-2.5 bg-zinc-900/60 rounded-md border border-zinc-800/60 text-[11px] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500">集金の手口:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.businessEssence?.monetizationWay || 'Stripe決済・デジタル配信'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-zinc-500">月商</div>
                      <div className="font-bold text-white">{formatShortAmount(monthlyRev)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-emerald-500/90 font-medium">純手取り</div>
                      <div className="font-bold text-emerald-400">{formatShortAmount(founderTakeHome)}</div>
                    </div>
                    <span className="text-zinc-400 group-hover:text-white transition-colors">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* セクション③: 【市場の歪み・未開拓シグナル】 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div 
              onClick={onOpenSignalsList}
              className={`flex items-center gap-2 ${onOpenSignalsList ? 'cursor-pointer group' : ''}`}
            >
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                MARKET SIGNALS
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>今週検知された「未開拓の市場シグナル・歪み」速報</span>
                {onOpenSignalsList && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenSignalsList && (
              <button
                onClick={onOpenSignalsList}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>市場シグナル一覧 →</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-300 font-medium">需要急増 +380%</span>
                  <span className="text-[10px] font-mono text-zinc-500">競合: ほぼゼロ</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  TikTok Shop手元実演アフィリエイト（顔出し・声出し不要）
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  中国・米国の無名便利グッズを輸入し、手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,200万円を抜くチームが急増中。
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 1万円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 300万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-300 font-medium">成約単価 50万円</span>
                  <span className="text-[10px] font-mono text-zinc-500">粗利率 95%</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  地方中小企業向け 助成金・補助金AI申請代行
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  難解な公的申請書類を独自プロンプトで15分でドラフト作成。商工会議所周辺のIT弱小企業にコールド営業し、着手金ゼロ・成果報酬30%で独占。
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 200万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-300 font-medium">継続課金 LTV特大</span>
                  <span className="text-[10px] font-mono text-zinc-500">解約率 1%未満</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  海外オープンソースSaaSの日本語化・国内代理導入
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  英語圏で流行しているオープンソース業務ツールを日本語に翻訳し、中小企業向けに月額3万円の保守契約で導入。開発不要で即座に毎月150万円の不労所得化。
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 150万〜 →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* セクション④: 【地味だが手堅い地方実業・現場DX】 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
                SWEATY & LOCAL DX
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                地味だが超高収益：古い業界をデジタル化して独占する現場モデル
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              大手が来ない泥臭い実業・LINE自動化と職人外注で月利数百万円
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {localCashCowCompanies.map((c) => {
              const latestFin = c.financials[c.financials.length - 1];
              const annualRev = latestFin?.revenueJpy || 100000000;
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 50;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        現場DX・実業
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {c.headquarters}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                      {c.japaneseName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {c.businessEssence?.whatItDoes || c.tagline}
                    </p>

                    <div className="p-2.5 bg-zinc-900/60 rounded-md border border-zinc-800/60 text-[11px] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500">自動化の仕組み:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.businessEssence?.monetizationWay || 'LINE自動見積もり ＋ 現場職人ネットワーク'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-zinc-500">年商規模</div>
                      <div className="font-bold text-white">{formatShortAmount(annualRev)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">営業利益率</div>
                      <div className="font-bold text-emerald-400">{netMargin}%</div>
                    </div>
                    <span className="text-zinc-400 group-hover:text-white transition-colors">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 全収録ビジネス解剖台帳（全22社）へのジャンプカード */}
        {/* ========================================================================= */}
        <section className="p-6 rounded-xl bg-gradient-to-r from-[#101217] via-[#141722] to-[#101217] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                COMPLETE DIRECTORY & ADVANCED SCREENER
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                全{companies.length}社の生損益・ツールスタック・参入障壁台帳
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                作業体質（完全1人/少人数）、初期費用、粗利率、ビジネスモデルで自由にスクリーニング可能。各社の損益計算書・使用ツール・コールドメール原文を閲覧できます。
              </p>
            </div>

            <button
              onClick={onNavigateToTerminal}
              className="h-9 px-5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>分析台帳（DB）を開く</span>
              <span>→</span>
            </button>
          </div>
        </section>

      </div>

      {/* 大特集深掘り調査レポートモーダル */}
      <DossierModal
        dossierId={selectedDossierId}
        onClose={() => setSelectedDossierId(null)}
        companies={companies}
        onSelectCompany={onSelectCompany}
      />

    </div>
  );
};

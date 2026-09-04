'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';
import { DossierModal } from './portal/DossierModal';
import { OpportunitySimulator } from './portal/OpportunitySimulator';
import { PostMortemSection } from './portal/PostMortemSection';
import { MoneyFlowPyramid } from './portal/MoneyFlowPyramid';

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
  onOpenPostMortemArchive?: () => void;
  onOpenPyramidDetail?: () => void;
  onOpenSimulatorDetail?: () => void;
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
  onOpenPostMortemArchive,
  onOpenPyramidDetail,
  onOpenSimulatorDetail,
}) => {
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const soloOnlyList = companies.filter(c => c.scaleTier === 'SOLO_MICRO');
  const hotSoloCompanies = [
    companies.find(c => c.id === 'outbid-lol') || soloOnlyList[0],
    companies.find(c => c.id === 'solo-headshotpro') || soloOnlyList[1],
    companies.find(c => c.id === 'solo-photoai') || soloOnlyList[2],
    companies.find(c => c.id === 'solo-easlo') || soloOnlyList[3],
    companies.find(c => c.id === 'habit-app-23yo') || soloOnlyList[4],
  ].filter(Boolean) as CompanyRecord[];

  // 2. 特集用グループ
  // 特集01: 完全自動・不労集金モデル（ソフトウェア、テンプレ、リーダーボード）
  const passiveIncomeCompanies = companies.filter(c =>
    c.tags.includes('不労所得') || c.id === 'outbid-lol' || c.id === 'solo-easlo' || c.id === 'solo-boilerplate'
  ).slice(0, 3);

  // 特集02: AI労働力搾取モデル（人間0人、AIエージェントで億超え）
  const aiExploitCompanies = companies.filter(c =>
    c.tags.includes('AIツール') || c.id === 'solo-headshotpro' || c.id === 'solo-photoai' || c.id === 'b2b-clay-outbound'
  ).slice(0, 3);

  // 特集03: 泥臭い地方の歪み（古い実業×デジタル無人化）
  const localGlitchCompanies = companies.filter(c =>
    c.tags.includes('地方実業') || c.tags.includes('無人貸倉庫') || c.businessModel === 'LOCAL_DX'
  ).slice(0, 3);

  // 巨大独占企業（別枠の教科書セクション用）
  const megaMonopolyCompanies = companies.filter(c => c.scaleTier === 'MEGA_CORP').slice(0, 3);

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
            <span>2026 最新高収益事業・生損益分析台帳</span>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              世の中で誰が・どうやって・<br className="hidden sm:inline" />
              いくら儲けているかの冷徹な台帳。
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
              巨大独占企業から、完全1人で年商数十億円を抜くソロプレナーまで。美談や精神論を排除し、「誰からいくら奪い、原価いくらで、どう集客しているか」の生々しい通帳と骨組みだけを記録した情報プラットフォーム。
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
        {/* 2. 【本物】個人・スモールビジネス爆益リーダーボード TOP 5 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                TOP EARNERS & HOT SIGNALS
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>今特に話題の急上昇・爆益リーダーボード TOP 5</span>
                {onOpenLeaderboard && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenLeaderboard ? (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>リーダーボード全頭検査 →</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-500 font-mono">
                直近実績・Stripe実額検証済み
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {hotSoloCompanies.map((c, idx) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <span className="text-lg font-mono font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors w-6 text-center shrink-0">
                      0{idx + 1}
                    </span>

                    {c.founderAvatarUrl ? (
                      <img
                        src={c.founderAvatarUrl}
                        alt={c.founderName || c.japaneseName}
                        className="w-11 h-11 rounded-md object-cover border border-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors">
                          {c.japaneseName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {c.founderName || '個人開発者'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {c.teamSize === 1 ? '完全1人運営' : `${c.teamSize}名運営`}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                          • {c.headquarters}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1 font-normal">
                        {c.tagline}
                      </p>
                    </div>
                  </div>

                  {/* 右側：通帳生プレビュー */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60 font-mono">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] text-zinc-500">直近月商規模</div>
                      <div className="text-sm font-bold text-white tabular-nums">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-emerald-500/90 font-medium">創業者純手取り</div>
                      <div className="text-sm font-bold text-emerald-400 tabular-nums">
                        {formatShortAmount(founderTakeHome)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">純利益率</div>
                      <div className="text-sm font-bold text-zinc-300 tabular-nums">
                        {netMargin}%
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded bg-zinc-800 group-hover:bg-zinc-700 text-zinc-300 transition-all text-xs font-mono">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. Trends.co型：今週検知された「未開拓の市場シグナル・歪み」速報 */}
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
            {onOpenSignalsList ? (
              <button
                onClick={onOpenSignalsList}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>市場シグナル一覧 →</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-500 font-mono">
                まだ誰も手をつけていない参入余地
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group"
            >
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
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 1万円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 300万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group"
            >
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
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 200万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 group"
            >
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
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 150万〜 →</span>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. 雑誌風大特集：人間の欲望を直撃する3大コレクション */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div 
              onClick={onOpenCollectionsList}
              className={`${onOpenCollectionsList ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                SPECIAL DOSSIER COLLECTIONS
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>大特集：あいつらの「手口」を丸裸にする3大コレクション</span>
                {onOpenCollectionsList && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenCollectionsList && (
              <button
                onClick={onOpenCollectionsList}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>特集コレクション一覧 →</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            
            {/* 特集01 */}
            <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 space-y-4 flex flex-col justify-between">
              <div 
                onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-passive') : setSelectedDossierId('collection-passive')}
                className="space-y-2 cursor-pointer group"
              >
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  COLLECTION 01
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  【寝てる間に着金】完全自動・不労集金モデルの解剖
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  人を雇わず、在庫を持たず、一度作ればStripeが24時間鳴り止まない不労所得モデル。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                <div className="space-y-1.5">
                  {passiveIncomeCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-2.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono text-zinc-300 shrink-0">
                        純利{c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 95}%
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-passive') : setSelectedDossierId('collection-passive')}
                  className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 特集02 */}
            <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 space-y-4 flex flex-col justify-between">
              <div 
                onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-ai') : setSelectedDossierId('collection-ai')}
                className="space-y-2 cursor-pointer group"
              >
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  COLLECTION 02
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  【AI労働力搾取】コードを書かず、AIを24時間働かせて億を抜く
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  人間を1人も雇わず、Replicate等の推論APIを叩くだけで粗利80%を叩き出すソロプレナーの型。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                <div className="space-y-1.5">
                  {aiExploitCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-2.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono text-zinc-300 shrink-0">
                        年商{formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 50000000)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-ai') : setSelectedDossierId('collection-ai')}
                  className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 特集03 */}
            <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 space-y-4 flex flex-col justify-between">
              <div 
                onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-local') : setSelectedDossierId('collection-local')}
                className="space-y-2 cursor-pointer group"
              >
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  COLLECTION 03
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  【泥臭い地方の歪み】IT弱者の高齢現場を独占する実業DX
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  大手が参入できない地味で泥臭い現場。無人貸倉庫や外壁洗浄など、LINE自動化と職人外注で月利数百万円を抜く型。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                <div className="space-y-1.5">
                  {localGlitchCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-2.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono text-zinc-300 shrink-0">
                        年商{formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 50000000)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onOpenCollectionDetail ? onOpenCollectionDetail('collection-local') : setSelectedDossierId('collection-local')}
                  className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く</span>
                  <span>→</span>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 【新設】手札から逆引き：あなたの勝率最大化ビジネス診断シミュレーター */}
        {/* ========================================================================= */}
        <OpportunitySimulator
          companies={companies}
          onSelectCompany={onSelectCompany}
          onNavigateToTerminal={onNavigateToTerminal}
          onOpenSimulatorDetail={onOpenSimulatorDetail}
        />

        {/* ========================================================================= */}
        {/* 【新設】失敗の墓場：これに手を出した奴らは全員散った「参入禁止地雷市場」 */}
        {/* ========================================================================= */}
        <PostMortemSection onOpenArchive={onOpenPostMortemArchive} />

        {/* ========================================================================= */}
        {/* 【新設】業界の食物連鎖：誰が誰から金を巻き上げているか（マネーフロー暴露ピラミッド） */}
        {/* ========================================================================= */}
        <MoneyFlowPyramid onOpenDetail={onOpenPyramidDetail} />

        {/* ========================================================================= */}
        {/* 5. 全22社ハイライトグリッド（注目の事業解剖カード一覧） */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* 5. 全22社ハイライトグリッド（注目の事業解剖カード一覧） */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                COMPLETE REGISTERED DOSSIERS
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                全収録ビジネス解剖台帳（全{companies.length}社）
              </h2>
            </div>
            <button
              onClick={onNavigateToTerminal}
              className="text-xs text-zinc-300 hover:text-white font-mono font-medium underline underline-offset-4"
            >
              条件検索スクリーナーを開く →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {companies.map((c) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {c.scaleTier === 'SOLO_MICRO' ? '完全1人' : c.scaleTier === 'NICHE_LEADER' ? '中堅ニッチ' : '巨大独占'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {c.headquarters}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                        {c.japaneseName}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed font-normal">
                        {c.tagline}
                      </p>
                    </div>

                    {/* 獲物と集金の罠 */}
                    <div className="p-2.5 bg-zinc-900/60 rounded-md border border-zinc-800/60 space-y-1 text-[11px]">
                      <div className="text-zinc-500 font-mono text-[10px]">集金の仕組み:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed font-normal">
                        {c.businessEssence?.monetizationWay || '直接入札決済・サブスクリプション'}
                      </p>
                    </div>
                  </div>

                  {/* 通帳サマリーフッター */}
                  <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between font-mono">
                    <div>
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
                      <div className="text-[10px] text-zinc-500">純利益率</div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-300 tabular-nums">
                        {netMargin}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. 巨大独占企業（エヌビディア・キーエンス・信越化学：別枠の教科書） */}
        {/* ========================================================================= */}
        <section className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                MEGA MONOPOLY TEXTBOOK (世界の独占覇者)
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                大企業レイヤー：なぜ彼らは年商数兆円で利益率50%超を維持できるのか？
              </h3>
            </div>
            <button
              onClick={() => {
                if (onFilterTheme) onFilterTheme('独占');
                onNavigateToTerminal();
              }}
              className="text-xs text-zinc-400 hover:text-white font-mono"
            >
              独占覇者一覧 →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {megaMonopolyCompanies.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                className="p-3.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white">{c.japaneseName}</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    利益率{c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 50}%
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 font-normal">{c.tagline}</p>
                <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                  年商: {formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 1000000000000)}
                </div>
              </div>
            ))}
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

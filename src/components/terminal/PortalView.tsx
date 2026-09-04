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
}

export const PortalView: React.FC<PortalViewProps> = ({
  companies,
  onSelectCompany,
  onNavigateToTerminal,
  onFilterTheme
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
    <div className="flex-1 bg-[#08090B] overflow-y-auto select-none font-sans text-zinc-100">
      
      {/* ========================================================================= */}
      {/* 1. 巨大ヒーローセクション */}
      {/* ========================================================================= */}
      <section className="border-b border-white/[0.08] bg-linear-to-b from-[#111319] via-[#0C0E13] to-[#090A0C] px-6 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>2026 最新高収益事業・生損益分析台帳</span>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              世の中で誰が・どうやって・<br className="hidden sm:inline" />
              いくら儲けているかの冷徹な台帳。
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
              巨大独占企業から、完全1人で年商数十億円を抜くソロプレナーまで。美談や精神論を排除し、「誰からいくら奪い、原価いくらで、どう集客しているか」の生々しい通帳と骨組みだけを記録した情報プラットフォーム。
            </p>
          </div>

          {/* クイックテーマセレクター */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
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
                className="h-8 px-3.5 rounded-lg bg-[#14161F] hover:bg-[#1C1F2B] border border-white/10 hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {btn.label}
              </button>
            ))}
            <button
              onClick={onNavigateToTerminal}
              className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors ml-auto hidden sm:flex items-center gap-1.5"
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
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-3">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
                TOP EARNERS & HOT SIGNALS
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                今特に話題の急上昇・爆益リーダーボード TOP 5
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              直近実績・Stripe実額検証済み
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {hotSoloCompanies.map((c, idx) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 sm:p-5 rounded-xl bg-[#101217] hover:bg-[#141722] border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <span className="text-xl sm:text-2xl font-mono font-black text-zinc-600 group-hover:text-emerald-400 transition-colors w-7 text-center shrink-0">
                      0{idx + 1}
                    </span>

                    {c.founderAvatarUrl ? (
                      <img
                        src={c.founderAvatarUrl}
                        alt={c.founderName || c.japaneseName}
                        className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#181A24] border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors">
                          {c.japaneseName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {c.founderName || '個人開発者'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/5">
                          {c.teamSize === 1 ? '完全1人運営' : `${c.teamSize}名運営`}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                          • {c.headquarters}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-1 font-normal">
                        {c.tagline}
                      </p>
                    </div>
                  </div>

                  {/* 右側：通帳生プレビュー */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5 font-mono">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] text-zinc-500">直近月商規模</div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-emerald-500 font-bold">創業者純手取り</div>
                      <div className="text-sm sm:text-base font-bold text-emerald-400">
                        {formatShortAmount(founderTakeHome)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">純利益率</div>
                      <div className="text-sm sm:text-base font-bold text-zinc-200">
                        {netMargin}%
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/80 group-hover:bg-emerald-500 group-hover:text-black text-zinc-300 transition-all text-xs font-bold">
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
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MARKET SIGNALS
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                今週検知された「未開拓の市場シグナル・歪み」速報
              </h2>
            </div>
            <span className="text-xs text-amber-400/80 font-mono">
              まだ誰も手をつけていない参入余地
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-xl bg-[#121319] border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">需要急増 +380%</span>
                <span className="text-[10px] font-mono text-zinc-500">競合: ほぼゼロ</span>
              </div>
              <h3 className="font-bold text-sm text-white leading-snug">
                TikTok Shop手元実演アフィリエイト（顔出し・声出し不要）
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                中国・米国の無名便利グッズを輸入し、手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,200万円を抜くチームが急増中。
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 1万円</span>
                <span className="text-amber-400 font-bold">月利 300万〜</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#121319] border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">成約単価 50万円</span>
                <span className="text-[10px] font-mono text-zinc-500">粗利率 95%</span>
              </div>
              <h3 className="font-bold text-sm text-white leading-snug">
                地方中小企業向け 助成金・補助金申請AI代行
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                難解な公的申請書類を独自プロンプトで15分でドラフト作成。商工会議所周辺のIT弱小企業にコールド営業し、着手金ゼロ・成果報酬30%で独占。
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 0円</span>
                <span className="text-amber-400 font-bold">月利 200万〜</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#121319] border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">継続課金 LTV特大</span>
                <span className="text-[10px] font-mono text-zinc-500">解約率 1%未満</span>
              </div>
              <h3 className="font-bold text-sm text-white leading-snug">
                海外オープンソースSaaSの日本語化・国内代理導入
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                英語圏で流行しているオープンソース業務ツールを日本語に翻訳し、中小企業向けに月額3万円の保守契約で導入。開発不要で即座に毎月150万円の不労所得化。
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">想定参入元手: 0円</span>
                <span className="text-amber-400 font-bold">月利 150万〜</span>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. 雑誌風大特集：人間の欲望を直撃する3大金塊コレクション */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="border-b border-white/[0.08] pb-3">
            <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
              SPECIAL DOSSIER COLLECTIONS
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              大特集：あいつらの「手口」を丸裸にする3大コレクション
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* 特集01: 寝ているだけで月1,000万 */}
            <div className="p-6 rounded-2xl bg-linear-to-b from-[#141622] to-[#0E1017] border border-white/[0.12] space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  COLLECTION 01
                </span>
                <h3 className="text-base font-bold text-white leading-snug">
                  【寝てる間に着金】完全自動・不労集金モデルの解剖
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  人を雇わず、在庫を持たず、一度作ればStripeが24時間鳴り止まない不労所得モデル。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="space-y-2">
                  {passiveIncomeCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-3 rounded-lg bg-[#090A0E] hover:bg-[#181B26] border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                        純利{c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 95}%
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedDossierId('collection-passive')}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く（全貌・手順・武器）</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 特集02: AI労働力搾取モデル */}
            <div className="p-6 rounded-2xl bg-linear-to-b from-[#181422] to-[#0E0B15] border border-white/[0.12] space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  COLLECTION 02
                </span>
                <h3 className="text-base font-bold text-white leading-snug">
                  【AI労働力搾取】コードを書かず、AIを24時間働かせて億を抜く
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  人間を1人も雇わず、Replicate等の推論APIを叩くだけで粗利80%を叩き出すソロプレナーの型。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="space-y-2">
                  {aiExploitCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-3 rounded-lg bg-[#090A0E] hover:bg-[#181B26] border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                        年商{formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 50000000)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedDossierId('collection-ai')}
                  className="w-full py-2.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く（全貌・手順・武器）</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 特集03: 泥臭い地方の歪み */}
            <div className="p-6 rounded-2xl bg-linear-to-b from-[#181614] to-[#0E0D0B] border border-white/[0.12] space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  COLLECTION 03
                </span>
                <h3 className="text-base font-bold text-white leading-snug">
                  【泥臭い地方の歪み】IT弱者の高齢現場を独占する実業DX
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  大手が参入できない地味で泥臭い現場。無人貸倉庫や外壁洗浄など、LINE自動化と職人外注で月利数百万円を抜く型。
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="space-y-2">
                  {localGlitchCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="p-3 rounded-lg bg-[#090A0E] hover:bg-[#181B26] border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-zinc-200 truncate">{c.japaneseName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{c.tagline}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                        年商{formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 50000000)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedDossierId('collection-local')}
                  className="w-full py-2.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>大特集深掘りレポートを開く（全貌・手順・武器）</span>
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
        />

        {/* ========================================================================= */}
        {/* 【新設】失敗の墓場：これに手を出した奴らは全員散った「参入禁止地雷市場」 */}
        {/* ========================================================================= */}
        <PostMortemSection />

        {/* ========================================================================= */}
        {/* 【新設】業界の食物連鎖：誰が誰から金を巻き上げているか（マネーフロー暴露ピラミッド） */}
        {/* ========================================================================= */}
        <MoneyFlowPyramid />

        {/* ========================================================================= */}
        {/* 5. 全22社ハイライトグリッド（注目の事業解剖カード一覧） */}
        {/* ========================================================================= */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-3">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 font-bold tracking-wider uppercase">
                COMPLETE REGISTERED DOSSIERS
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                全収録ビジネス解剖台帳（全{companies.length}社）
              </h2>
            </div>
            <button
              onClick={onNavigateToTerminal}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-medium underline underline-offset-4"
            >
              条件検索スクリーナーを開く →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-5 rounded-xl bg-[#101217] hover:bg-[#141722] border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-white/5">
                        {c.scaleTier === 'SOLO_MICRO' ? '完全1人' : c.scaleTier === 'NICHE_LEADER' ? '中堅ニッチ' : '巨大独占'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {c.headquarters}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {c.japaneseName}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {c.tagline}
                      </p>
                    </div>

                    {/* 獲物と集金の罠 */}
                    <div className="p-3 bg-[#08090C] rounded-lg border border-white/5 space-y-1 text-[11px]">
                      <div className="text-zinc-500 font-mono text-[10px]">集金の仕組み:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.businessEssence?.monetizationWay || '直接入札決済・サブスクリプション'}
                      </p>
                    </div>
                  </div>

                  {/* 通帳サマリーフッター */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between font-mono">
                    <div>
                      <div className="text-[10px] text-zinc-500">月商実額</div>
                      <div className="text-sm font-bold text-white">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-emerald-500 font-bold">純手取り</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {formatShortAmount(founderTakeHome)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">純利益率</div>
                      <div className="text-sm font-bold text-zinc-200">
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
        <section className="p-6 rounded-2xl bg-[#0E1015] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                MEGA MONOPOLY TEXTBOOK (世界の独占覇者)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
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
                className="p-4 rounded-xl bg-[#090A0E] hover:bg-[#141620] border border-white/5 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{c.japaneseName}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    利益率{c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 50}%
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{c.tagline}</p>
                <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/5">
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

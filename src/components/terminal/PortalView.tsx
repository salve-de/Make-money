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
        {/* 【キラー兵器①】地雷市場（死体） ⇄ 金脈市場（生者）の直接対比レーダー */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/40 uppercase tracking-wider">
                  GRAVEYARD VS GOLDMINE
                </span>
                <span className="text-[10px] font-mono text-zinc-500">直近市場検死・マネーフロー追跡</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
                <span>参入即死の地雷市場 (死体) ⇄ いま金が流入する最新金脈 (生者)</span>
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              「何を避けて、どこを攻めるべきか」の冷徹な対比
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 左側：参入者が全滅している地雷市場（赤・警告・検死調書） */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#130B0D] border border-rose-500/25 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-rose-200">
                    ⚠️ 初心者が即死している「落ち目・地雷市場」検死レポート
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/90 px-2 py-0.5 rounded border border-rose-800/40">
                  AUTOPSY REPORT
                </span>
              </div>

              <div className="space-y-3 text-xs font-sans">
                {/* 地雷1: AI美女・画像集 */}
                <div className="p-3.5 rounded-lg bg-[#0C0608] border border-rose-900/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm">✕ AI美女・グラビア画像集のプラットフォーム直売</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400">死亡率 99.2%</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【即死の引き金】:</strong> 参入者が数万人に激増し、Kindle/FANZAで1冊100円の投げ売り合戦に突入。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的死因】:</strong> 各社が「AI生成物の販売手数料引き上げ」や「一斉アカウントBAN」を発動。月数万円のGPU代を回収できず、電気代と時間を溶かして時給30円で全員討ち死に。
                    </div>
                    <div className="text-zinc-500 text-[10px] border-t border-rose-950/60 pt-1">
                      💡 教訓: 参入障壁ゼロのデジタルデータ直売は、プラットフォームの規約1行で一夜にして蒸発する。
                    </div>
                  </div>
                </div>

                {/* 地雷2: 店舗せどり */}
                <div className="p-3.5 rounded-lg bg-[#0C0608] border border-rose-900/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm">✕ 家電量販店・ドンキ等の国内店舗せどり（転売）</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400">資金ショート多発</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【即死の引き金】:</strong> 店舗の購入制限・転売出禁が全国で厳格化。配送料高騰で利益幅が消滅。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的死因】:</strong> Amazonの真贋調査発動で売上金が数ヶ月間強制凍結。クレジットカード限度額いっぱいに仕入れた在庫が部屋を埋め尽くし、翌月のカード引き落とし不能で破産者が続出。
                    </div>
                    <div className="text-zinc-500 text-[10px] border-t border-rose-950/60 pt-1">
                      💡 教訓: 「物を持つビジネス」でキャッシュフローを舐めると、黒字のまま即死する。
                    </div>
                  </div>
                </div>

                {/* 地雷3: 無差別Web制作受託 */}
                <div className="p-3.5 rounded-lg bg-[#0C0608] border border-rose-900/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm">✕ クラウドソーシング無差別Web制作・LP受託</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400">時給120円地獄</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【即死の引き金】:</strong> v0やCursor等のAIツール一般化で、クライアント自身がLPを即日作れる時代に。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的死因】:</strong> 1件5,000円の案件にスクール卒業生60人が群がる価格崩壊。無限の修正指示に追われ、80時間働いて手取り5,000円の搾取地獄でメンタル崩壊。
                    </div>
                    <div className="text-zinc-500 text-[10px] border-t border-rose-950/60 pt-1">
                      💡 教訓: 「誰でもできる受託労働」は、AIに代替される前に同業者の値引き競争で餓死する。
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側：いま金が流入している最新金脈手口（緑・金脈・種明かし台帳） */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#09130F] border border-emerald-500/25 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-200">
                    💰 いま金が流入！「業界のバグ」を突いた生々しい種明かし
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800/40">
                  REAL MECHANISM
                </span>
              </div>

              <div className="space-y-3 text-xs font-sans">
                {/* 金脈1: TikTok Shop手元実演 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
                  className="p-3.5 rounded-lg bg-[#050C09] border border-emerald-900/40 hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm group-hover:text-emerald-200">
                      〇 顔出し・声出し不要「TikTok Shop手元実演アフィリエイト」
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2">
                      月利300万〜
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【突いたプラットフォームの歪み】:</strong> TikTokがEC強化のためShop付き動画を異常優遇（アルゴリズムが勝手に数百万再生へ拡散）。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【仕掛けたズル（手口）】:</strong> 米国・中国でバズった便利グッズを買い、手元だけで箱から出して動かす15秒動画を量産。広告費ゼロで初月月商2,200万円（利益率24%）。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>💰 純手残り: 元手1万円（サンプル代）から初月で数百万円の即金性</span>
                      <span className="group-hover:translate-x-1 transition-transform">詳細を見る →</span>
                    </div>
                  </div>
                </div>

                {/* 金脈2: 海外オープンソースSaaS国内代理導入 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
                  className="p-3.5 rounded-lg bg-[#050C09] border border-emerald-900/40 hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm group-hover:text-emerald-200">
                      〇 開発不要「海外オープンソースSaaSの日本語化＆代理導入保守」
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2">
                      月利150万〜
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【突いた言語・情報格差のバグ】:</strong> GitHub上の無料OSSツールが世界最高峰なのに、日本の企業は英語というだけで導入できず高額国産ツールに課金中。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【仕掛けたズル（手口）】:</strong> 無料OSSを日本語翻訳し、中小企業へ「月3万円の保守契約」でサーバー設置してあげるだけ。開発ゼロで解約率1%未満のストック収益化。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>💰 純手残り: 元手0円・開発ゼロで毎月150万円の安定チャリンチャリン</span>
                      <span className="group-hover:translate-x-1 transition-transform">詳細を見る →</span>
                    </div>
                  </div>
                </div>

                {/* 金脈3: 実在 Outbid.lol オークション看板 */}
                <div 
                  onClick={() => onSelectCompany('outbid-lol')}
                  className="p-3.5 rounded-lg bg-[#050C09] border border-emerald-900/40 hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm group-hover:text-emerald-200">
                      〇 実在 Outbid.lol：起業家の見栄を煽り48時間で200万円を強奪した手口
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2">
                      月利30万〜80万
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【突いた心理のバグ】:</strong> 通常の広告枠は誰も見ないが、「一番金を払った奴だけがトップに君臨できる」オークションルールにすると起業家のプライドの殴り合いが勃発。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【仕掛けたズル（手口）】:</strong> Next.js＋Stripeでわずか3時間で構築。「1ドルでも上回られたら即消滅」の看板を公開。起業家同士が意地で勝手に入札合戦を展開。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>💰 純手残り: 運営作業ゼロ・完全自動で48時間で200万円超がStripe着金</span>
                      <span className="group-hover:translate-x-1 transition-transform">詳細を見る →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* セクション: 【「儲かっている業界」から金を吸い上げる！個人の下請け・中抜き受注手口 TOP 4】 */}
        {/* ========================================================================= */}
        <section className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/40 uppercase tracking-wider">
                  RICH CLIENT ARBITRAGE
                </span>
                <span className="text-[10px] font-mono text-zinc-500">スキル不要・金持ち企業への寄生モデル</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                金が唸る業界から個人が中抜き！合法的な受注・下請け逆転手口 TOP 4
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              「ゼロから商品を作らず、金持ち業界の財布から抜く」
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* カード1: 美容クリニック・審美歯科 ✕ 入札型看板 */}
            <div 
              onClick={() => onSelectCompany('outbid-lol')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/90 hover:border-amber-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/30">
                      標的: 美容クリニック・審美歯科
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">客単価50万〜200万円</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-amber-200 transition-colors leading-snug">
                  地域No.1推薦メディアの「入札型オークション看板」設置
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-200">業界の金回り:</strong> 自由診療で莫大な粗利を稼ぎ、広告費に月数百万円を投下。「競合他院より目立ちたい」という院長の見栄が常時沸騰。
                  </p>
                  <p>
                    <strong className="text-amber-300">個人の手口:</strong> 地域限定の比較メディアを作り、最上位1枠をオークション制に。店舗同士を競わせることで、営業ゼロで月30万〜80万円の掲載料が自動入金。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">元手: 0円</span>
                  <span className="text-[11px] text-zinc-500">スキル不要</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">手残り:</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm">月利 30万〜80万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード2: 地方町工場・中小製造業 ✕ iPad格安AI検査 */}
            <div 
              onClick={() => onSelectCompany('keyence-6861')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/90 hover:border-emerald-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/30">
                      標的: 地方町工場・金属加工
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">検査員採用難・高齢化</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-emerald-200 transition-colors leading-snug">
                  キーエンスの死角を突く「中古iPad格安AI外観検査」直販
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-200">業界の金回り:</strong> 目視検査の人手不足が致命的。キーエンスに相談するも「一式500万円＋専用配線」と言われて手が出せず絶望中。
                  </p>
                  <p>
                    <strong className="text-emerald-300">個人の手口:</strong> 中古iPad（3万円）に市販ノーコードAIモデルを入れ、「初期15万円＋月1.5万円」で設置。キーエンスの高額見積もりを逆手に取って即決受注。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">元手: 3万円</span>
                  <span className="text-[11px] text-zinc-500">ノーコード</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">手残り:</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm">月利 60万〜150万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード3: 不用品回収・遺品整理 ✕ LINE自動見積もり＋送客中抜き */}
            <div 
              onClick={() => onSelectCompany('solo-local-dx')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/90 hover:border-cyan-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/30">
                      標的: 不用品回収・遺品整理・特殊清掃
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">案件単価20万〜80万円</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-cyan-200 transition-colors leading-snug">
                  LINE写真AI概算見積もりによる「完全不労・送客中抜き」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-200">業界の金回り:</strong> 粗利率80%以上の高収益ビジネスだが、現場の職人はネット集客が全くできずチラシや大手ポータルへの高額上納金に苦悶。
                  </p>
                  <p>
                    <strong className="text-cyan-300">個人の手口:</strong> 「部屋の写真を送るだけで概算見積もりが出るLINE」を作り、地元の職人に1件2万〜5万円で流すだけ。汗を一切かかずに不労ストック化。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">元手: 0円</span>
                  <span className="text-[11px] text-zinc-500">作業ゼロ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">手残り:</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm">月利 80万〜200万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード4: 中小企業・スタートアップ ✕ 助成金・補助金AIドラフト代行 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800/90 hover:border-purple-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/30">
                      標的: 中小企業・店舗オーナー
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">給付額300万〜2000万円</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-purple-200 transition-colors leading-snug">
                  難解な公募要領を15分でドラフト化「補助金AI申請代行」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-200">業界の金回り:</strong> IT導入や設備刷新で巨額の補助金が出るが、申請書類が難解すぎて社長が断念。士業は着手金で20万円を要求して敬遠される。
                  </p>
                  <p>
                    <strong className="text-purple-300">個人の手口:</strong> 申請要領をAIプロンプトに流し込んで15分でドラフトを作成。「着手金0円・採択時20%」を提示して中小企業から独占受注。1件採択で数十万〜数百万円。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">元手: 0円</span>
                  <span className="text-[11px] text-zinc-500">プロンプトのみ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">手残り:</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm">月利 100万〜300万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>
          </div>
        </section>

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

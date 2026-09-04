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
  onOpenIdeasVault?: () => void;
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
            
            {/* 左側：参入者が全滅している地雷市場（構造的衰退市場・資本毀損リスク検死） */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#120D0E] border border-rose-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-rose-200 tracking-tight">
                    構造的衰退市場・資本毀損リスク検死レポート
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 uppercase">
                  CAPITAL DESTRUCTION AUTOPSY
                </span>
              </div>

              <div className="space-y-3 text-xs font-sans">
                {/* 地雷1: AI美女・画像集 */}
                <div className="p-3.5 rounded bg-[#0A0607] border border-rose-950/60 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm font-medium">生成AI画像・デジタルアセットの直売市場</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400 tabular-nums">参入者淘汰率 99.2%</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【構造的欠陥】:</strong> 参入障壁ゼロによる供給過多。プラットフォーム上での1冊100円投げ売り価格破壊が常態化。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的要因】:</strong> プラットフォーム側の規約改定（販売手数料引き上げ・アカウント一斉凍結）により収益が蒸発。GPUインフラ原価を回収できず完全赤字化。
                    </div>
                    <div className="text-zinc-500 text-[10px] font-mono border-t border-rose-950/60 pt-1">
                      [ANALYST NOTE]: 参入障壁ゼロの均質化デジタルデータ直売は、プラットフォームの規約1行で事業継続性が消滅する。
                    </div>
                  </div>
                </div>

                {/* 地雷2: 店舗せどり */}
                <div className="p-3.5 rounded bg-[#0A0607] border border-rose-950/60 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm font-medium">国内リテール店舗アービトラージ（物販せどり）</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400">キャッシュショート頻発</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【構造的欠陥】:</strong> 小売店側の転売対策・購入制限の全国的厳格化、および物流コスト高騰によるマージン蒸発。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的要因】:</strong> 大手ECモールの真贋調査発動に伴う売掛金凍結。カード枠限度まで仕入れた不良在庫を抱え、運転資金ショートによる破綻が多発。
                    </div>
                    <div className="text-zinc-500 text-[10px] font-mono border-t border-rose-950/60 pt-1">
                      [ANALYST NOTE]: 「物理的在庫を持つスモールビジネス」において運転資本管理を誤ると、帳簿上黒字のまま資金ショートに至る。
                    </div>
                  </div>
                </div>

                {/* 地雷3: 無差別Web制作受託 */}
                <div className="p-3.5 rounded bg-[#0A0607] border border-rose-950/60 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="text-sm font-medium">クラウドソーシング無差別Web受託・LP制作</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50 text-rose-400">実質時給 100円未満</span>
                  </div>
                  <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-rose-400 font-mono">【構造的欠陥】:</strong> 生成AI（Cursor / v0等）の普及により、エンドクライアント自身の内製化が容易になり発注単価が急落。
                    </div>
                    <div>
                      <strong className="text-rose-400 font-mono">【致命的要因】:</strong> 単価数千円のコモディティ案件に数百人が群がる過当競争。不採算案件の無限修正に忙殺され、事業拡大余力を完全に喪失。
                    </div>
                    <div className="text-zinc-500 text-[10px] font-mono border-t border-rose-950/60 pt-1">
                      [ANALYST NOTE]: 差別化要因のない単純受託労働は、AIによる自動化以前に同業者の値下げチキンレースによって自滅する。
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側：いま金が流入している最新金脈手口（資金流入フロンティア・構造的裁定取引） */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#09110E] border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-200 tracking-tight">
                    資本流入フロンティア・構造的裁定取引のメカニズム
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 uppercase">
                  STRUCTURAL ARBITRAGE
                </span>
              </div>

              <div className="space-y-3 text-xs font-sans">
                {/* 金脈1: TikTok Shop手元実演 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
                  className="p-3.5 rounded bg-[#040A07] border border-emerald-950/60 hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm font-medium group-hover:text-emerald-200">
                      非属人的短尺実演・成果報酬型コマース (TikTok Shop)
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2 tabular-nums">
                      営業利益率 24% / 月利300万〜
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【プラットフォーム構造の歪み】:</strong> プラットフォーム側のEC強化方針に伴う、コマース導線付きショート動画へのアルゴリズム偏重配分。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【実効参入メカニズム】:</strong> 海外検証済み商材の手元実演のみに特化した15秒規格化クリエイティブの量産。広告費ゼロでのオーガニック流入独占。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>実効手残り: サンプル費用の最小投下から初月で数百万円規模の即時キャッシュイン</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">分析調書を開く →</span>
                    </div>
                  </div>
                </div>

                {/* 金脈2: 海外オープンソースSaaS国内代理導入 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
                  className="p-3.5 rounded bg-[#040A07] border border-emerald-950/60 hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm font-medium group-hover:text-emerald-200">
                      海外OSS・バーティカルツールの国内導入支援・保守ストック
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2 tabular-nums">
                      解約率 1%未満 / 月利150万ストック
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【言語・情報格差の歪み】:</strong> 高性能なグローバルオープンソースが存在する一方、国内中堅企業の英語・導入障壁による高額国産ベンダー依存。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【実効参入メカニズム】:</strong> 既存OSSのローカライズ設定とセキュアホスティング代行。自前開発ゼロで月額保守ストック契約を締結。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>実効手残り: 初期開発費0円・固定費ほぼゼロによる高営業利益率（約92%）</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">分析調書を開く →</span>
                    </div>
                  </div>
                </div>

                {/* 金脈3: 富裕業界特化の現場DX・送客中抜き市場 */}
                <div 
                  onClick={() => onSelectCompany('solo-local-dx')}
                  className="p-3.5 rounded bg-[#040A07] border border-emerald-950/60 hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="text-sm font-medium group-hover:text-emerald-200">
                      高単価現場産業（特殊清掃・遺品整理等）へのLINE見積自動送客仲介
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 shrink-0 ml-2 tabular-nums">
                      成約手数料 1件3万〜5万 / 月利120万
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                    <div>
                      <strong className="text-zinc-200 font-mono">【産業構造の盲点】:</strong> 粗利益率80%超・案件単価数十万円のドル箱現場産業において、職人のWeb集客能力欠如と顧客の電話問い合わせ心理的障壁。
                    </div>
                    <div>
                      <strong className="text-emerald-300 font-mono">【実効参入メカニズム】:</strong> 画像送信型LINE自動査定窓口を整備し、案件を提携事業者に送客して紹介フィーを中抜き。自らは作業着を着ず現場ゼロで完結。
                    </div>
                    <div className="text-emerald-400/90 text-[10px] font-mono border-t border-emerald-950/60 pt-1 flex items-center justify-between">
                      <span>実効手残り: 労働集約型業務を完全に他社へアウトソースし、高利益率送客手数料のみを捕捉</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">分析調書を開く →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* セクション: 【高単価産業の構造的余剰利益を獲得する実効アプローチ TOP 4】 */}
        {/* ========================================================================= */}
        <section className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-white/10 uppercase tracking-wider">
                  HIGH-MARGIN INDUSTRY ARBITRAGE
                </span>
                <span className="text-[10px] font-mono text-zinc-500">高収益産業の構造的盲点への寄生型アプローチ</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                高単価産業の構造的余剰利益を獲得する実効アプローチ TOP 4
              </h2>
            </div>
            {onOpenIdeasVault ? (
              <button
                onClick={onOpenIdeasVault}
                className="text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1.5 self-start sm:self-auto bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded border border-white/10 transition-colors shadow-xs"
              >
                <span>実践アイデア台帳を開く →</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-400 font-mono">
                ゼロからの商品開発を排し、資本が潤沢な産業の余剰利益を中抜きするモデル
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* カード1: 美容クリニック・審美歯科 ✕ 入札型看板 */}
            <div 
              onClick={() => onSelectCompany('outbid-lol')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10">
                      TARGET: 美容クリニック・審美歯科（客単価50万〜200万）
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold tabular-nums">粗利率 90%</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  高単価医療機関の競合心理を活用した「地域特化メディア入札型トップ枠」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-300 font-mono">【構造的歪み】:</strong> 自由診療の高い粗利益率に対し、リスティング広告（1クリック数千円）のCPAが高騰。競合他院との序列意識が極めて強く、露出順位への執着が常態化。
                  </p>
                  <p>
                    <strong className="text-zinc-300 font-mono">【実効参入メカニズム】:</strong> 地域・施術特化型比較枠の最上位1枠をオークション入札制として運用。院長間の競合入札により、個別営業工数ゼロで掲載料を自動獲得。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">初期資本: 0円</span>
                  <span className="text-[11px] text-zinc-500">開発工数: 最小</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">実効手残りCF:</span>
                  <span className="font-bold text-white text-xs sm:text-sm tabular-nums">月利 50万〜100万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード2: 地方町工場・中小製造業 ✕ iPad格安AI検査 */}
            <div 
              onClick={() => onSelectCompany('keyence-6861')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10">
                      TARGET: 地方製造業・金属加工（目視検査員不足）
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">キーエンス空白地帯</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  大手FAベンダーの価格空白地帯を補足する「汎用タブレット型格安外観検査」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-300 font-mono">【構造的歪み】:</strong> 大手FAメーカーの高額ライン（一式500万円＋保守年間100万円）に対し、高齢パート検査員の退職に直面する中小町工場は予算調達が物理的に不可能。
                  </p>
                  <p>
                    <strong className="text-zinc-300 font-mono">【実効参入メカニズム】:</strong> 中古タブレット端末と既存画像判定AIをパッケージ化し、「初期20万円＋月額1.5万円保守」で導入。500万円のアンカー効果により即時意思決定を獲得。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">初期資本: 3万円</span>
                  <span className="text-[11px] text-zinc-500">ノーコード構成</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">実効手残りCF:</span>
                  <span className="font-bold text-white text-xs sm:text-sm tabular-nums">初期200万＋月15万ストック</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード3: 不用品回収・遺品整理 ✕ LINE自動見積もり＋送客中抜き */}
            <div 
              onClick={() => onSelectCompany('solo-local-dx')}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10">
                      TARGET: 遺品整理・残置物撤去（案件単価30万〜100万）
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">現場作業ゼロ</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  職人のWeb集客障壁と発注者の電話忌避を仲介する「LINE画像査定・送客手数料モデル」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-300 font-mono">【構造的歪み】:</strong> 粗利80%超の高収益分野である一方、現場職人のデジタルマーケティング能力が皆無。依頼主側も現地立ち会い・電話見積もりに強い心理的抵抗感。
                  </p>
                  <p>
                    <strong className="text-zinc-300 font-mono">【実効参入メカニズム】:</strong> 写真送付による概算即時見積もりLINE窓口を整備し、案件を提携事業者に送客して成約紹介料（1件3万〜5万円）を全自動中抜き。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">初期資本: 0円</span>
                  <span className="text-[11px] text-zinc-500">自社機材不要</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">実効手残りCF:</span>
                  <span className="font-bold text-white text-xs sm:text-sm tabular-nums">月20件＝月利 100万円</span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* カード4: 中小企業・スタートアップ ✕ 助成金・補助金AIドラフト代行 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-xl bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-500 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10">
                      TARGET: 中小企業公的補助金（受給額300万〜2000万円）
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">着手金ゼロ型参入</span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  士業の着手金参入障壁を解体する「公募要領特化LLM事業計画書ドラフト生成代行」
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-zinc-300 font-mono">【構造的歪み】:</strong> 100ページに及ぶ公募要領により自力申請が困難。専門士業への依頼は「着手金20万＋成功報酬」が一般的で、不採択リスクによる潜在顧客の離脱が多発。
                  </p>
                  <p>
                    <strong className="text-zinc-300 font-mono">【実効参入メカニズム】:</strong> 公募要領と加点要件をインプットしたLLMワークフローにより初稿を短時間生成。「着手金0円・採択時成果報酬」の破格オファーで案件を独占獲得。
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">初期資本: 0円</span>
                  <span className="text-[11px] text-zinc-500">LLMプロンプト運用</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">実効手残りCF:</span>
                  <span className="font-bold text-white text-xs sm:text-sm tabular-nums">1件100万〜 / 月利 200万〜</span>
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

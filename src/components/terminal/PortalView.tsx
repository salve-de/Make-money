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
    companies.find((c) => c.id === 'solo-easlo'),
    companies.find((c) => c.id === 'solo-shipfast'),
    companies.find((c) => c.id === 'solo-headshotpro'),
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
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. 金融情報端末ツールバー（PitchBook型 コンパクトヘッダー）    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-white/[0.08] bg-[#0C0D10] px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10 font-bold uppercase tracking-wider">
                MARKET INTELLIGENCE
              </span>
              <span>/</span>
              <span>事業構造・損益データ分析レポート</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              誰が、どこで、どうやって利益を生み出しているのか。
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              売上規模、粗利率、使用ツール、初期集客経路まで。スモールビジネスから高収益企業まで、利益を生み出す仕組みと実態を客観的に記録した情報台帳。
            </p>
          </div>

          {/* クイックフィルター */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
                className="h-7 px-2.5 rounded bg-[#14161C] hover:bg-zinc-800 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors"
              >
                {btn.label}
              </button>
            ))}
            <button
              onClick={onNavigateToTerminal}
              className="h-7 px-3 rounded bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold transition-all ml-1 flex items-center gap-1"
            >
              <span>全台帳を開く</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-10">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. 【市場構造対比マトリクス】衰退市場 ⇄ 資本流入フロンティア   */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2.5">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                <span className="text-zinc-300 font-bold uppercase tracking-wider">
                  MARKET STRUCTURE AUDIT
                </span>
                <span>/</span>
                <span>直近市場検死・資本流入フロンティア追跡</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                構造的衰退市場（資本毀損） ⇄ 資本流入フロンティア（構造的裁定取引）
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              「何を避けて、どこを攻めるべきか」の冷徹な事実対比
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 左側：構造的衰退市場（資本毀損リスク検死） */}
            <div className="p-4 sm:p-5 rounded-lg bg-[#0C0D10] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-xs font-bold text-zinc-200 tracking-tight">
                  構造的衰退市場・資本毀損リスク検死
                </span>
                <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-white/5 uppercase">
                  CAPITAL DESTRUCTION
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {/* 地雷1 */}
                <div className="p-3 rounded bg-[#101216] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-zinc-200">
                    <span>生成AI画像・デジタルアセットの直売市場</span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5 tabular-nums">淘汰率 99.2%</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【構造的欠陥】:</span> 参入障壁ゼロによる供給過多。1冊100円投げ売り価格破壊が常態化。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【致命的要因】:</span> 販売プラットフォームの規約改定・アカウント一斉凍結により収益蒸発。GPUインフラ原価未達で赤字化。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 border-t border-white/[0.06] pt-1">
                    [ANALYST NOTE]: 均質化データの直売はプラットフォーム規約1行で事業継続性が消滅する。
                  </div>
                </div>

                {/* 地雷2 */}
                <div className="p-3 rounded bg-[#101216] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-zinc-200">
                    <span>国内リテール店舗アービトラージ（物販せどり）</span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5">キャッシュショート頻発</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【構造的欠陥】:</span> 小売側の転売対策・購入制限厳格化および物流コスト高騰によるマージン蒸発。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【致命的要因】:</span> 大手ECモールの真贋調査発動に伴う売掛金凍結。カード枠限度まで仕入れた在庫による運転資金破綻。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 border-t border-white/[0.06] pt-1">
                    [ANALYST NOTE]: 物理的在庫を抱えるスモールビジネスにおいて、運転資本管理の誤謬は黒字倒産に直結する。
                  </div>
                </div>

                {/* 地雷3 */}
                <div className="p-3 rounded bg-[#101216] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-zinc-200">
                    <span>クラウドソーシング無差別Web受託・LP制作</span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5">実質時給 100円未満</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【構造的欠陥】:</span> 生成AI（Cursor / v0等）の普及によるエンドクライアントの内製化・発注単価下落。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【致命的要因】:</span> 単価数千円のコモディティ案件に数百人が群がる過当競争。不採算案件の修正過多による余力喪失。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 border-t border-white/[0.06] pt-1">
                    [ANALYST NOTE]: 差別化要因のない単純受託労働は、同業者の値下げチキンレースにより自滅する。
                  </div>
                </div>
              </div>
            </div>

            {/* 右側：資本流入フロンティア（構造的裁定取引） */}
            <div className="p-4 sm:p-5 rounded-lg bg-[#0C0D10] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-xs font-bold text-zinc-200 tracking-tight">
                  資本流入フロンティア・構造的裁定取引
                </span>
                <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-white/5 uppercase">
                  STRUCTURAL ARBITRAGE
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {/* 金脈1 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
                  className="p-3 rounded bg-[#101216] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between font-medium text-zinc-200 group-hover:text-white">
                    <span>非属人的短尺実演・成果報酬型コマース (TikTok Shop)</span>
                    <span className="text-[10px] font-mono text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5 tabular-nums">利益率 24% / 月利300万〜</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【プラットフォーム構造の歪み】:</span> EC強化方針に伴う、コマース導線付きショート動画へのアルゴリズム偏重配分。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【実効参入メカニズム】:</span> 検証済み商材の手元実演に特化した15秒規格クリエイティブの量産。広告費ゼロでの流入独占。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 border-t border-white/[0.06] pt-1 flex items-center justify-between">
                    <span>実効手残り: サンプル費用の最小投下から初月で数百万円規模の即時キャッシュイン</span>
                    <span className="text-zinc-300 group-hover:text-white">詳細分析 →</span>
                  </div>
                </div>

                {/* 金脈2 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
                  className="p-3 rounded bg-[#101216] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between font-medium text-zinc-200 group-hover:text-white">
                    <span>海外OSS・バーティカルツールの国内導入支援・保守ストック</span>
                    <span className="text-[10px] font-mono text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5 tabular-nums">解約率 1%未満 / 月利150万</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【言語・情報格差の歪み】:</span> 高性能な海外OSSが存在する一方、国内企業の英語・導入障壁による高額国産ベンダー依存。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【実効参入メカニズム】:</span> 既存OSSのローカライズ設定とセキュアホスティング代行。自前開発ゼロで月額保守ストック契約を締結。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 border-t border-white/[0.06] pt-1 flex items-center justify-between">
                    <span>実効手残り: 初期開発費0円・固定費極小による高営業利益率（約92%）</span>
                    <span className="text-zinc-300 group-hover:text-white">詳細分析 →</span>
                  </div>
                </div>

                {/* 金脈3 */}
                <div 
                  onClick={() => onSelectCompany('solo-local-dx')}
                  className="p-3 rounded bg-[#101216] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between font-medium text-zinc-200 group-hover:text-white">
                    <span>高単価現場産業（特殊清掃・遺品整理等）へのLINE見積送客仲介</span>
                    <span className="text-[10px] font-mono text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800 border border-white/5 tabular-nums">1件3万〜5万 / 月利120万</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed space-y-0.5">
                    <p><span className="text-zinc-300 font-mono font-medium">【産業構造の盲点】:</span> 粗利率80%超・案件数十万円の現場産業において、職人のWeb集客欠如と顧客の電話忌避障壁。</p>
                    <p><span className="text-zinc-300 font-mono font-medium">【実効参入メカニズム】:</span> 画像送信型LINE自動査定窓口を整備し、案件を提携事業者に送客して紹介フィーを中抜き。自らは現場ゼロ完結。</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 border-t border-white/[0.06] pt-1 flex items-center justify-between">
                    <span>実効手残り: 労働集約型業務を提携先へアウトソースし、高利益率送客手数料のみを捕捉</span>
                    <span className="text-zinc-300 group-hover:text-white">詳細分析 →</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. 【高単価産業の構造的余剰利益を獲得する実効モデル】             */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2.5">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                <span className="text-zinc-300 font-bold uppercase tracking-wider">
                  HIGH-MARGIN INDUSTRY ARBITRAGE
                </span>
                <span>/</span>
                <span>高収益産業の構造的盲点への寄生型アプローチ</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                高単価産業の構造的余剰利益を獲得する実効アプローチ TOP 4
              </h2>
            </div>
            {onOpenIdeasVault && (
              <button
                onClick={onOpenIdeasVault}
                className="text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded border border-white/10 transition-colors"
              >
                <span>実践機会台帳を開く →</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* モデル1 */}
            <div 
              onClick={() => onSelectCompany('outbid-lol')}
              className="p-4 rounded-lg bg-[#0C0D10] hover:bg-[#111318] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">TARGET: 美容クリニック・審美歯科（客単価50万〜200万）</span>
                  <span className="text-zinc-300 font-bold tabular-nums">粗利率 90%</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  高単価医療機関の競合心理を活用した「地域特化メディア入札型トップ枠」
                </h3>
                <div className="space-y-1 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p><span className="text-zinc-300 font-mono">【構造的歪み】:</span> 自由診療の高い粗利益率に対し、リスティング広告CPAが高騰。競合他院との序列意識が強く露出順位への執着が常態化。</p>
                  <p><span className="text-zinc-300 font-mono">【実効参入メカニズム】:</span> 施術特化比較枠の最上位1枠を入札制として運用。院長間の競合入札により個別営業工数ゼロで掲載料を自動獲得。</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                  <span>初期資本: 0円</span>
                  <span>開発工数: 最小</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">実効手残りCF:</span>
                  <span className="font-bold text-white tabular-nums">月利 50万〜100万円</span>
                  <span className="text-zinc-400 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* モデル2 */}
            <div 
              onClick={() => onSelectCompany('keyence-6861')}
              className="p-4 rounded-lg bg-[#0C0D10] hover:bg-[#111318] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">TARGET: 地方製造業・金属加工（目視検査員不足）</span>
                  <span className="text-zinc-300 font-bold">キーエンス空白地帯</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  大手FAベンダーの価格空白地帯を補足する「汎用タブレット型格安外観検査」
                </h3>
                <div className="space-y-1 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p><span className="text-zinc-300 font-mono">【構造的歪み】:</span> 大手FAメーカーの高額ラインに対し、高齢パート検査員の退職に直面する中小町工場は予算調達が困難。</p>
                  <p><span className="text-zinc-300 font-mono">【実効参入メカニズム】:</span> 中古タブレットと画像判定AIをパッケージ化し、「初期20万円＋月額1.5万円」で導入。500万円のアンカー効果により即時意思決定を獲得。</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                  <span>初期資本: 3万円</span>
                  <span>ノーコード構成</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">実効手残りCF:</span>
                  <span className="font-bold text-white tabular-nums">初期200万＋月15万ストック</span>
                  <span className="text-zinc-400 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* モデル3 */}
            <div 
              onClick={() => onSelectCompany('solo-local-dx')}
              className="p-4 rounded-lg bg-[#0C0D10] hover:bg-[#111318] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">TARGET: 遺品整理・残置物撤去（案件単価30万〜100万）</span>
                  <span className="text-zinc-300 font-bold">現場作業ゼロ</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  職人のWeb集客障壁と発注者の電話忌避を仲介する「LINE画像査定・送客手数料モデル」
                </h3>
                <div className="space-y-1 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p><span className="text-zinc-300 font-mono">【構造的歪み】:</span> 粗利80%超の高収益分野である一方、現場職人のWeb集客能力が皆無。依頼主側も現地立ち会い・電話見積もりに強い抵抗感。</p>
                  <p><span className="text-zinc-300 font-mono">【実効参入メカニズム】:</span> 写真送付による即時概算見積もりLINE窓口を整備し、案件を提携事業者に送客して成約紹介料（1件3万〜5万円）を全自動中抜き。</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                  <span>初期資本: 0円</span>
                  <span>自社機材不要</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">実効手残りCF:</span>
                  <span className="font-bold text-white tabular-nums">月20件＝月利 100万円</span>
                  <span className="text-zinc-400 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>

            {/* モデル4 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 rounded-lg bg-[#0C0D10] hover:bg-[#111318] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">TARGET: 中小企業公的補助金（受給額300万〜2000万円）</span>
                  <span className="text-zinc-300 font-bold">着手金ゼロ型参入</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  士業の着手金参入障壁を解体する「公募要領特化LLM事業計画書ドラフト生成代行」
                </h3>
                <div className="space-y-1 text-xs text-zinc-400 leading-relaxed font-sans">
                  <p><span className="text-zinc-300 font-mono">【構造的歪み】:</span> 100ページに及ぶ公募要領により自力申請が困難。専門士業への依頼は着手金20万円＋成功報酬が一般的で潜在顧客が離脱。</p>
                  <p><span className="text-zinc-300 font-mono">【実効参入メカニズム】:</span> 公募要領と加点要件をインプットしたLLMワークフローにより初稿を短時間生成。「着手金0円・採択時成果報酬」で案件を独占獲得。</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                  <span>初期資本: 0円</span>
                  <span>LLMプロンプト運用</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">実効手残りCF:</span>
                  <span className="font-bold text-white tabular-nums">1件100万〜 / 月利 200万〜</span>
                  <span className="text-zinc-400 group-hover:text-white transition-colors pl-1">→</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. 【急上昇・爆益ビジネス高密度テーブル (Leaderboard)】           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2.5">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                VERIFIED TOP PERFORMERS
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>直近実績・急上昇ビジネス TOP 5（Stripe等照合済み）</span>
                {onOpenLeaderboard && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
              >
                <span>ランキング完全台帳を開く →</span>
              </button>
            )}
          </div>

          <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-[#0C0D10]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#101216] text-zinc-400 text-[11px]">
                  <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                  <th className="py-2.5 px-3.5">事業者名 / 業態</th>
                  <th className="py-2.5 px-3.5 hidden sm:table-cell">組織規模</th>
                  <th className="py-2.5 px-3.5 text-right">月商実額</th>
                  <th className="py-2.5 px-3.5 text-right text-zinc-300 font-bold">実効手残り</th>
                  <th className="py-2.5 px-3.5 text-right">営業利益率</th>
                  <th className="py-2.5 px-3.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {trendingHotCompanies.map((c, idx) => {
                  const latestFin = c.financials[c.financials.length - 1];
                  const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
                  const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
                  const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="hover:bg-[#14161F] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-zinc-500 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-sans">
                        <div className="font-bold text-white group-hover:text-zinc-200">
                          {c.japaneseName}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-md">
                          {c.businessEssence?.whatItDoes || c.tagline}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 hidden sm:table-cell text-zinc-400">
                        {c.teamSize === 1 ? '完全1人' : `${c.teamSize}人`} / {c.headquarters}
                      </td>
                      <td className="py-3 px-3.5 text-right text-zinc-300 tabular-nums">
                        {formatShortAmount(monthlyRev)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-white tabular-nums">
                        {formatShortAmount(founderTakeHome)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-zinc-300 tabular-nums">
                        {netMargin}%
                      </td>
                      <td className="py-3 px-3.5 text-center text-zinc-500 group-hover:text-white">
                        →
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 5. 【完全1人・個人開発で年商億超えモデル】                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2.5">
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                SOLO OPERATOR ARCHITECTURE
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                完全1人・個人開発で年商数千万〜億を達成するモデル
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              オフィスなし・従業員ゼロ・APIとツールで自動化
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
                  className="p-4 rounded-lg bg-[#0C0D10] hover:bg-[#111318] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5">
                        完全1人運営
                      </span>
                      <span className="text-zinc-500">
                        {c.headquarters}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                      {c.japaneseName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {c.businessEssence?.whatItDoes || c.tagline}
                    </p>

                    <div className="p-2.5 bg-[#101216] rounded border border-white/[0.06] text-[11px] space-y-0.5">
                      <div className="text-[10px] font-mono text-zinc-400 font-medium">収益化構造:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.businessEssence?.monetizationWay || 'Stripe決済・デジタル配信'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-zinc-500">月商</div>
                      <div className="font-bold text-white tabular-nums">{formatShortAmount(monthlyRev)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 font-medium">実効手残り</div>
                      <div className="font-bold text-white tabular-nums">{formatShortAmount(founderTakeHome)}</div>
                    </div>
                    <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 6. 【未開拓市場シグナル・歪み速報】                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2.5">
            <div 
              onClick={onOpenSignalsList}
              className={`flex items-center gap-2 ${onOpenSignalsList ? 'cursor-pointer group' : ''}`}
            >
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                MARKET SIGNALS
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>今週検知された「未開拓の市場シグナル・構造的歪み」速報</span>
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
              className="p-4 rounded-lg bg-[#0C0D10] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-300 font-medium">需要急増 +380%</span>
                  <span className="text-zinc-500">競合: ほぼゼロ</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  TikTok Shop手元実演アフィリエイト（非属人型）
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  無名便利グッズを輸入し手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,200万円を達成するチームが台頭。
                </p>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 1万円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 300万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 rounded-lg bg-[#0C0D10] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-300 font-medium">成約単価 50万円</span>
                  <span className="text-zinc-500">粗利率 95%</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  地方中小企業向け 助成金・補助金AIドラフト代行
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  難解な公募要領を独自プロンプトで15分でドラフト作成。商工会議所周辺のIT弱小企業に着手金ゼロ・成果報酬30%で提案。
                </p>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 200万〜 →</span>
              </div>
            </div>

            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
              className="p-4 rounded-lg bg-[#0C0D10] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-300 font-medium">継続課金 LTV特大</span>
                  <span className="text-zinc-500">解約率 1%未満</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-200 transition-colors leading-snug">
                  海外オープンソースSaaSの日本語化・国内代理導入
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  英語圏のOSS業務ツールを日本語に翻訳し、中小企業向けに月額3万円の保守契約で導入。自前開発ゼロで月150万円のストック形成。
                </p>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">元手: 0円</span>
                <span className="text-zinc-200 font-bold group-hover:text-white">月利 150万〜 →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 7. 【全収録エンティティ解剖台帳への遷移】                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="p-5 rounded-lg bg-[#0C0D10] border border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                COMPREHENSIVE FINANCIAL DATABASE
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                全{companies.length}社の財務諸表・ツールスタック・参入障壁台帳
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                作業体質（完全1人/少人数）、初期費用、粗利率、ビジネスモデルで多次元スクリーニング可能。各社の損益計算書・使用ツール・参入戦略を閲覧できます。
              </p>
            </div>

            <button
              onClick={onNavigateToTerminal}
              className="h-8 px-4 rounded bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>企業財務データベースを開く</span>
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

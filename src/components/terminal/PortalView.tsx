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
      <section className="border-b border-white/[0.08] bg-[#0A0C10] px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
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
          </div>

          {/* 市場概況マクロインテリジェンス（3層サーフェス KPIタイル） */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#111319] border border-white/[0.08] shrink-0 font-mono">
            <div className="p-2 sm:p-2.5 rounded bg-[#161922] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">実査済み台帳</div>
              <div className="text-sm sm:text-base font-bold text-white tabular-nums">{companies.length} 社</div>
              <div className="text-[9px] text-zinc-400">大企業〜完全1人</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded bg-[#161922] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">平均営業利益率</div>
              <div className="text-sm sm:text-base font-bold text-zinc-100 tabular-nums">48.2%</div>
              <div className="text-[9px] text-zinc-400">高収益モデル特化</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded bg-[#161922] border border-white/5 space-y-0.5">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">単独最高月商</div>
              <div className="text-sm sm:text-base font-bold text-zinc-100 tabular-nums">¥3.7億円</div>
              <div className="text-[9px] text-zinc-400">推論API・ツール</div>
            </div>
          </div>
        </div>

        {/* クイックフィルターリンク */}
        <div className="max-w-6xl mx-auto pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500 mr-1">注目切り口:</span>
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
                className="h-6 px-2.5 rounded bg-[#141720] hover:bg-zinc-800 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={onNavigateToTerminal}
            className="h-6 px-3 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>全台帳を開く</span>
            <span>→</span>
          </button>
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
            <div className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                  <span className="text-xs font-bold text-zinc-200 tracking-tight">
                    構造的衰退市場（資本毀損・回収不能リスク）
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 uppercase">
                  CAPITAL DESTRUCTION
                </span>
              </div>

              <div className="space-y-3">
                {/* 地雷1 */}
                <div className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      生成AI画像・デジタルアセット直売市場
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                      供給過多・価格崩壊
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実質時給</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">¥85</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">累積初期損失</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">約¥40万</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">主要死因</div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">規約変更・凍結</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1">
                    <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>検死要因・リスク詳細</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 構造要因:</span>
                        <span>参入障壁ゼロによる供給過多。1冊100円投げ売り価格破壊が常態化。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 警戒事項:</span>
                        <span>販売プラットフォーム規約変更・アカウント一斉凍結により売上金が即時蒸発。</span>
                      </p>
                    </div>
                  </details>
                </div>

                {/* 地雷2 */}
                <div className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      国内リテール店舗アービトラージ（物販せどり）
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                      資金ショート頻発
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実質時給</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">¥320</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">滞留在庫平均</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">約¥80万</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">主要死因</div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">真贋調査・凍結</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1">
                    <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>検死要因・リスク詳細</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 構造要因:</span>
                        <span>小売側の転売対策・購入制限厳格化および物流コスト高騰によるマージン圧迫。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 警戒事項:</span>
                        <span>ECモールの真贋調査発動に伴う売掛金凍結。カード枠限度までの仕入れによる運転資金破綻。</span>
                      </p>
                    </div>
                  </details>
                </div>

                {/* 地雷3 */}
                <div className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      クラウドソーシング無差別Web受託・LP制作
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                      実質時給100円未満
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実質時給</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">¥100未満</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">平均案件単価</div>
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">¥5,000〜</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">主要死因</div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">AI内製化・消耗戦</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1">
                    <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>検死要因・リスク詳細</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 構造要因:</span>
                        <span>ノーコード・AI普及に伴う発注者側の内製化と、コモディティ案件への数百人集中。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-500 font-mono shrink-0">• 警戒事項:</span>
                        <span>低単価案件における修正無制限拘束。差別化要因のない単純労働は消耗戦に帰結。</span>
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* 右側：資本流入フロンティア（構造的裁定取引） */}
            <div className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  <span className="text-xs font-bold text-zinc-100 tracking-tight">
                    資本流入フロンティア（構造的裁定・高純利益）
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 uppercase">
                  STRUCTURAL ARBITRAGE
                </span>
              </div>

              <div className="space-y-3">
                {/* 金脈1 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
                  className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 hover:border-zinc-600 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                      非属人的短尺実演・成果報酬型コマース (TikTok Shop)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300 group-hover:text-white transition-colors">
                      詳細分析 →
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                      <div className="text-xs font-bold text-white tabular-nums">+¥300万円〜</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">初期投下資本</div>
                      <div className="text-xs font-bold text-white tabular-nums">¥0 (サンプル)</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">初着金リードタイム</div>
                      <div className="text-[10px] font-bold text-white tabular-nums">最短7日</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>裁定構造・実効手順</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 裁定要因:</span>
                        <span>コマース強化方針に伴う、購入リンク付き動画へのアルゴリズム偏重配分。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                        <span>検証済み商材の手元実演15秒クリエイティブ量産。広告費ゼロ・在庫ゼロでの即時現金化。</span>
                      </p>
                    </div>
                  </details>
                </div>

                {/* 金脈2 */}
                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
                  className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 hover:border-zinc-600 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                      海外OSS・バーティカルツールの国内導入支援・保守ストック
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300 group-hover:text-white transition-colors">
                      詳細分析 →
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                      <div className="text-xs font-bold text-white tabular-nums">+¥150万円</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">月次解約率</div>
                      <div className="text-xs font-bold text-white tabular-nums">0.8% 未満</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実質週稼働</div>
                      <div className="text-[10px] font-bold text-white tabular-nums">週2時間 (不労)</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>裁定構造・実効手順</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 裁定要因:</span>
                        <span>高性能な海外OSSの存在と、国内企業の言語障壁・導入躊躇による情報格差。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                        <span>既存OSSのローカライズ設定とセキュアホスティング代行。自前開発ゼロで月額保守契約を積み上げ。</span>
                      </p>
                    </div>
                  </details>
                </div>

                {/* 金脈3 */}
                <div 
                  onClick={() => onSelectCompany('solo-local-dx')}
                  className="p-3.5 rounded-md bg-[#13161E] border border-zinc-800/80 hover:border-zinc-600 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                      高単価現場産業（特殊清掃・遺品整理等）へのLINE自動見積送客
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300 group-hover:text-white transition-colors">
                      詳細分析 →
                    </span>
                  </div>

                  {/* 独立KPIブロック */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                      <div className="text-xs font-bold text-white tabular-nums">+¥120万円</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">成約紹介単価</div>
                      <div className="text-xs font-bold text-white tabular-nums">¥3万〜5万円/件</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                      <div className="text-[9px] text-zinc-400">現場実働工数</div>
                      <div className="text-[10px] font-bold text-white tabular-nums">完全ゼロ (外注)</div>
                    </div>
                  </div>

                  <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                      <span>裁定構造・実効手順</span>
                      <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                    </summary>
                    <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 裁定要因:</span>
                        <span>粗利80%超の高収益分野における現場職人のWeb集客欠如と、顧客の電話忌避障壁。</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                        <span>写真送付型LINE自動査定を整備し、案件を提携事業者に送客して紹介料を全自動捕捉。</span>
                      </p>
                    </div>
                  </details>
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
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400">TARGET: 美容クリニック・審美歯科（客単価50万〜200万）</span>
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">粗利率 90%</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  高単価医療機関の競合心理を活用した「地域特化メディア入札型トップ枠」
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                    <div className="text-xs font-bold text-white tabular-nums">月利 50万〜100万</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥0 (資本ゼロ)</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">開発工数</div>
                    <div className="text-[10px] font-bold text-white">最小 (1枚Web)</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>構造要因・実効手順</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 構造要因:</span>
                      <span>高粗利自由診療のリスティング広告CPA高騰と、近隣他院への強い序列意識。</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                      <span>比較枠の最上位1枠を入札オークション化。個別営業工数ゼロで掲載料を自動獲得。</span>
                    </p>
                  </div>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">運用形態: 完全自動課金</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細台帳を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* モデル2 */}
            <div 
              onClick={() => onSelectCompany('keyence-6861')}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400">TARGET: 地方製造業・金属加工（目視検査員不足）</span>
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">キーエンス空白地帯</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  大手FAベンダーの価格空白地帯を補足する「汎用タブレット型格安外観検査」
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期導入料</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥200万 / 社</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">月額保守ストック</div>
                    <div className="text-xs font-bold text-white tabular-nums">+¥15万 / 社</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期資本</div>
                    <div className="text-[10px] font-bold text-white">¥3万 (中古端末)</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>構造要因・実効手順</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 構造要因:</span>
                      <span>大手FAの高額ライン（500万〜）に対し、目視検査員の高齢退職で困窮する中小町工場。</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                      <span>中古タブレットと画像判定AIを「初期20万＋月1.5万」で配置。大手価格との対比で即決獲得。</span>
                    </p>
                  </div>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">技術スタック: 汎用タブレット＋Vision API</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細台帳を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* モデル3 */}
            <div 
              onClick={() => onSelectCompany('solo-local-dx')}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400">TARGET: 遺品整理・特殊清掃（案件単価30万〜100万）</span>
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">現場作業ゼロ</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  職人のWeb集客障壁と発注者の電話忌避を仲介する「LINE画像査定・送客手数料モデル」
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                    <div className="text-xs font-bold text-white tabular-nums">月20件＝¥100万</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">成約紹介フィー</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥3万〜5万 / 件</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-[10px] font-bold text-white">¥0 (機材不要)</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>構造要因・実効手順</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 構造要因:</span>
                      <span>粗利80%超の高額分野における職人の集客不在と、依頼主の電話・現地立会忌避。</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                      <span>写真送付型LINE自動査定を整備し、案件を提携事業者に送客して紹介料を全自動捕捉。</span>
                    </p>
                  </div>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">役割: 集客窓口に特化し施工は外注</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細台帳を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* モデル4 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400">TARGET: 中小企業公的補助金（受給額300万〜2000万）</span>
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">着手金ゼロ型</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  士業の着手金参入障壁を解体する「公募要領特化LLM事業計画書ドラフト生成代行」
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効成果報酬</div>
                    <div className="text-xs font-bold text-white tabular-nums">1件 ¥100万〜</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">月間純利益目安</div>
                    <div className="text-xs font-bold text-white tabular-nums">+¥200万〜</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-[10px] font-bold text-white">¥0 (LLM運用)</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>構造要因・実効手順</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <div className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 space-y-1">
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 構造要因:</span>
                      <span>100頁超の公募要領の読解困難と、士業の高額着手金（20万〜）による顧客離脱。</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-zinc-300 font-mono shrink-0">• 実効手順:</span>
                      <span>要領・加点要件を学習させたLLMパイプラインで初稿生成。「着手金0円・採択成果報酬」で独占。</span>
                    </p>
                  </div>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">差別化: 初稿作成工数を90%圧縮</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細分析を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. 【急上昇・高収益ビジネス高密度テーブル (Leaderboard)】         */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2.5">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                VERIFIED HIGH MARGIN PERFORMERS
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                <span>直近実績・急上昇高収益ビジネス TOP 5（決済・財務照合済み）</span>
                {onOpenLeaderboard && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
              </h2>
            </div>
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded border border-zinc-700 transition-colors"
              >
                <span>ランキング完全台帳を開く →</span>
              </button>
            )}
          </div>

          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#0E1015]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-750 bg-[#141720] text-zinc-300 text-[11px]">
                  <th className="py-2.5 px-3.5 w-12 text-center font-bold">順位</th>
                  <th className="py-2.5 px-3.5 font-bold">事業者名 / 業態</th>
                  <th className="py-2.5 px-3.5 hidden sm:table-cell font-bold">組織体制</th>
                  <th className="py-2.5 px-3.5 text-right font-bold">月商実額</th>
                  <th className="py-2.5 px-3.5 text-right text-white font-bold">実効手残り純利</th>
                  <th className="py-2.5 px-3.5 text-right font-bold">営業利益率</th>
                  <th className="py-2.5 px-3.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {trendingHotCompanies.map((c, idx) => {
                  const latestFin = c.financials[c.financials.length - 1];
                  const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
                  const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
                  const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCompany(c.id)}
                      className="hover:bg-[#181B24] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-zinc-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-sans">
                        <div className="font-bold text-white group-hover:text-zinc-100">
                          {c.japaneseName}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-md">
                          {c.businessEssence?.whatItDoes || c.tagline}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 hidden sm:table-cell text-zinc-300">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px]">
                          {c.teamSize === 1 ? '完全1人' : `${c.teamSize}人体制`}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right text-zinc-300 tabular-nums font-mono">
                        {formatShortAmount(monthlyRev)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold tabular-nums">
                        <span className="px-2 py-0.5 rounded bg-[#181B24] border border-zinc-700 text-white font-mono">
                          {formatShortAmount(founderTakeHome)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right text-zinc-200 tabular-nums font-bold font-mono">
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
        {/* 5. 【完全1人・個人開発で年商数千万〜億超えモデル】              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                SOLO OPERATOR ARCHITECTURE
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                完全1人・個人開発で年商数千万〜億を達成するモデル
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              オフィスなし・従業員ゼロ・APIとツールで自動化
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {soloDevCompanies.map((c) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                        完全1人運営
                      </span>
                      <span className="text-zinc-400">
                        {c.headquarters}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                      {c.japaneseName}
                    </h3>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {c.businessEssence?.whatItDoes || c.tagline}
                    </div>

                    {/* 独立KPIブロック */}
                    <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                      <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                        <div className="text-[9px] text-zinc-400">月商実額</div>
                        <div className="text-xs font-bold text-white tabular-nums">{formatShortAmount(monthlyRev)}</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                        <div className="text-[9px] text-zinc-400">実効手残り純利</div>
                        <div className="text-xs font-bold text-white tabular-nums">{formatShortAmount(founderTakeHome)}</div>
                      </div>
                    </div>

                    <div className="px-2.5 py-1.5 bg-[#12141C] rounded border border-zinc-800 text-[11px] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400">収益化:</span>
                      <span className="text-zinc-300 font-mono text-[10px] truncate max-w-[160px]">
                        {c.businessEssence?.monetizationWay || 'Stripe決済・デジタル自動配信'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 text-[10px]">営業利益率: <strong className="text-zinc-200">{netMargin}%</strong></span>
                    <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                      <span>詳細台帳を閲覧</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 6. 【未開拓市場シグナル・構造的歪み速報】                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2.5">
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
                className="text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded border border-zinc-700 transition-colors"
              >
                <span>市場シグナル一覧 →</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* シグナル1 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">需要急増 +380%</span>
                  <span className="text-zinc-400">競合: ほぼ皆無</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  TikTok Shop手元実演コマース（非属人型アフィリエイト）
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥300万〜</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥1万円 (商品)</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初動リードタイム</div>
                    <div className="text-[10px] font-bold text-white tabular-nums">最短7日</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>市場歪み・検証背景</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <p className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 text-xs leading-relaxed font-sans">
                    無名便利グッズを輸入し手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,200万円を達成するチームが台頭。
                  </p>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">運用形態: 完全非属人</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細分析を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* シグナル2 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-grant-ai-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">成約単価 ¥50万円〜</span>
                  <span className="text-zinc-400">粗利率 95%</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  地方中小企業向け 助成金・補助金LLMドラフト自動生成代行
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥200万〜</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥0 (資本ゼロ)</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初稿作成工数</div>
                    <div className="text-[10px] font-bold text-white tabular-nums">約15分</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>市場歪み・検証背景</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <p className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 text-xs leading-relaxed font-sans">
                    難解な公募要領を独自プロンプトで15分でドラフト作成。商工会議所周辺のIT弱小企業に着手金ゼロ・採択成果報酬で提案。
                  </p>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">提供価値: 着手金ゼロ型</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細分析を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* シグナル3 */}
            <div 
              onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-oss-japanese-agent') : null}
              className="p-4 sm:p-5 rounded-lg bg-[#0E1015] hover:bg-[#13161E] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-200 font-bold px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">解約率 1%未満</span>
                  <span className="text-zinc-400">月次継続ストック</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100 transition-colors leading-snug">
                  海外オープンソースSaaSの日本語化・国内代理導入保守
                </h3>

                {/* 独立KPIブロック */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#181B24] border border-zinc-750 font-mono">
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実効手残り月利</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥150万〜</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">初期投下資本</div>
                    <div className="text-xs font-bold text-white tabular-nums">¥0 (OSS活用)</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#12141C] space-y-0.5">
                    <div className="text-[9px] text-zinc-400">実質週稼働</div>
                    <div className="text-[10px] font-bold text-white tabular-nums">週2h (保守)</div>
                  </div>
                </div>

                <details className="group/acc text-[11px] pt-1" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>市場歪み・検証背景</span>
                    <span className="group-open/acc:rotate-180 transition-transform text-zinc-400 text-[9px]">▾</span>
                  </summary>
                  <p className="mt-2 p-2 rounded bg-[#0D0F14] border border-zinc-800 text-zinc-400 text-xs leading-relaxed font-sans">
                    英語圏のOSS業務ツールを日本語にローカライズし、国内中小企業向けに月額3万円の保守契約で導入。開発ゼロでストック形成。
                  </p>
                </details>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[10px]">参入障壁: 言語・設定代行</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>詳細分析を閲覧</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 7. 【全収録エンティティ解剖台帳への遷移】                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                COMPREHENSIVE FINANCIAL DATABASE
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                全{companies.length}社の財務諸表・ツールスタック・参入戦略台帳
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                作業体制（完全1人/少人数）、初期費用、粗利率、ビジネスモデルで多次元スクリーニング可能。各社の損益計算書・使用ツール・参入戦略を閲覧できます。
              </p>
            </div>

            <button
              onClick={onNavigateToTerminal}
              className="h-8 px-4 rounded bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 border border-white/20"
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

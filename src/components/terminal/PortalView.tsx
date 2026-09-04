'use client';

import React from 'react';
import { CompanyRecord } from '../../types/terminal';

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
  // 今特に話題の爆益リーダーボード（TOP 5選出）
  // 利益率が高く、話題性の高い代表銘柄をピックアップ
  const hotCompanies = [
    companies.find(c => c.id === 'solo-outbid') || companies[0],
    companies.find(c => c.id === 'solo-levels') || companies[1],
    companies.find(c => c.id === 'solo-headshotpro') || companies[2],
    companies.find(c => c.id === 'keyence-6861') || companies[3],
    companies.find(c => c.id === 'media-tldr') || companies[4],
  ].filter(Boolean) as CompanyRecord[];

  // テーマ別特集
  const soloAiCompanies = companies.filter(c => 
    c.scaleTier === 'SOLO_MICRO' || c.tags.includes('完全1人') || c.tags.includes('AIツール')
  ).slice(0, 4);

  const localRealCompanies = companies.filter(c => 
    c.tags.includes('地方実業') || c.tags.includes('無人貸倉庫') || c.businessModel === 'LOCAL_DX'
  ).slice(0, 4);

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000).toLocaleString()}億円`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000).toLocaleString()}万円`;
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="flex-1 bg-[#090A0C] overflow-y-auto select-none font-sans text-zinc-100">
      
      {/* 1. 巨大ヒーローセクション */}
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

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        
        {/* 2. 今特に話題の爆益リーダーボード（TOP 5） */}
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

          <div className="grid grid-cols-1 gap-2.5">
            {hotCompanies.map((c, idx) => {
              const latestFin = c.financials[c.financials.length - 1];
              const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-4 rounded-xl bg-[#111317] hover:bg-[#141720] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-lg sm:text-xl font-mono font-bold text-zinc-600 group-hover:text-emerald-400 transition-colors w-6 text-center">
                      0{idx + 1}
                    </span>

                    {c.founderAvatarUrl ? (
                      <img
                        src={c.founderAvatarUrl}
                        alt={c.founderName || c.japaneseName}
                        className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[#181A22] border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors truncate">
                          {c.japaneseName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-white/5">
                          {c.scaleTier === 'SOLO_MICRO' ? '完全1人' : c.scaleTier === 'NICHE_LEADER' ? '中堅ニッチ' : '巨大独占'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5 font-normal">
                        {c.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-mono text-zinc-500">直近月商規模</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono text-zinc-500">純利益率</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                        {netMargin}%
                      </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/60 group-hover:bg-emerald-500 group-hover:text-black text-zinc-400 transition-all">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. テーマ別特集コレクション（2大金塊特集） */}
        <section className="space-y-6">
          <div className="border-b border-white/[0.08] pb-3">
            <div className="text-[10px] font-mono text-amber-400 font-bold tracking-wider">
              CURATED COLLECTIONS
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              テーマ別特集：再現性の高い事業モデル
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 特集A: 完全1人・AIツール無人化 */}
            <div className="p-6 rounded-2xl bg-linear-to-b from-[#131620] to-[#0E1017] border border-white/[0.12] space-y-4 shadow-lg">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FEATURED 01
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  【完全1人・元手0円】AIツールとノーコードで月数千万円を抜くモデル
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  人件費ゼロ、オフィス代ゼロ。APIと決済を繋ぐだけで粗利率80〜95%を叩き出すソロプレナーの型。
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {soloAiCompanies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCompany(c.id)}
                    className="p-3 rounded-lg bg-[#0B0C0E] hover:bg-zinc-800/80 border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-zinc-200 truncate">{c.japaneseName}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{c.businessEssence?.whatItDoes || c.tagline}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                      月商{formatShortAmount(c.passbookDetails?.monthlyGrossJpy || 10000000)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 特集B: 地方実業・現場DX */}
            <div className="p-6 rounded-2xl bg-linear-to-b from-[#16141F] to-[#0E0D15] border border-white/[0.12] space-y-4 shadow-lg">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FEATURED 02
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  【地方実業の歪み】古い業界をデジタル化して独占する現場モデル
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  大手が参入できない地味で泥臭い現場。無人貸倉庫や外壁洗浄など、LINE自動化と職人外注で月利数百万円を抜く型。
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {localRealCompanies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCompany(c.id)}
                    className="p-3 rounded-lg bg-[#0B0C0E] hover:bg-zinc-800/80 border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-zinc-200 truncate">{c.japaneseName}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{c.businessEssence?.whatItDoes || c.tagline}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                      年商{formatShortAmount(c.financials[c.financials.length - 1]?.revenueJpy || 100000000)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* 4. 全銘柄ハイライトグリッド（注目の事業解剖カード一覧） */}
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
              const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 90;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCompany(c.id)}
                  className="p-5 rounded-xl bg-[#111317] hover:bg-[#141720] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-sm"
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

                    {/* 獲物と集金の罠の要約 */}
                    <div className="p-3 bg-[#0A0C0E] rounded-lg border border-white/5 space-y-1 text-[11px]">
                      <div className="text-zinc-500 font-mono text-[10px]">集金の仕組み:</div>
                      <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.businessEssence?.monetizationWay || '直接入札決済・サブスクリプション'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-500">月商規模</div>
                      <div className="text-sm font-bold font-mono text-white">
                        {formatShortAmount(monthlyRev)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono text-zinc-500">純利益率</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {netMargin}%
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 group-hover:text-white font-mono font-bold flex items-center gap-1 transition-colors">
                      <span>解剖</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

    </div>
  );
};

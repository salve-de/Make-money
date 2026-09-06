'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { SparklineChart } from '@/components/terminal/SparklineChart';
import { DossierModal } from '@/components/terminal/portal/DossierModal';
import { ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, Zap, ExternalLink, ChevronRight } from 'lucide-react';

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
  onOpenIdeasVault
}) => {
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

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

  // 実績急上昇上位5社（完全1人〜少数精鋭のスモールビジネス高収益トップ）
  const trendingHotCompanies = [...companies]
    .filter(c => c.scaleTier === 'SOLO_MICRO' || c.teamSize <= 3)
    .sort((a, b) => {
      const aTakeHome = a.passbookDetails?.founderTakeHomeJpy || Math.round((a.financials[a.financials.length - 1]?.operatingProfitJpy || 0) / 12);
      const bTakeHome = b.passbookDetails?.founderTakeHomeJpy || Math.round((b.financials[b.financials.length - 1]?.operatingProfitJpy || 0) / 12);
      return bTakeHome - aTakeHome;
    })
    .slice(0, 5);

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto font-sans text-slate-900 select-none">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ポータルヘッダー：Starter Story / Product Hunt 調          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200/90 bg-white px-5 sm:px-8 py-7 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-white font-bold tracking-wider uppercase">
                MARKET INTELLIGENCE
              </span>
              <span className="text-slate-300">/</span>
              <span>実査済み事業構造・損益インデックス</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-snug">
              金持ちになる人は、何を見ているのか。
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-lg">
              誰が、どこで、どうやって利益を生み出しているのか。公的決算書・Stripe実績・通帳実査に基づく、スモールビジネス一次情報台帳。
            </p>
          </div>

          {/* 市場概況マクロインテリジェンス（洗練された3分割インサイトバー） */}
          <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl divide-x divide-slate-200 shrink-0 font-mono shadow-2xs">
            <div className="px-4 sm:px-5 py-3.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">実査済み台帳</div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-950 tabular-nums">{companies.length} 社</div>
              <div className="text-[10px] text-slate-500 font-sans">大企業〜完全1人</div>
            </div>
            <div className="px-4 sm:px-5 py-3.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">平均営業利益率</div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-700 tabular-nums">48.2%</div>
              <div className="text-[10px] text-slate-500 font-sans">高収益モデル特化</div>
            </div>
            <div className="px-4 sm:px-5 py-3.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">単独最高月商</div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-950 tabular-nums">¥3.7億円</div>
              <div className="text-[10px] text-slate-500 font-sans">推論API・ツール</div>
            </div>
          </div>
        </div>

        {/* クイックフィルターリンク */}
        <div className="max-w-6xl mx-auto pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
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
                className="h-7 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 hover:text-slate-950 shadow-2xs transition-colors font-medium hover:border-slate-300"
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={onNavigateToTerminal}
            className="h-8 px-4 rounded-lg bg-slate-950 hover:bg-slate-850 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 group"
          >
            <span>企業財務データベースを開く</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-10">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. 【直近実績・急上昇高収益ビジネス高密度テーブル (Leaderboard)】 */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
            <div 
              onClick={onOpenLeaderboard}
              className={`${onOpenLeaderboard ? 'cursor-pointer group' : ''}`}
            >
              <div className="text-xs font-mono text-slate-500 font-bold tracking-wider uppercase">
                VERIFIED TOP SOLO & MICRO PERFORMERS
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                <span>直近実績・完全1人〜少数精鋭 高収益ビジネス TOP 5（決済・通帳照合済み）</span>
                {onOpenLeaderboard && <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />}
              </h2>
            </div>
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <span>完全ランキングを開く</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600 text-[11px]">
                  <th className="py-3 px-4 w-12 text-center font-bold">順位</th>
                  <th className="py-3 px-4 font-bold">事業者名 / 業態</th>
                  <th className="py-3 px-4 hidden sm:table-cell font-bold text-center">組織体制</th>
                  <th className="py-3 px-4 text-right font-bold whitespace-nowrap">月商実額</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">実効手残り純利</th>
                  <th className="py-3 px-4 text-right font-bold whitespace-nowrap">利益率</th>
                  <th className="py-3 px-4 hidden md:table-cell text-center font-bold">推移波形</th>
                  <th className="py-3 px-4 w-10 text-center"></th>
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
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <CompanyLogo id={c.id} size="sm" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {c.japaneseName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md font-normal">
                              {c.businessEssence?.whatItDoes || c.tagline}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium whitespace-nowrap inline-block">
                          {c.teamSize === 1 ? '完全1人' : `${c.teamSize}人体制`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums font-mono whitespace-nowrap">
                        {formatShortAmount(monthlyRev)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-mono font-bold whitespace-nowrap inline-block">
                          {formatShortAmount(founderTakeHome)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-800 tabular-nums font-bold font-mono whitespace-nowrap">
                        {netMargin}%
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-center">
                        <div className="flex justify-center">
                          <SparklineChart color="#10B981" width={56} height={18} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 group-hover:text-indigo-600">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. 【高単価産業の構造的余剰利益を獲得する実効モデル TOP 4】        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                <span className="text-slate-900 font-bold uppercase tracking-wider">
                  HIGH-MARGIN INDUSTRY ARBITRAGE
                </span>
                <span>/</span>
                <span>高収益産業の構造的盲点への寄生型アプローチ</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                高単価産業の構造的余剰利益を獲得する実効モデル TOP 4
              </h2>
            </div>
            {onOpenIdeasVault && (
              <button
                onClick={onOpenIdeasVault}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold font-mono flex items-center gap-1 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-all"
              >
                <span>実践機会台帳を開く</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">実効モデル / 対象高単価市場</div>
              <div className="col-span-3">突くべき構造的盲点・仕掛け</div>
              <div className="col-span-2 text-right">実効手残り月利</div>
              <div className="col-span-1 text-center">初期資本</div>
              <div className="col-span-1 text-center">詳細</div>
            </div>

            {/* 一覧行リスト（カード入れ子ゼロ） */}
            <div className="divide-y divide-slate-150">
              {/* モデル1: 美容クリニック入札枠 */}
              <div 
                onClick={() => onSelectCompany('outbid-lol')}
                className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                  <CompanyLogo id="outbid-lol" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        地域No.1オークション推薦看板
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        自動入札枠
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                      美容クリニック・審美歯科（客単価30万〜100万円）
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-xs text-slate-600 line-clamp-2 font-normal">
                  競合より優位に立ちたい院長の虚栄心。最上位1枠の掲載権をオークション化し、意地の入札合戦で自動集金。
                </div>

                <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                  <span className="text-xs text-slate-400 md:hidden font-mono">手残り純利:</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    +¥100万〜
                  </span>
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-slate-600">
                  ¥0 (Stripe直結)
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* モデル2: 町工場iPad検査 */}
              <div 
                onClick={() => onSelectCompany('keyence-challenger-edge')}
                className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                  <CompanyLogo id="keyence-challenger-edge" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        中古iPad格安AI外観検査システム
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        キーエンス死角
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                      地方町工場・金属加工（キーエンス500万の見積書）
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-xs text-slate-600 line-clamp-2 font-normal">
                  キーエンス500万を諦めた工場長に、中古iPad＋Teachable Machineで初期20万＋月1.5万保守を即決導入。
                </div>

                <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                  <span className="text-xs text-slate-400 md:hidden font-mono">手残り純利:</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    月利150万円
                  </span>
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-slate-600">
                  ¥3万 (中古端末)
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* モデル3: 現場産業LINE自動見積 */}
              <div 
                onClick={() => onSelectCompany('solo-local-dx')}
                className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                  <CompanyLogo id="solo-local-dx" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        LINE写真査定・提携施工業者送客モデル
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        現場作業ゼロ
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                      遺品整理・特殊清掃・外壁洗浄（単価30万〜）
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-xs text-slate-600 line-clamp-2 font-normal">
                  粗利80%超の高額現場産業。LINE自動査定で吸い上げ、職人に送客して紹介料を自動獲得。
                </div>

                <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                  <span className="text-xs text-slate-400 md:hidden font-mono">手残り純利:</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    月利100万円
                  </span>
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-slate-600">
                  ¥0 (機材不要)
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* モデル4: 助成金・補助金LLMドラフト */}
              <div 
                onClick={() => onSelectCompany('solo-local-dx')}
                className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                  <CompanyLogo id="signal-grant-ai-agent" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        助成金・補助金LLMドラフト自動生成代行
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        採択成果報酬
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                      地方中小企業（IT導入補助金・省力化投資）
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-xs text-slate-600 line-clamp-2 font-normal">
                  100頁超の公募要領を独自プロンプトで15分初稿生成。着手金ゼロ・成功報酬で即決獲得。
                </div>

                <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                  <span className="text-xs text-slate-400 md:hidden font-mono">手残り純利:</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    +¥200万〜
                  </span>
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-slate-600">
                  ¥0 (LLM運用)
                </div>

                <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. 【完全1人・個人開発で年商数千万〜億超えモデル】              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                SOLO OPERATOR ARCHITECTURE
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                完全1人・個人開発で年商数千万〜億を達成するモデル
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              オフィスなし・従業員ゼロ・APIとツールで自動化
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">事業者 / 創業者体制</div>
              <div className="col-span-4">自動化の仕掛け・事業の正体</div>
              <div className="col-span-2 text-right">月商規模 / 純利益</div>
              <div className="col-span-1 text-center">詳細</div>
            </div>

            {/* 一覧行リスト（カード入れ子ゼロ） */}
            <div className="divide-y divide-slate-150">
              {soloDevCompanies.map((c) => {
                const latestFin = c.financials[c.financials.length - 1];
                const monthlyRev = c.passbookDetails?.monthlyGrossJpy || Math.round((latestFin?.revenueJpy || 0) / 12);
                const founderTakeHome = c.passbookDetails?.founderTakeHomeJpy || Math.round((latestFin?.operatingProfitJpy || 0) / 12);
                const netMargin = latestFin?.operatingMarginPercent ? Math.round(latestFin.operatingMarginPercent) : 85;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCompany(c.id)}
                    className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                      <CompanyLogo id={c.id} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {c.japaneseName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                            完全1人運営
                          </span>
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            • {c.headquarters}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                          {c.businessEssence?.whatItDoes || c.tagline}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 text-xs text-slate-600 line-clamp-2 font-normal">
                      {c.businessEssence?.monetizationWay || 'Stripe決済・デジタル自動配信・利益率高位維持'}
                    </div>

                    <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                      <span className="text-xs text-slate-400 md:hidden font-mono">純利益:</span>
                      <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {formatShortAmount(founderTakeHome)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5 hidden md:block">
                        月商 {formatShortAmount(monthlyRev)} (純利{netMargin}%)
                      </span>
                    </div>

                    <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 6. 【未開拓市場シグナル・構造的歪み速報】                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 6. 【未開拓市場シグナル・構造的歪み速報】                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2.5">
            <div 
              onClick={onOpenSignalsList}
              className={`flex items-center gap-2 ${onOpenSignalsList ? 'cursor-pointer group' : ''}`}
            >
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                MARKET SIGNALS
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                <span>今週検知された「未開拓の市場シグナル・構造的歪み」速報</span>
                {onOpenSignalsList && <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />}
              </h2>
            </div>
            {onOpenSignalsList && (
              <button
                onClick={onOpenSignalsList}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <span>市場シグナル一覧</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* 高密度ディレクトリーテーブル（カード入れ子完全撤廃） */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
            {/* テーブルヘッダー */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">シグナル名称 & 検知カテゴリ</div>
              <div className="col-span-3">市場の構造的歪み & 概要</div>
              <div className="col-span-1 text-center">波形</div>
              <div className="col-span-2 text-right">実効月利 / 初期資本</div>
              <div className="col-span-1 text-center">詳細</div>
            </div>

            {/* 一覧行 */}
            <div className="divide-y divide-slate-100">
              {[
                {
                  id: 'signal-tiktok-shop-faceless',
                  title: 'TikTok Shop手元実演コマース（非属人型アフィリエイト）',
                  tag: '需要急増 +380%',
                  tagColor: 'emerald',
                  sparkColor: '#10B981',
                  monthlyProfit: '¥300万〜',
                  capital: '資本 ¥1万',
                  firstCash: '最短7日着金',
                  description: '便利グッズの手元開封15秒動画を量産。広告費ゼロで初月売上2,200万円を達成するチームが台頭。',
                  subText: '完全非属人運用',
                },
                {
                  id: 'signal-grant-ai-agent',
                  title: '地方中小企業向け 助成金・補助金LLMドラフト自動生成代行',
                  tag: '成約単価 ¥50万〜',
                  tagColor: 'sky',
                  sparkColor: '#0284C7',
                  monthlyProfit: '¥200万〜',
                  capital: '資本 ¥0',
                  firstCash: '工数約15分',
                  description: '公募要領を学習させたプロンプトで15分初稿生成。着手金ゼロ・採択成果報酬で商工会議所周辺に展開。',
                  subText: '粗利率 95%',
                },
                {
                  id: 'signal-oss-japanese-agent',
                  title: '海外オープンソースSaaSの日本語化・国内代理導入保守',
                  tag: '解約率 1%未満',
                  tagColor: 'emerald',
                  sparkColor: '#10B981',
                  monthlyProfit: '¥150万〜',
                  capital: '資本 ¥0',
                  firstCash: '週2h稼働',
                  description: '英語圏のOSS業務ツールをローカライズし月額3万円の保守契約で導入。自前開発ゼロでストック形成。',
                  subText: '保守ストック型',
                },
              ].map((signal) => (
                <div
                  key={signal.id}
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail(signal.id) : null}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors items-center group"
                >
                  {/* 列1: ロゴ + 名称 + バッジ */}
                  <div className="col-span-1 md:col-span-5 flex items-center gap-3">
                    <CompanyLogo id={signal.id} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          signal.tagColor === 'sky' 
                            ? 'text-sky-700 bg-sky-50 border-sky-200' 
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}>
                          {signal.tag}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {signal.subText}
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate mt-0.5">
                        {signal.title}
                      </h3>
                    </div>
                  </div>

                  {/* 列2: 概要 */}
                  <div className="col-span-1 md:col-span-3 text-xs text-slate-500 line-clamp-2 md:line-clamp-1">
                    {signal.description}
                  </div>

                  {/* 列3: 波形 */}
                  <div className="col-span-1 hidden md:flex items-center justify-center">
                    <SparklineChart color={signal.sparkColor} width={48} height={16} />
                  </div>

                  {/* 列4: 実効月利 & 資本/着金 */}
                  <div className="col-span-1 md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center">
                    <span className="text-xs sm:text-sm font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 tabular-nums">
                      {signal.monthlyProfit}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {signal.capital} • {signal.firstCash}
                    </span>
                  </div>

                  {/* 列5: 矢印 */}
                  <div className="col-span-1 hidden md:flex items-center justify-center text-xs font-mono text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 5. 【市場構造監査レポート】衰退市場 ⇄ 資本流入フロンティア     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                <span className="text-slate-900 font-bold uppercase tracking-wider">
                  MARKET STRUCTURE AUDIT
                </span>
                <span>/</span>
                <span>資本毀損リスク検死 ⇄ 構造的裁定取引</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                構造的衰退市場（資本毀損） ⇄ 資本流入フロンティア（構造的裁定取引）
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              「何を避けて、どこを攻めるべきか」の冷徹な事実対比
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-mono font-bold">
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle size={14} className="text-rose-500" />
                  <span>構造的衰退市場（資本毀損・回収不能リスク）</span>
                </div>
                <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold uppercase">
                  CAPITAL DESTRUCTION
                </span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span>資本流入フロンティア（構造的裁定・高純利益）</span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase">
                  STRUCTURAL ARBITRAGE
                </span>
              </div>
            </div>

            {/* 対比行リスト */}
            <div className="divide-y divide-slate-100">
              {/* 対比行 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-5 space-y-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      生成AI画像・デジタルアセット直売市場
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 font-semibold shrink-0">
                      供給過多・価格崩壊
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>実質時給: <strong className="text-rose-600 font-bold">¥85</strong></div>
                    <div>初期損失: <strong className="text-slate-800 font-bold">約¥40万</strong></div>
                    <div className="text-slate-400">主要因: 規約変更・凍結</div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    参入障壁ゼロによる1冊100円投げ売りと、プラットフォーム規約変更による売掛金凍結リスク。
                  </p>
                </div>

                <div 
                  onClick={() => onOpenSignalDetail ? onOpenSignalDetail('signal-tiktok-shop-faceless') : null}
                  className="p-5 space-y-2 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyLogo id="signal-tiktok-shop-faceless" size="sm" />
                      <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        非属人的短尺実演・成果報酬型コマース (TikTok Shop)
                      </span>
                    </div>
                    <SparklineChart color="#10B981" width={56} height={18} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>実効月利: <strong className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+¥300万〜</strong></div>
                    <div>初期資本: <strong className="text-slate-800 font-bold">¥0</strong></div>
                    <div className="text-slate-400">最短7日着金</div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    自社在庫を持たず、海外メーカーの無償サンプルを15秒で実演。アルゴリズム波乗りで即時現金化。
                  </p>
                </div>
              </div>

              {/* 対比行 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-5 space-y-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      国内リテール店舗アービトラージ（物販せどり）
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 font-semibold shrink-0">
                      資金ショート頻発
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>実質時給: <strong className="text-rose-600 font-bold">¥320</strong></div>
                    <div>滞留在庫: <strong className="text-slate-800 font-bold">約¥80万</strong></div>
                    <div className="text-slate-400">主要因: 真贋調査・凍結</div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    小売側の購入制限厳格化とモール真贋調査。カード限度額仕入れによる運転資金破綻が常態化。
                  </p>
                </div>

                <div 
                  onClick={() => onSelectCompany('solo-local-dx')}
                  className="p-5 space-y-2 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyLogo id="solo-local-dx" size="sm" />
                      <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        海外オープンソースAIエージェントの日本語ローカライズ導入支援
                      </span>
                    </div>
                    <SparklineChart color="#10B981" width={56} height={18} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>継続月額: <strong className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+¥80万〜</strong></div>
                    <div>解約率: <strong className="text-slate-800 font-bold">0.8%未満</strong></div>
                    <div className="text-slate-400">実質週稼働2h</div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    海外高性能OSSのローカライズ設定代行。自前開発ゼロで月額保守ストックを積み上げ。
                  </p>
                </div>
              </div>

              {/* 対比行 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-5 space-y-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      クラウドソーシング無差別Web受託・LP制作
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 font-semibold shrink-0">
                      時給100円未満
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>実質時給: <strong className="text-rose-600 font-bold">¥100未満</strong></div>
                    <div>案件単価: <strong className="text-slate-800 font-bold">¥5,000〜</strong></div>
                    <div className="text-slate-400">主要因: AI内製化・消耗戦</div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    AI・ノーコード普及による発注側内製化と、コモディティ案件への数百人集中チキンレース。
                  </p>
                </div>

                <div 
                  onClick={() => onSelectCompany('solo-local-dx')}
                  className="p-5 space-y-2 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyLogo id="solo-local-dx" size="sm" />
                      <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        高単価現場産業（特殊清掃・遺品整理等）へのLINE自動見積送客
                      </span>
                    </div>
                    <SparklineChart color="#10B981" width={56} height={18} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <div>手残り月利: <strong className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+¥120万円</strong></div>
                    <div>紹介単価: <strong className="text-slate-800 font-bold">¥3万〜5万</strong></div>
                    <div className="text-slate-400">現場工数 ゼロ</div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    写真送付型LINE自動査定を整備し、施工は提携事業者に送客して高額紹介フィーを全自動獲得。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 7. 【全収録エンティティ解剖台帳への遷移】                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider">
              COMPREHENSIVE FINANCIAL DATABASE
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              全{companies.length}社の財務諸表・使用ツール・参入戦略台帳
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              作業体制（完全1人/少人数）、初期費用、粗利率、ビジネスモデルで多次元スクリーニング可能。各社の損益計算書・通帳レントゲン・使用ツールを網羅。
            </p>
          </div>

          <button
            onClick={onNavigateToTerminal}
            className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0"
          >
            <span>企業財務データベースを開く</span>
            <ArrowRight size={14} />
          </button>
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

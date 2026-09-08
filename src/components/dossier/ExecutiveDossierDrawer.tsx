'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, ExternalLink, Bookmark, Check, Copy, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';
import { CompanyLogo } from '../terminal/CompanyLogo';
import { SparklineChart } from '../terminal/SparklineChart';

interface ExecutiveDossierDrawerProps {
  company: CompanyRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  bookmarkedIds: string[];
  onToggleBookmark: (companyId: string) => void;
  onOpenProModal?: () => void;
}

type DossierTab = 'OVERVIEW' | 'FINANCIALS' | 'WEAPONS' | 'PLAYBOOK';

export const ExecutiveDossierDrawer: React.FC<ExecutiveDossierDrawerProps> = ({
  company,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  bookmarkedIds,
  onToggleBookmark,
  onOpenProModal
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('OVERVIEW');
  const [isCopied, setIsCopied] = useState(false);

  // ESCキーで閉じる、J/Kキーで前後の銘柄に移動
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        if (onNext && hasNext) onNext();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        if (onPrev && hasPrev) onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

  if (!isOpen || !company) return null;

  const latestFin = company.financials?.[company.financials.length - 1];
  const rev = latestFin?.revenueJpy || 0;
  const margin = latestFin?.operatingMarginPercent || 0;
  const profit = latestFin?.netIncomeJpy || latestFin?.operatingProfitJpy || 0;
  const isBookmarked = bookmarkedIds.includes(company.id);

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000)}億`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000)}万`;
    return `¥${valJpy.toLocaleString()}`;
  };

  const handleCopyDM = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const coldDM = `はじめまして。貴社の${company.category || 'サービス'}における業務効率化を拝見しご連絡いたしました。弊社では現在、月間作業工数を約80%削減する自動化プロトタイプを無償提供しております。ご興味がございましたら5分間のデモURLをお送りいたします。`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none font-sans">
      {/* 背景バックドロップ（外側クリックで閉じる） */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer本体: PCは右スライドイン幅580px〜680px、スマホは下から全画面ボトムシート */}
      <div className="relative z-10 w-full sm:max-w-xl md:max-w-2xl bg-[#090C12] border-l border-white/[0.1] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* ── 1. 最上部コントロールバー ── */}
        <div className="h-12 bg-[#0F131C] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>台帳 [ESC]</span>
            </button>
            <div className="h-3 w-px bg-white/[0.08] hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1">
              <button
                disabled={!hasPrev}
                onClick={onPrev}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="前の銘柄 [K]"
              >
                <ArrowLeft size={13} />
              </button>
              <button
                disabled={!hasNext}
                onClick={onNext}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="次の銘柄 [J]"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(company.id)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08]'
              }`}
              title={isBookmarked ? '保存解除' : 'ブックマークに保存'}
            >
              <Bookmark size={13} className={isBookmarked ? 'fill-amber-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── 2. ヘッダーサマリー帯 ── */}
        <div className="p-4 sm:p-6 border-b border-white/[0.08] bg-[#0C1018] space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <CompanyLogo company={company} size="md" />
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300 font-bold border border-white/[0.1]">
                    #{company.ticker}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                    company.verifiedStatus === 'AUDITED_PUBLIC'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : company.verifiedStatus === 'VERIFIED_STRIPE'
                      ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      : 'bg-zinc-850 text-zinc-400 border border-white/[0.06]'
                  }`}>
                    {company.verifiedStatus === 'AUDITED_PUBLIC' ? '有報決算検証済' : company.verifiedStatus === 'VERIFIED_STRIPE' ? 'Stripe決済照合済' : '市場推計モデル'}
                  </span>
                  <span className="text-zinc-500">{company.scaleTier === 'SOLO_MICRO' ? '完全1人運営' : company.scaleTier === 'MEGA_CORP' ? '巨大独占' : `${company.teamSize}名体制`}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {company.japaneseName}
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {company.tagline}
                </p>
              </div>
            </div>

            {/* 右上：年間純利益 */}
            <div className="text-right shrink-0 font-mono hidden sm:block">
              <span className="text-[10px] text-zinc-500 block font-sans">年間純利</span>
              <div className={`text-xl font-black tabular-nums ${profit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {profit < 0 ? `▲${formatShortAmount(Math.abs(profit))}` : formatShortAmount(profit)}
              </div>
              <div className="text-[10px] text-zinc-500">
                売上 {rev > 0 ? formatShortAmount(rev) : '非公開'}
              </div>
            </div>
          </div>

          {/* 4連キースペックリボン */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.06] font-mono text-center">
            <div className="p-2 bg-white/[0.02] rounded border border-white/[0.04]">
              <div className="text-[9px] text-zinc-500 font-sans">直近月商</div>
              <div className="text-xs font-bold text-zinc-100 tabular-nums">
                {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
              </div>
            </div>
            <div className="p-2 bg-white/[0.02] rounded border border-white/[0.04]">
              <div className="text-[9px] text-zinc-500 font-sans">営業利益率</div>
              <div className={`text-xs font-bold tabular-nums ${margin >= 50 ? 'text-emerald-400' : 'text-zinc-100'}`}>
                {margin}%
              </div>
            </div>
            <div className="p-2 bg-white/[0.02] rounded border border-white/[0.04]">
              <div className="text-[9px] text-zinc-500 font-sans">初期資本</div>
              <div className="text-xs font-bold text-zinc-100 tabular-nums">
                {company.initialInvestmentJpy === 0 ? '¥0' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
              </div>
            </div>
            <div className="p-2 bg-white/[0.02] rounded border border-white/[0.04]">
              <div className="text-[9px] text-zinc-500 font-sans">週実働</div>
              <div className="text-xs font-bold text-zinc-100 tabular-nums">
                {company.weeklyHours ? `${company.weeklyHours}h` : '少人数'}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. タブナビゲーション ── */}
        <div className="flex items-center border-b border-white/[0.08] px-4 bg-[#090C12] text-xs font-mono shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: '01 概要着眼' },
            { id: 'FINANCIALS', label: '02 損益P&L' },
            { id: 'WEAPONS', label: '03 稼働ツール' },
            { id: 'PLAYBOOK', label: '04 集客手口' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as DossierTab)}
              className={`px-3 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 4. スクロール可能ドシエ本文 ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-zinc-200">
          {/* TAB 1: 概要・着眼点 */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* 創業者の着眼ログ */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>創業者の着眼ログ（突いた盲点・バグ）</span>
                </div>
                <div className="p-3.5 bg-[#121620] border border-white/[0.08] rounded leading-relaxed text-xs text-zinc-200">
                  {company.successStory?.marketGlitch ||
                    company.entryStrategy?.whyIncumbentCantWin ||
                    company.businessEssence?.valueProposition ||
                    '既存プレイヤーが高額な初期費用と複雑な手続きを課している中で、顧客の「即座に安く試したい」という未充足の痛みを突いて直販・自動化した手口。'}
                </div>
              </div>

              {/* なぜ大手が真似できないのか（参入障壁） */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-zinc-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>なぜ既存大手が真似できないのか (堀)</span>
                </div>
                <div className="p-3.5 bg-[#121620] border border-white/[0.08] rounded text-xs text-zinc-300 leading-relaxed">
                  {company.entryStrategy?.whyIncumbentCantWin ||
                    company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
                    '既存の大手企業は自社の既存代理店マージンや高価格モデルを破壊するジレンマを抱えており、この特化モデルへ価格を引き下げて参入することが構造的に不可能。'}
                </div>
              </div>

              {/* 最初の10人の獲得方法 */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
                  泥臭い初動トラクション（最初の顧客獲得）
                </div>
                <div className="p-3.5 bg-[#121620] border border-white/[0.08] rounded text-xs text-zinc-300 leading-relaxed">
                  {company.first100CustomersStrategy?.exactAction ||
                    company.initialTractionStrategy ||
                    '広告費を1円も使わず、SNSでの成果公開（Build in Public）や特定ターゲットへの個別アプローチにより最初の有料顧客を即日獲得。'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 損益P&Lレントゲン */}
          {activeTab === 'FINANCIALS' && (
            <div className="space-y-4">
              <div className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                損益計算書（P&L レントゲン写真）
              </div>

              <div className="border border-white/[0.08] rounded overflow-hidden divide-y divide-white/[0.06] font-mono text-xs">
                <div className="p-3 bg-[#141924] flex justify-between items-center">
                  <span className="text-zinc-400 font-sans">売上高 (Annual Revenue)</span>
                  <span className="font-bold text-zinc-100 tabular-nums">
                    {rev > 0 ? formatShortAmount(rev) : '非公開'}
                  </span>
                </div>
                <div className="p-3 bg-[#10141E] flex justify-between items-center">
                  <span className="text-zinc-400 font-sans">売上原価 (COGS / サーバー・仕入)</span>
                  <span className="font-bold text-rose-400 tabular-nums">
                    {latestFin?.cogsJpy ? `▲${formatShortAmount(latestFin.cogsJpy)}` : '原価極小 (推定5%未満)'}
                  </span>
                </div>
                <div className="p-3 bg-[#10141E] flex justify-between items-center">
                  <span className="text-zinc-400 font-sans">販管費・人件費・ツール代 (OPEX)</span>
                  <span className="font-bold text-rose-400 tabular-nums">
                    {latestFin?.opexJpy ? `▲${formatShortAmount(latestFin.opexJpy)}` : 'SaaSツール代のみ'}
                  </span>
                </div>
                <div className="p-3 bg-[#141924] flex justify-between items-center border-t-2 border-emerald-500/40">
                  <span className="text-emerald-400 font-sans font-bold">営業手残り純利益 (Net Profit)</span>
                  <span className="font-black text-emerald-400 text-sm tabular-nums">
                    {profit < 0 ? `▲${formatShortAmount(Math.abs(profit))}` : formatShortAmount(profit)}
                  </span>
                </div>
                <div className="p-2.5 bg-[#0C0F16] flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500 font-sans">営業利益率</span>
                  <span className="font-bold text-zinc-300">{margin}%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 武器庫ツール */}
          {activeTab === 'WEAPONS' && (
            <div className="space-y-4">
              <div className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                稼働インフラ（実際に稼働しているSaaS・API・ツール棚卸し）
              </div>

              <div className="space-y-2">
                {(company.tools && company.tools.length > 0) ? (
                  company.tools.map((t, idx) => (
                    <div key={idx} className="p-3 bg-[#121620] border border-white/[0.06] rounded flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-zinc-200">{t.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{t.purpose}</div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-[10px] text-zinc-500 block">月額</span>
                        <span className="text-zinc-300 font-bold">
                          {t.monthlyCostJpy === 0 ? '無料' : `¥${t.monthlyCostJpy.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-[#121620] border border-white/[0.06] rounded text-xs text-zinc-400 leading-relaxed">
                    Stripe（カード即時決済）、Next.js / Vercel（ホスティング）、OpenAI / Replicate API（推論実行）、Tailwind CSSにより、初期固定費ほぼゼロで自走運用。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 集客Playbook & コールドDM */}
          {activeTab === 'PLAYBOOK' && (
            <div className="space-y-4">
              <div className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                泥臭い集客Playbook ＆ コールドDM実文
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>今夜そのまま送れるアプローチ文案</span>
                  <button
                    onClick={() => handleCopyDM(coldDM)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono hover:bg-emerald-500/20 cursor-pointer"
                  >
                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{isCopied ? 'コピー完了' : '本文をコピー'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-[#121620] border border-white/[0.08] rounded text-xs text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {coldDM}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. 下部アクションバー ── */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#0C1018] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] font-mono text-zinc-400">
            DOSSIER #{company.ticker}
          </div>
          {onOpenProModal && (
            <button
              onClick={onOpenProModal}
              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition-colors cursor-pointer border border-emerald-400"
            >
              PRO非公開手口をアンロック
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  Pin,
  Share2,
  Star,
  Users,
  X
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function CompanyHeader({
  entity,
  onClose,
  activeTags = [],
  onToggleTag,
  isScrolled,
  scrollToSection,
  formatMoney,
  isHazardMode,
  isFinancialUnavailable,
  mainTab = 'LEDGER',
  setMainTab,
  isBookmarked,
  onToggleBookmark,
}: Pick<InspectorSectionProps, 'entity' | 'onClose' | 'activeTags' | 'onToggleTag' | 'isScrolled' | 'scrollToSection' | 'formatMoney' | 'isHazardMode' | 'isFinancialUnavailable' | 'mainTab' | 'setMainTab' | 'isBookmarked' | 'onToggleBookmark'>) {
  const [copied, setCopied] = useState(false);

  const rev = entity.pnl?.monthlyRevenue || 0;
  const profit = entity.pnl?.operatingProfit ?? 0;
  const margin = entity.pnl?.operatingMargin ?? (rev > 0 ? Math.round((profit / rev) * 100) : 0);
  const isLoss = profit < 0 || isHazardMode;

  // 1. 公式サイト外部リンク
  const rawUrl = entity.websiteUrl || entity.url || (entity as unknown as { website?: string }).website || (entity.essence as unknown as { website?: string })?.website || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

  // 2. チーム規模
  const rawTeam = entity.operations?.teamSize || (entity as unknown as { teamSize?: number | string }).teamSize;
  const isSolo = entity.tags?.some(t => t.includes('1人') || t.includes('一人') || t.includes('ソロ'));
  const displayTeam = rawTeam ? (typeof rawTeam === 'number' ? `${rawTeam}人` : String(rawTeam)) : (isSolo ? '1人' : null);

  // 3. 事業継続年数
  const foundedYear = entity.temporal?.foundedYear;
  const currentYear = 2026;
  const trackRecordYears = (foundedYear && foundedYear > 1900 && foundedYear <= currentYear) 
    ? (currentYear - foundedYear + 1)
    : null;
  const displayAge = trackRecordYears ? `稼働${trackRecordYears}年目 (${foundedYear}年〜)` : null;

  // 4. 推定事業価値（年間営業利益の5倍、または売上の2.5倍）
  const annualProfit = profit * 12;
  const estValuation = annualProfit > 0 ? annualProfit * 5 : (rev * 12 * 2.5);
  const valuationText = (!isFinancialUnavailable && estValuation > 0)
    ? `想定価値: 約${formatMoney(estValuation)} (5x)`
    : null;

  // 5. 一次情報原本件数
  const evidenceCount = (entity.evidenceCards?.length || 0) + (entity.sources?.length || 0);

  // 6. X (Twitter) 共有ハンドラー
  const handleShareX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const revText = isFinancialUnavailable ? '未確認' : formatMoney(rev);
    const profitText = isFinancialUnavailable ? '未確認' : formatMoney(profit);
    const text = `『${entity.name}』の資本主義の裏帳簿：月商${revText} / 純手残り${profitText}（利益率${margin}%）\n#KIN_KOROKU #資本主義の裏帳簿\n`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://make-money.app';
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  // 7. URLコピー ハンドラー
  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return <>
        <div className={`shrink-0 z-30 bg-[#07090D] border-b relative transition-all duration-150 ${
          isScrolled
            ? 'border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.95)]'
            : 'border-white/[0.10] shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
        }`}>
          {/* 最上部アクセントライン */}
          <div className="h-[1px] w-full bg-white/[0.15]" />

          {/* 1. タイトル＆主要操作バー（1行統合・高密度金融HUD） */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/[0.04]">
            {/* 左側：ID・社名・属性・外部リンク */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] text-white font-bold shrink-0 bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/[0.12] flex items-center gap-1">
                <Pin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                <span>{entity.ticker}</span>
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate font-sans tracking-tight">
                {entity.name}
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono hidden md:inline truncate">
                {entity.legalEntity || entity.founder} ・ {entity.country}
              </span>

              {/* ① 公式サイト外部リンク */}
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.10] text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title={`${entity.name} の実物公式サイトを開く（新規タブ）`}
                >
                  <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="hidden sm:inline">公式サイト</span>
                </a>
              )}
            </div>

            {/* 右側：推定価値・お気に入り・共有・クローズ */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* ⑥ 推定事業価値 */}
              {valuationText && (
                <span
                  className="hidden lg:inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10px] font-bold tracking-tight shadow-xs"
                  title="年間利益の5倍換算による想定M&A事業売却価値"
                >
                  {valuationText}
                </span>
              )}

              {/* ⑦ お気に入り/保存 */}
              {onToggleBookmark && (
                <button
                  type="button"
                  onClick={onToggleBookmark}
                  className={`p-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                    isBookmarked
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title={isBookmarked ? 'お気に入りから解除' : 'お気に入りに保存'}
                >
                  <Star className={`w-3 h-3 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">{isBookmarked ? '保存済' : '保存'}</span>
                </button>
              )}

              {/* ⑧ X (Twitter) 共有 */}
              <button
                type="button"
                onClick={handleShareX}
                className="p-1.5 rounded-md border bg-white/[0.04] hover:bg-white/[0.10] border-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                title="X (Twitter) でこの裏帳簿を共有"
              >
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">共有</span>
              </button>

              {/* ⑧ URL コピー */}
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1.5 rounded-md border bg-white/[0.04] hover:bg-white/[0.10] border-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                title="URLをクリップボードにコピー"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 hidden sm:inline">済</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">URL</span>
                  </>
                )}
              </button>

              {/* クローズボタン */}
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer ml-0.5"
                title="閉じる (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. 冷徹な戦闘力 ＆ 運用体力インジケーター（需要・競争を完全置換） */}
          <div className="px-3 py-1.5 bg-[#05060A] border-b border-white/[0.04] flex items-center justify-between gap-2 text-[10px] font-mono overflow-x-auto scrollbar-none">
            {/* 左側：月商・手残り・利益率 */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-zinc-400">月商: <strong className="text-white">{isFinancialUnavailable ? '未確認' : formatMoney(rev)}</strong></span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">純手残り: <strong className={isLoss ? 'text-red-400' : 'text-emerald-300'}>{isFinancialUnavailable ? '未確認' : formatMoney(profit)}</strong></span>
              <span className={`px-1.5 py-0.2 rounded font-black border ${
                isLoss
                  ? 'bg-red-950/40 text-red-300 border-red-500/40'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              }`}>
                {isLoss ? '赤字出血' : `利益率 ${margin}%`}
              </span>
            </div>

            {/* 右側：チーム人数・継続年数・一次情報原本アンカー */}
            <div className="flex items-center gap-2 text-zinc-400 shrink-0">
              {/* ③ チーム人数 */}
              {displayTeam && (
                <>
                  <span className="text-zinc-700 hidden sm:inline">|</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-cyan-400" />
                    <span>組織: <strong className="text-zinc-200">{displayTeam}</strong></span>
                  </span>
                </>
              )}

              {/* ④ 事業継続年数 */}
              {displayAge && (
                <>
                  <span className="text-zinc-700 hidden sm:inline">|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                    <span className="hidden sm:inline">継続: </span><strong className="text-zinc-200">{displayAge}</strong>
                  </span>
                </>
              )}

              {/* ② 一次情報原本アンカー */}
              <button
                type="button"
                onClick={() => {
                  if (setMainTab) setMainTab('AUDIT');
                  scrollToSection('section-evidence');
                }}
                className="flex items-center gap-1 text-cyan-300 hover:text-cyan-100 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ml-1"
                title="数字の裏付けとなった一次情報・エビデンス原本へ直通ジャンプ"
              >
                <FileCheck className="w-2.5 h-2.5 text-cyan-400" />
                <span>原本・証拠 {evidenceCount > 0 ? `(${evidenceCount})` : ''} ↗</span>
              </button>
            </div>
          </div>

          {/* 3. 探索タグ一覧（上部に常時配置） */}
          <div className="px-3 py-1.5 flex items-center justify-between gap-2 bg-[#05070B] border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {entity.tags && entity.tags.length > 0 && entity.tags.map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onToggleTag) onToggleTag(tag);
                    }}
                    title={`「#${tag}」で左一覧を絞り込み`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-white text-black font-bold border-white shadow-xs'
                        : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-700/60 shadow-xs'
                    }`}
                  >
                    <span className={isActive ? 'text-zinc-600' : 'text-zinc-500'}>#</span>
                    <span>{tag}</span>
                    {isActive ? (
                      <X className="w-2.5 h-2.5 text-black" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. メインタブ切替（【本丸】資本主義の裏帳簿 ⇄ 【証拠】検証エビデンス） */}
          <div className="flex items-center justify-between bg-[#06080E] px-3 py-1.5 border-t border-white/[0.08] text-[11px] font-mono gap-2 flex-wrap">
            <div className="inline-flex rounded-lg p-0.5 bg-black/60 border border-white/[0.12] shrink-0">
              <button
                type="button"
                onClick={() => setMainTab && setMainTab('LEDGER')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'LEDGER'
                    ? 'bg-white text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span>【本丸】資本主義の裏帳簿</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab && setMainTab('AUDIT')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'AUDIT'
                    ? 'bg-white text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3 h-3 text-zinc-400" />
                <span>【証拠】検証エビデンス</span>
              </button>
            </div>
          </div>

          {/* 5. 目次ジャンプバー（選択中タブに応じた直通ナビゲーション） */}
          <div className="flex items-center bg-[#090C12] text-[11px] font-mono border-t border-white/[0.08] divide-x divide-white/[0.06] overflow-x-auto scrollbar-none">
            {mainTab === 'LEDGER' ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-summary')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#01</span>
                  <span>断罪HUD</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-evidence')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#02</span>
                  <span>動かぬ証拠 4大急所</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-cash-anatomy')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#03</span>
                  <span>現金の解剖室</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-loot-blueprint')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#04</span>
                  <span>略奪武器庫</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-sources')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>情報源原本 (#14)</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-stream')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>全量調査ログ</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-notes')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>考察メモ</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-related')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>関連リサーチ</span>
                </button>
              </>
            )}
          </div>
        </div>

  </>;
}

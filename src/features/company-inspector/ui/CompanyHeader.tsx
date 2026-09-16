import { legacyText } from '../model/legacy-fields';
import React, { useState } from 'react';
import {
  Calendar,
  ExternalLink,
  FileText,
  Share2,
  Star,
  Users,
  X
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';
import { ShareModal } from './ShareModal';

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
  viewMode = 'ALL',
  setViewMode,
  isBookmarked,
  onToggleBookmark,
}: Pick<InspectorSectionProps, 'entity' | 'onClose' | 'activeTags' | 'onToggleTag' | 'isScrolled' | 'scrollToSection' | 'formatMoney' | 'isHazardMode' | 'isFinancialUnavailable' | 'mainTab' | 'setMainTab' | 'viewMode' | 'setViewMode' | 'isBookmarked' | 'onToggleBookmark'>) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const rev = entity.pnl?.monthlyRevenue || 0;
  const profit = entity.pnl?.operatingProfit ?? 0;

  // 1. 公式サイト外部リンク
  const rawUrl = legacyText(entity, 'websiteUrl') || entity.url || (entity as unknown as { website?: string }).website || (entity.essence as unknown as { website?: string })?.website || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

  // 2. チーム規模・立ち上げ初期人数（サバンナOS直撃）
  const isSolo = entity.scale === 'SOLO' || entity.tags?.some(t => t.includes('1人') || t.includes('一人') || t.includes('ソロ'));
  const rawInitialTeam = entity.operations?.isTeamSizeUnconfirmed
    ? null
    : entity.operations?.initialTeamSize ?? (isSolo ? 1 : entity.scale === 'SMALL_TEAM' ? 2 : null);
  const rawCurrentTeam = entity.operations?.isTeamSizeUnconfirmed
    ? null
    : entity.operations?.currentTeamSize ?? entity.operations?.teamSize ?? (entity as unknown as { teamSize?: number | string }).teamSize;

  let displayTeam: string | null = null;
  if (rawInitialTeam && rawCurrentTeam && rawInitialTeam !== rawCurrentTeam) {
    displayTeam = `初期 ${rawInitialTeam}人 ➔ 現在 ${typeof rawCurrentTeam === 'number' ? rawCurrentTeam.toLocaleString() : rawCurrentTeam}人`;
  } else if (rawInitialTeam === 1 || isSolo) {
    displayTeam = '初期 1人（ソロ）';
  } else if (rawInitialTeam) {
    displayTeam = `初期 ${rawInitialTeam}人`;
  } else if (rawCurrentTeam) {
    displayTeam = `${typeof rawCurrentTeam === 'number' ? rawCurrentTeam.toLocaleString() : rawCurrentTeam}人`;
  }

  // 3. 事業継続年数
  const hasVerifiedTemporal = entity.evidenceCards?.some((card) => card.evidenceStatus === 'VERIFIED') === true && entity.temporal?.viabilityStatus !== 'UNKNOWN';
  const foundedYear = hasVerifiedTemporal ? entity.temporal?.foundedYear : undefined;
  const currentYear = 2026;
  const trackRecordYears = (foundedYear && foundedYear > 1900 && foundedYear <= currentYear) 
    ? (currentYear - foundedYear + 1)
    : null;
  const displayAge = trackRecordYears ? `稼働${trackRecordYears}年目 (${foundedYear}年〜)` : null;

  // 4. 推定事業価値（年間営業利益の5倍、または売上の2.5倍）
  const annualProfit = profit * 12;
  const estValuation = annualProfit > 0 ? annualProfit * 5 : (rev * 12 * 2.5);
  const valuationText = (!isFinancialUnavailable && !entity.pnl?.isRevenueUnconfirmed && !entity.pnl?.isOperatingProfitUnconfirmed && estValuation > 0)
    ? `想定価値: 約${formatMoney(estValuation)} (5x)`
    : null;

  return <>
        <div className={`shrink-0 z-30 bg-[#07090D] border-b relative transition-all duration-150 ${
          isScrolled
            ? 'border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.95)]'
            : 'border-white/[0.10] shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
        }`}>
          {/* 最上部アクセントライン */}
          <div className={`h-[1px] w-full ${isHazardMode ? 'bg-red-500/60' : 'bg-white/[0.15]'}`} />

          {/* 1. タイトル＆主要操作バー（1行統合・高密度金融HUD） */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/[0.04]">
            {/* 左側：社名・属性・組織・外部リンク */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate font-sans tracking-tight">
                {entity.name}
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono hidden md:inline truncate">
                {entity.legalEntity || entity.founder} ・ {entity.country}
              </span>

              {/* 組織規模 */}
              {displayTeam && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                  <Users className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{displayTeam}</span>
                </span>
              )}

              {/* 事業継続年数 */}
              {displayAge && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                  <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{displayAge}</span>
                </span>
              )}

              {/* 公式サイト外部リンク */}
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
              {/* 推定事業価値 */}
              {valuationText && (
                <span
                  className="hidden lg:inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10px] font-bold tracking-tight shadow-xs"
                  title="年間利益の5倍換算による想定M&A事業売却価値"
                >
                  {valuationText}
                </span>
              )}

              {/* お気に入り/保存 */}
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

              {/* 共有 */}
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="p-1.5 rounded-md border bg-white/[0.04] hover:bg-white/[0.10] border-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                title="この裏帳簿を共有"
              >
                <Share2 className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">共有</span>
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

          {/* 2. メインタブ切替 ＆ 表示モードセレクター ＆ 探索タグ */}
          <div className="flex items-center justify-between bg-[#06080E] px-3 py-1.5 border-t border-white/[0.08] text-[11px] font-mono gap-2">
            {/* 左側: タブ & 表示モード */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* メインタブ切替 */}
              <div className="inline-flex rounded-lg p-0.5 bg-black/60 border border-white/[0.12] shrink-0">
                <button
                  type="button"
                  onClick={() => setMainTab && setMainTab('LEDGER')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mainTab === 'LEDGER'
                      ? 'bg-white text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>資本主義の裏帳簿</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab && setMainTab('AUDIT')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mainTab === 'AUDIT'
                      ? 'bg-white text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3 h-3 text-zinc-400" />
                  <span>検証エビデンス</span>
                </button>
              </div>

              {/* 表示モードセレクター（LEDGER時のみアクティブ） */}
              {mainTab === 'LEDGER' && (
                <div className="flex items-center gap-1 shrink-0">
                  <div className="inline-flex rounded p-0.5 bg-black/50 border border-white/[0.10]">
                    {(
                      [
                        { id: 'ALL', label: '全開示' },
                        { id: 'ESSENCE', label: '要約' },
                        { id: 'FINANCIAL', label: '財務' },
                        { id: 'PLAYBOOK', label: '手順' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setViewMode && setViewMode(m.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          viewMode === m.id
                            ? 'bg-white text-black shadow-xs font-black'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右側: 探索タグ一覧（コンパクト横スクロール） */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 justify-end">
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
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border-white/[0.06]'
                    }`}
                  >
                    <span className="text-zinc-500">#</span>
                    <span>{tag}</span>
                    {isActive ? (
                      <X className="w-2 h-2 text-black" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 目次ジャンプバー（全図表・全セクション直通ナビゲーション） */}
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
                  onClick={() => scrollToSection('section-pipeline')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-cyan-400 font-bold">#02</span>
                  <span>配管図</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-cash-anatomy')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-emerald-400 font-bold">#03</span>
                  <span>現金解剖</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-tradingview')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-cyan-400 font-bold">#04</span>
                  <span>損益構造</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-financial')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#05</span>
                  <span>財務P&L</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-evidence')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#06</span>
                  <span>4大急所</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-essence')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#07</span>
                  <span>正体・DNA</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-flywheel')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-amber-400 font-bold">#08</span>
                  <span>増殖ループ</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-value-chain')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-purple-400 font-bold">#09</span>
                  <span>中抜き図</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-tools')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#10</span>
                  <span>現場ツール</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-loot-blueprint')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#11</span>
                  <span>略奪武器庫</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-playbook')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#12</span>
                  <span>再現手順</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-sources')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>一次情報源</span>
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

        {/* 共有モーダル（各種SNS ＆ 最下部URLコピー） */}
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          entity={entity}
          formatMoney={formatMoney}
          isFinancialUnavailable={isFinancialUnavailable}
        />
  </>;
}

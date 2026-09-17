import React, { useState } from 'react';
import {
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
  isBookmarked,
  onToggleBookmark,
}: Pick<
  InspectorSectionProps,
  | 'entity'
  | 'onClose'
  | 'activeTags'
  | 'onToggleTag'
  | 'isScrolled'
  | 'scrollToSection'
  | 'formatMoney'
  | 'isHazardMode'
  | 'isFinancialUnavailable'
  | 'mainTab'
  | 'setMainTab'
  | 'isBookmarked'
  | 'onToggleBookmark'
>) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const rev = entity.pnl?.monthlyRevenue ?? 0;
  const profit = entity.pnl?.operatingProfit ?? 0;
  const margin = entity.pnl?.operatingMargin ?? 0;
  const revenueKnown = !isFinancialUnavailable && !entity.pnl.isRevenueUnconfirmed;
  const profitKnown = !isFinancialUnavailable && !entity.pnl.isOperatingProfitUnconfirmed;
  const marginKnown = !isFinancialUnavailable && !entity.pnl.isMarginUnconfirmed;
  const isLoss = profitKnown && profit < 0;

  const rawUrl = entity.url || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;
  const displayTeam = !entity.operations.isTeamSizeUnconfirmed && entity.operations.teamSize > 0
    ? `${entity.operations.teamSize}人`
    : null;
  const foundedYear = entity.temporal?.foundedYear;
  const currentYear = new Date().getFullYear();
  const displayAge = foundedYear && foundedYear > 1900 && foundedYear <= currentYear
    ? `${currentYear - foundedYear + 1}年目`
    : null;

  const financialStatusLabel = {
    VERIFIED: '一次確認',
    REPORTED: '報道・取材',
    ESTIMATED: '推定',
    POST_MORTEM: '事後検証',
    UNAVAILABLE: '未確認'
  }[entity.pnl.financialStatus || 'UNAVAILABLE'];

  const ledgerNav = [
    { id: 'section-summary', label: '要点' },
    { id: 'section-cash-anatomy', label: '損益' },
    { id: 'section-evidence', label: '根拠' },
    { id: 'section-loot-blueprint', label: '再現' }
  ];

  const auditNav = [
    { id: 'section-sources', label: '一次情報源' },
    { id: 'section-stream', label: '調査ログ' },
    { id: 'section-notes', label: '考察メモ' },
    { id: 'section-related', label: '関連リサーチ' }
  ];

  return (
    <>
      <header
        className={`relative z-30 shrink-0 border-b bg-[#0b0f15] transition-shadow duration-150 ${
          isScrolled ? 'border-white/[0.14] shadow-[0_10px_26px_rgba(0,0,0,0.45)]' : 'border-white/[0.09]'
        }`}
      >
        <div className={`h-px w-full ${isHazardMode ? 'bg-red-500/55' : 'bg-blue-500/45'}`} />

        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-50 sm:text-base">{entity.name}</h2>
              <span className="hidden truncate text-[10px] text-zinc-500 md:inline">
                {entity.legalEntity || entity.founder} · {entity.country}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="rounded border border-white/[0.09] bg-white/[0.03] px-1.5 py-0.5">{financialStatusLabel}</span>
              {entity.pnl.dataSnapshotPeriod && (
                <span className="rounded border border-white/[0.09] bg-white/[0.03] px-1.5 py-0.5">{entity.pnl.dataSnapshotPeriod}</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2 py-1.5 text-[10px] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80"
                aria-label={`${entity.name}の公式サイトを新しいタブで開く`}
              >
                <ExternalLink className="h-3 w-3 text-blue-400" />
                <span className="hidden sm:inline">公式サイト</span>
              </a>
            )}

            {onToggleBookmark && (
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-pressed={isBookmarked}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
                  isBookmarked
                    ? 'border-blue-500/30 bg-blue-500/15 text-blue-200'
                    : 'border-white/[0.09] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200'
                }`}
              >
                <Star className={`h-3 w-3 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isBookmarked ? '保存済み' : '保存'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2 py-1.5 text-[10px] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80"
              aria-label="この事例を共有"
            >
              <Share2 className="h-3 w-3 text-blue-400" />
              <span className="hidden sm:inline">共有</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80"
              aria-label="閉じる"
              title="閉じる (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto border-b border-white/[0.06] bg-[#0d1118] px-3 py-2 text-[10px] sm:px-4">
          <HeaderMetric label="月商" value={revenueKnown ? formatMoney(rev) : '未確認'} />
          <HeaderMetric
            label="営業利益"
            value={profitKnown ? formatMoney(profit) : '未確認'}
            tone={profitKnown ? (isLoss ? 'red' : 'green') : 'neutral'}
          />
          <HeaderMetric
            label="営業利益率"
            value={marginKnown ? `${margin > 0 ? '+' : ''}${margin}%` : '未確認'}
            tone={marginKnown ? (margin < 0 ? 'red' : margin > 0 ? 'green' : 'neutral') : 'neutral'}
          />
          {displayTeam && (
            <div className="flex shrink-0 items-center gap-1 text-zinc-500">
              <Users className="h-3 w-3" />
              <span>組織</span>
              <strong className="font-mono font-medium tabular-nums text-zinc-300">{displayTeam}</strong>
            </div>
          )}
          {displayAge && <HeaderMetric label="継続" value={displayAge} />}
        </div>

        {entity.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-1.5 sm:px-4">
            {entity.tags.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleTag?.(tag);
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
                    isActive
                      ? 'border-blue-500/35 bg-blue-500/15 text-blue-200'
                      : 'border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5 sm:px-4">
          <div className="inline-flex rounded-md border border-white/[0.09] bg-[#080b10] p-0.5 text-[11px]">
            <TabButton active={mainTab === 'LEDGER'} onClick={() => setMainTab?.('LEDGER')} label="分析" />
            <TabButton
              active={mainTab === 'AUDIT'}
              onClick={() => setMainTab?.('AUDIT')}
              label="証拠"
              icon={<FileText className="h-3 w-3" />}
            />
          </div>
        </div>

        <nav className="flex items-center overflow-x-auto bg-[#0b0f15] px-3 py-1 text-xs" aria-label="事例内ナビゲーション">
          {(mainTab === 'LEDGER' ? ledgerNav : auditNav).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-zinc-400 transition-colors hover:text-white rounded hover:bg-white/[0.04] focus-visible:outline-none"
            >
              <span className="font-mono text-[10px] font-bold text-cyan-400 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-medium text-zinc-300">{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        entity={entity}
        formatMoney={formatMoney}
        isFinancialUnavailable={isFinancialUnavailable}
      />
    </>
  );
}

function HeaderMetric({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'green' | 'red';
}) {
  const valueClass = {
    neutral: 'text-zinc-300',
    green: 'text-emerald-300',
    red: 'text-red-300'
  }[tone];

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-zinc-500">
      <span>{label}</span>
      <strong className={`font-mono font-medium tabular-nums ${valueClass}`}>{value}</strong>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
        active ? 'bg-blue-500/15 text-blue-200' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

import React, { useState } from 'react';
import {
  ExternalLink,
  FileText,
  Share2,
  Bookmark,
  MoreHorizontal,
  X
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';
import { ShareModal } from './ShareModal';

export function CompanyHeader({
  entity,
  onClose,
  onPrevEntity,
  onNextEntity,
  onApproveEntity,
  activeTags = [],
  onToggleTag,
  isScrolled,
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
  | 'onPrevEntity'
  | 'onNextEntity'
  | 'onApproveEntity'
  | 'activeTags'
  | 'onToggleTag'
  | 'isScrolled'
  | 'formatMoney'
  | 'isHazardMode'
  | 'isFinancialUnavailable'
  | 'financialStatus'
  | 'mainTab'
  | 'setMainTab'
  | 'isBookmarked'
  | 'onToggleBookmark'
>) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const rawUrl = entity.url || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;


  return (
    <>
      <header
        className={`relative z-30 shrink-0 border-b bg-[#10161f] transition-shadow duration-150 ${
          isScrolled ? 'border-white/[0.14] shadow-[0_8px_20px_rgba(0,0,0,0.24)]' : 'border-white/[0.09]'
        }`}
      >
        <div className={`h-px w-full ${isHazardMode ? 'bg-rose-300/50' : 'bg-sky-300/40'}`} />

        <div className="border-b border-white/[0.12] px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-zinc-50" title={entity.name}>{entity.name}</h2>
              <span className="hidden truncate text-[10px] text-zinc-500 md:inline">
                {entity.legalEntity || entity.founder} · {entity.country}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="事例の操作">
            <div className="hidden items-center gap-1 sm:flex">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/[0.12] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
                aria-label={`${entity.name}の公式サイトを新しいタブで開く`}
                title="公式サイト"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <a
              href={'/execute/' + encodeURIComponent(entity.id)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded border border-sky-300/25 bg-sky-300/[0.08] px-2.5 text-xs font-medium text-sky-100 transition-colors hover:bg-sky-300/[0.14] max-[600px]:w-9 max-[600px]:px-0"
              aria-label={`${entity.name}をもとに計画を作成`}
              title="計画を作成"
            >
              <FileText className="h-4 w-4" />
              <span className="max-[600px]:sr-only">計画を作成</span>
            </a>

            </div>

            {onToggleBookmark && (
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-pressed={isBookmarked}
                className={`inline-flex h-9 w-9 items-center justify-center rounded border text-xs transition-colors ${
                  isBookmarked
                    ? 'border-sky-300/30 bg-sky-300/[0.1] text-sky-100'
                    : 'border-white/[0.12] bg-white/[0.025] text-zinc-300 hover:bg-white/[0.07] hover:text-zinc-100'
                }`}
                aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
                title={isBookmarked ? '保存済み' : '保存'}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded border border-white/[0.12] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-zinc-100 sm:inline-flex"
              aria-label="この事例を共有"
              title="共有"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <details className="relative sm:hidden">
              <summary aria-label="その他の事例操作" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded border border-white/[0.12] text-zinc-300 hover:bg-white/[0.07] [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-11 z-50 w-44 rounded-md border border-white/20 bg-[#18232d] p-1 shadow-xl">
                {externalUrl && <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded px-3 text-sm text-zinc-100 hover:bg-white/[0.08]"><ExternalLink className="h-4 w-4" />公式サイト</a>}
                <a href={'/execute/' + encodeURIComponent(entity.id)} className="flex min-h-11 items-center gap-2 rounded px-3 text-sm text-zinc-100 hover:bg-white/[0.08]"><FileText className="h-4 w-4" />計画を作成</a>
                <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setIsShareOpen(true); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-sm text-zinc-100 hover:bg-white/[0.08]"><Share2 className="h-4 w-4" />共有</button>
              </div>
            </details>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="閉じる"
              title="閉じる (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
            </div>
          </div>
          {entity.pnl.dataSnapshotPeriod && (
            <p className="mt-1 truncate text-[11px] text-zinc-400" title={entity.pnl.dataSnapshotPeriod}>{entity.pnl.dataSnapshotPeriod}</p>
          )}
          {entity.publishability === 'PARTIAL' && (
            <p
              className="mt-1 rounded border border-amber-300/25 bg-amber-300/[0.07] px-2 py-1 text-[11px] leading-snug text-amber-100"
              role="status"
              data-testid="reaudit-partial-notice"
            >
              再監査中: 出典付きの事実だけを表示しています。未確認の項目は「未確認」と表示し、根拠のない旧表示の数値は取り下げ済みです。
            </p>
          )}
        </div>

        {(onPrevEntity || onNextEntity || onApproveEntity) && <div className="flex items-center justify-end gap-2 px-3 pb-1 text-xs sm:px-4">
          {onPrevEntity && <button type="button" onClick={onPrevEntity} className="rounded px-2 py-1.5 text-zinc-300 hover:bg-white/10" aria-label="前の事例">前へ</button>}
          {onNextEntity && <button type="button" onClick={onNextEntity} className="rounded px-2 py-1.5 text-zinc-300 hover:bg-white/10" aria-label="次の事例">次へ</button>}
          {onApproveEntity && <button type="button" onClick={() => onApproveEntity(entity.id)} className="rounded px-2 py-1.5 text-sky-200 hover:bg-white/10">収集事例を承認</button>}
        </div>}
        <div className="flex min-h-10 items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-0.5 text-xs" role="tablist" aria-label="事例の表示内容">
            <TabButton active={mainTab === 'LEDGER'} onClick={() => setMainTab?.('LEDGER')} label="概要・損益" />
            <TabButton active={mainTab === 'AUDIT'} onClick={() => setMainTab?.('AUDIT')} label="出典・記録" icon={<FileText className="h-3 w-3" />} />
          </div>
          {entity.tags?.length > 0 && (
          <details className="group relative shrink-0">
            <summary className="flex h-8 cursor-pointer list-none items-center rounded px-2 text-xs text-zinc-300 hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
              特徴 {entity.tags.length}{activeTags.length > 0 ? ` · 選択 ${activeTags.length}` : ''}
            </summary>
            <div className="absolute right-0 top-full z-50 flex max-h-64 w-64 flex-wrap items-start gap-1 overflow-y-auto rounded border border-white/[0.18] bg-[#18232d] p-2 shadow-xl">
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
                  className={`rounded border px-2 py-1 text-xs transition-colors ${
                    isActive
                      ? 'border-sky-300/30 bg-sky-300/[0.1] text-sky-100'
                      : 'border-white/[0.1] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            </div>
          </details>
          )}
        </div>
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
      className={`flex h-10 items-center gap-1.5 border-b-2 px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
        active ? 'border-sky-300 bg-sky-300/[0.08] text-sky-100' : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

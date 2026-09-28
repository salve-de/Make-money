import React, { useState } from 'react';

import type { InspectorSectionProps } from '../model/section-props';
import { ShareModal } from './ShareModal';

const headerBtn =
  'inline-flex h-11 min-w-11 items-center justify-center border-l border-term-line px-2 text-xs text-term-fg hover:bg-term-line hover:text-term-fg-strong lg:h-6 lg:min-w-0 lg:border-l-0 lg:px-2';

export function CompanyHeader({
  entity,
  onClose,
  onPrevEntity,
  onNextEntity,
  onApproveEntity,
  activeTags = [],
  onToggleTag,
  formatMoney,
  isFinancialUnavailable,
  mainTab = 'LEDGER',
  setMainTab,
  isBookmarked,
  onToggleBookmark,
  positionLabel,
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
  | 'positionLabel'
>) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const rawUrl = entity.url || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

  return (
    <>
      <header className="relative z-30 shrink-0 border-b border-term-line bg-term-panel">
        {/* 見出しバー: PC 24px / スマホ 44px */}
        <div className="flex h-11 items-center bg-term-head text-xs lg:h-6 lg:gap-3 lg:px-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center px-3 text-sm text-term-accent hover:bg-term-line lg:hidden"
            aria-label="閉じる"
            title="一覧へ戻る"
          >
            ◀ 一覧
          </button>
          <span className="term-panel-name hidden shrink-0 lg:inline">詳細</span>
          <span className="term-num min-w-0 flex-1 truncate px-2 text-term-muted lg:px-0" title={entity.name}>
            <span className="hidden lg:inline">{entity.name}</span>
            {positionLabel && <span className="lg:hidden">{positionLabel}</span>}
          </span>
          <div className="flex shrink-0 items-center" aria-label="事例の操作">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-pressed={isBookmarked}
                className={`${headerBtn} ${isBookmarked ? 'text-term-accent' : ''}`}
                aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
                title={isBookmarked ? '保存済み' : '保存'}
              >
                {isBookmarked ? '保存済' : '保存'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className={headerBtn}
              aria-label="この事例を共有"
              title="共有"
            >
              共有
            </button>
            {onPrevEntity && (
              <button type="button" onClick={onPrevEntity} className={`${headerBtn} hidden lg:inline-flex`} aria-label="前の事例">
                ◀ 前
              </button>
            )}
            {onNextEntity && (
              <button type="button" onClick={onNextEntity} className={`${headerBtn} hidden lg:inline-flex`} aria-label="次の事例">
                次 ▶
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${headerBtn} hidden text-term-muted lg:inline-flex`}
              aria-label="閉じる"
              title="閉じる (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* タブ・リンク・特徴（スマホは押しやすい高さ） */}
        <div className="flex min-h-11 items-center justify-between gap-2 border-t border-term-line-soft pl-1 pr-2.5 lg:min-h-7">
          <div className="flex min-w-0 items-center text-xs" role="tablist" aria-label="事例の表示内容">
            <TabButton active={mainTab === 'LEDGER'} onClick={() => setMainTab?.('LEDGER')} label="概要・損益" />
            <TabButton active={mainTab === 'AUDIT'} onClick={() => setMainTab?.('AUDIT')} label="出典・記録" />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex min-h-11 items-center px-1 text-term-muted hover:text-term-fg-strong lg:min-h-7"
                aria-label={`${entity.name}の公式サイトを新しいタブで開く`}
                title="公式サイト"
              >
                公式サイト
              </a>
            )}
            <a
              href={'/execute/' + encodeURIComponent(entity.id)}
              className="inline-flex min-h-11 items-center px-1 text-term-accent hover:underline lg:min-h-7"
              aria-label={`${entity.name}をもとに計画を作成`}
              title="計画を作成"
            >
              計画を作成
            </a>
            {onApproveEntity && (
              <button type="button" onClick={() => onApproveEntity(entity.id)} className="min-h-11 px-1 text-term-fg hover:text-term-fg-strong lg:min-h-7">
                収集事例を承認
              </button>
            )}
            {entity.tags?.length > 0 && (
              <details className="group relative shrink-0">
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-1 text-term-muted hover:text-term-fg-strong lg:min-h-7 [&::-webkit-details-marker]:hidden">
                  特徴 <span className="term-num ml-1">{entity.tags.length}</span>
                  {activeTags.length > 0 ? <span className="ml-1 text-term-accent">選択 {activeTags.length}</span> : null}
                </summary>
                <div className="absolute right-0 top-full z-50 flex max-h-64 w-64 flex-wrap items-start gap-1 overflow-y-auto border border-term-line bg-term-panel p-2 shadow-xl">
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
                        className={`min-h-11 rounded-sm border px-2 text-xs lg:min-h-6 ${
                          isActive
                            ? 'border-term-accent bg-term-select text-term-fg-strong'
                            : 'border-term-line text-term-muted hover:bg-term-head hover:text-term-fg'
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 items-center px-3 lg:min-h-7 ${
        active
          ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
          : 'text-term-muted hover:bg-term-head hover:text-term-fg'
      }`}
    >
      {label}
    </button>
  );
}

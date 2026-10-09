import React, { useState } from 'react';
import Link from 'next/link';

import { caseLabels } from '@/shared/display-text';
import { caseYearOf } from '@/shared/case-year';
import { YearChip } from '@/platform/components/grid/YearChip';
import { TAG_CLASS, TAG_STATIC } from '@/platform/components/grid/CaseChips';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';
import { useCompareTray } from '@/platform/hooks/useCompareTray';
import { useEntityMedia } from '@/platform/hooks/useEntityMedia';
import { EntityLogo } from '@/platform/components/grid/EntityLogo';
import { pickEntityLogo } from '@/shared/media-display';
import type { InspectorSectionProps } from '../model/section-props';
import { UI, uiFormat } from '@/shared/ui-strings';
import { buildHref } from '@/platform/model/build-material';
import { ShareModal } from './ShareModal';

// 表示方法（inline-flex / hidden）と文字色は、クラスの競合を避けるためボタンごとに指定する
const headerBtn =
  'h-11 min-w-11 items-center justify-center border-l border-term-line px-2 text-xs hover:bg-term-line hover:text-term-fg-strong lg:h-6 lg:min-w-6 lg:border-l-0 lg:px-2';

export function CompanyHeader({
  entity,
  onClose,
  onPrevEntity,
  onNextEntity,
  onApproveEntity,
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
  const compare = useCompareTray();
  const inCompare = compare.has(entity.id);
  // 一覧の行と同じ審査済みのロゴ（同じ読み込み器なので追加の通信はない）。無ければ何も出さない
  const logo = pickEntityLogo(useEntityMedia([entity.id])[entity.id]);

  const rawUrl = entity.url || '';
  const externalUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;
  const sector = sectorLabel(entity);
  const labels = caseLabels(entity);
  const year = caseYearOf(entity);

  return (
    <>
      <header className="relative z-30 shrink-0 border-b border-term-line bg-term-panel">
        {/* 見出しバー: 上の段に戻る・操作ボタン、下の段に社名（切らずに2行まで折り返す）。どのタブでも社名が残る */}
        <div className="flex flex-wrap items-center bg-term-head text-xs lg:gap-x-3 lg:px-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 shrink-0 items-center px-3 text-sm text-term-accent hover:bg-term-line lg:hidden"
            aria-label={UI.BACK_TO_LIST_ARIA}
          >
            {UI.BACK_TO_LIST}
          </button>
          <span className="term-panel-name hidden h-6 shrink-0 items-center lg:inline-flex">{UI.DETAIL_PANEL}</span>
          {positionLabel && <span className="term-num hidden shrink-0 text-term-muted lg:inline">{positionLabel}</span>}
          <div className="order-last min-w-0 basis-full border-t border-term-line-soft bg-term-panel px-3 py-2 lg:-mx-2.5 lg:px-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <EntityLogo asset={logo} variant="header" name={entity.name} />
              <h2 className="min-w-0 break-words text-base font-semibold leading-5 text-term-fg-strong lg:text-lg lg:leading-tight" title={entity.name}>
                {entity.name}
              </h2>
              <YearChip year={year} className="lg:text-sm" />
              {labels.map((label) => <span key={label} className={`${TAG_CLASS} ${TAG_STATIC}`}>{label}</span>)}
            </div>
            {sector && <p className="truncate text-xs leading-4 text-term-label lg:mt-0.5">{sector}</p>}
          </div>
          <div className="ml-auto flex shrink-0 items-center" aria-label={UI.ACTIONS_LABEL}>
            {onToggleBookmark && (
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-pressed={isBookmarked}
                className={`${headerBtn} inline-flex ${isBookmarked ? 'text-term-accent' : 'text-term-fg'}`}
                aria-label={uiFormat(isBookmarked ? UI.UNSAVE_ARIA : UI.SAVE_ARIA, entity.name)}
                title={isBookmarked ? UI.SAVED : UI.SAVE}
              >
                {isBookmarked ? UI.SAVED_SHORT : UI.SAVE}
              </button>
            )}
            <button
              type="button"
              onClick={() => compare.toggle({ id: entity.id, name: entity.name })}
              disabled={!inCompare && compare.isFull}
              aria-pressed={inCompare}
              className={`${headerBtn} inline-flex disabled:cursor-not-allowed disabled:text-term-dim ${inCompare ? 'text-term-accent' : 'text-term-fg'}`}
              aria-label={uiFormat(inCompare ? UI.COMPARE_REMOVE_ARIA : UI.COMPARE_ADD_ARIA, entity.name)}
              title={inCompare ? UI.COMPARE_REMOVE : compare.isFull ? UI.COMPARE_FULL : UI.COMPARE_ADD}
            >
              {inCompare ? UI.COMPARE_ACTIVE : UI.COMPARE}
            </button>
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className={`${headerBtn} inline-flex text-term-fg`}
              aria-label={UI.SHARE_ARIA}
              title={UI.SHARE}
            >
              {UI.SHARE}
            </button>
            {onPrevEntity && (
              <button type="button" onClick={onPrevEntity} className={`${headerBtn} hidden text-term-fg sm:inline-flex`} aria-label={UI.PREV_ARIA}>
                {UI.PREV_SHORT}
              </button>
            )}
            {onNextEntity && (
              <button type="button" onClick={onNextEntity} className={`${headerBtn} hidden text-term-fg sm:inline-flex`} aria-label={UI.NEXT_ARIA}>
                {UI.NEXT_SHORT}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${headerBtn} hidden text-term-muted lg:inline-flex`}
              aria-label={UI.CLOSE}
              title={UI.CLOSE_TITLE}
            >
              {UI.CLOSE_MARK}
            </button>
          </div>
        </div>

        {/* タブ・リンク（スマホは押しやすい高さ） */}
        <div className="flex min-h-11 items-center justify-between gap-2 border-t border-term-line-soft pl-1 pr-2.5 lg:min-h-7">
          <div className="flex shrink-0 items-center text-xs" role="group" aria-label={UI.TABS_LABEL}>
            <TabButton active={mainTab === 'LEDGER'} onClick={() => setMainTab?.('LEDGER')} label={UI.TAB_LEDGER} shortLabel={UI.TAB_LEDGER_SHORT} />
            <TabButton active={mainTab === 'AUDIT'} onClick={() => setMainTab?.('AUDIT')} label={UI.TAB_AUDIT} shortLabel={UI.TAB_AUDIT_SHORT} />
          </div>
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xs">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex min-h-11 items-center px-1 text-term-muted hover:text-term-fg-strong lg:min-h-7"
                aria-label={uiFormat(UI.OFFICIAL_SITE_ARIA, entity.name)}
                title={UI.OFFICIAL_SITE}
              >
                {UI.OFFICIAL_SITE}
              </a>
            )}
            <Link
              href={buildHref(entity.id)}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-1 text-term-accent hover:underline lg:min-h-7"
              aria-label={uiFormat(UI.PLAN_ARIA, entity.name)}
              title={UI.PLAN}
            >
              {UI.PLAN}
            </Link>
            {onApproveEntity && (
              <button type="button" onClick={() => onApproveEntity(entity.id)} className="min-h-11 px-1 text-term-fg hover:text-term-fg-strong lg:min-h-7">
                {UI.APPROVE}
              </button>
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

function TabButton({ active, onClick, label, shortLabel }: { active: boolean; onClick: () => void; label: string; shortLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex min-h-11 items-center whitespace-nowrap px-3 lg:min-h-7 ${
        active
          ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
          : 'text-term-muted hover:bg-term-head hover:text-term-fg'
      }`}
    >
      {/* スマホは短い名前にして、右側の操作と同じ1行に収める */}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

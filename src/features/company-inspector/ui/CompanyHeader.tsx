import React from 'react';
import { Bookmark } from 'lucide-react';

import { caseLabels } from '@/shared/display-text';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';
import { useEntityMedia } from '@/platform/hooks/useEntityMedia';
import { EntityLogo } from '@/platform/components/grid/EntityLogo';
import { pickEntityLogo } from '@/shared/media-display';
import type { InspectorSectionProps } from '../model/section-props';
import { UI, uiFormat } from '@/shared/ui-strings';

// 表示方法（inline-flex / hidden）と文字色は、クラスの競合を避けるためボタンごとに指定する
const headerBtn = 'h-6 min-w-6 items-center justify-center px-2 text-xs hover:bg-term-line hover:text-term-fg-strong';

export function CompanyHeader({
  entity,
  onClose,
  onApproveEntity,
  isBookmarked,
  onToggleBookmark,
  positionLabel,
}: Pick<
  InspectorSectionProps,
  'entity' | 'onClose' | 'onApproveEntity' | 'isBookmarked' | 'onToggleBookmark' | 'positionLabel'
>) {
  // 一覧の行と同じ審査済みのロゴ（同じ読み込み器なので追加の通信はない）。無ければ何も出さない
  const logo = pickEntityLogo(useEntityMedia([entity.id])[entity.id]);

  const sector = sectorLabel(entity);
  const labels = caseLabels(entity);

  return (
    <header className="relative z-30 shrink-0 border-b border-term-line bg-term-panel">
      {/* 上の段（広い画面だけ）: 欄の名前・何件目か・閉じる */}
      <div className="hidden items-center gap-x-3 border-b border-term-line-soft bg-term-head px-2.5 text-xs lg:flex">
        <span className="term-panel-name inline-flex h-6 shrink-0 items-center">{UI.DETAIL_PANEL}</span>
        {positionLabel && <span className="term-num shrink-0 text-term-muted">{positionLabel}</span>}
        <div className="ml-auto flex shrink-0 items-center" aria-label={UI.ACTIONS_LABEL}>
          {onApproveEntity && (
            <button type="button" onClick={() => onApproveEntity(entity.id)} className={`${headerBtn} inline-flex text-term-fg`}>
              {UI.APPROVE}
            </button>
          )}
          <button type="button" onClick={onClose} className={`${headerBtn} inline-flex text-term-muted`} aria-label={UI.CLOSE} title={UI.CLOSE_TITLE}>
            {UI.CLOSE_MARK}
          </button>
        </div>
      </div>
      {/* 社名の段: 左端に一覧へ戻る（狭い画面だけ）、右端に保存。社名は切らずに折り返す */}
      <div className="min-w-0 px-3 py-2 lg:px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="-my-2 -ml-3 inline-flex h-11 shrink-0 items-center px-3 text-sm text-term-accent hover:bg-term-line lg:hidden"
            aria-label={UI.BACK_TO_LIST_ARIA}
          >
            {UI.BACK_TO_LIST}
          </button>
          <EntityLogo asset={logo} variant="header" name={entity.name} />
          {/* 1段目はアイコン・社名・保存だけ。社名は単語の途中で折らない */}
          <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-5 text-term-fg-strong lg:text-lg lg:leading-tight" title={entity.name}>
            {entity.name}
          </h2>
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-pressed={isBookmarked}
              className={`-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center hover:text-term-fg-strong lg:-my-1 lg:-mr-1 lg:h-8 lg:w-8 ${isBookmarked ? 'text-term-accent' : 'text-term-muted'}`}
              aria-label={uiFormat(isBookmarked ? UI.UNSAVE_ARIA : UI.SAVE_ARIA, entity.name)}
              title={isBookmarked ? UI.SAVED : UI.SAVE}
            >
              <Bookmark aria-hidden="true" className={`h-[18px] w-[18px] ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
        {/* 2段目: 札 */}
        {labels.length > 0 && (
          <div className="mt-1.5 flex min-w-0 flex-wrap gap-x-1.5 gap-y-1">
            {labels.map((label) => <span key={label} className="shrink-0 rounded-[2px] border border-term-line px-1.5 text-xs leading-5 text-term-sub">{label}</span>)}
          </div>
        )}
        {sector && <p className="mt-1 truncate text-xs leading-4 text-term-label">{sector}</p>}
      </div>
    </header>
  );
}

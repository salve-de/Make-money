'use client';

import React from 'react';
import type { FinancialEntity } from '../../types/terminal';
import { Bookmark } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { VerifiedMark } from './VerifiedMark';
import type { PublicMediaAsset } from '@/shared/media-display';
import { EntityLogo } from './EntityLogo';
import { UI, uiFormat } from '@/shared/ui-strings';
import { ListDescription, ListMetricCell, ListOriginCell, listMetricsOf } from './ReaderListCells';

interface MobileFeedCardProps {
  entity: FinancialEntity;
  /** 許可済みの公式ロゴ。無ければ何も出さない。 */
  logo?: PublicMediaAsset | null;
  isSelected: boolean;
  onSelect: () => void;
  currency: 'JPY' | 'USD';
  onToggleBookmark: (event: React.MouseEvent) => void;
  isBookmarked: boolean;
  /** 偶数行の縞（一覧側から渡す） */
  zebra?: boolean;
  /** 決済データで売上を確認済み */
  isVerified?: boolean;
}

export const MobileFeedCard: React.FC<MobileFeedCardProps> = ({
  entity,
  logo = null,
  isSelected,
  onSelect,
  onToggleBookmark,
  isBookmarked,
  zebra = false,
  isVerified = false,
}) => {
  const { main, profit } = listMetricsOf(entity.reader);
  const sector = sectorLabel(entity);

  // 開くボタンと保存ボタンを横に並べる（重ねないので、保存を押したつもりで事例が開くことがない）
  return (
    <article data-entity-id={entity.id} className={`flex items-stretch border-b border-term-line-soft ${isSelected ? 'bg-term-select' : zebra ? 'bg-term-row-alt' : ''}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={uiFormat(UI.OPEN_CASE_ARIA, entity.name)}
        className="block min-h-11 min-w-0 flex-1 py-[9px] pl-3 pr-1 text-left focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-term-accent"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <EntityLogo asset={logo} />
            <span data-testid="entity-name" className="min-w-0 truncate text-[15px] font-semibold text-term-fg-strong">{entity.name}</span>
            {isVerified && <VerifiedMark />}
          </span>
          <span className="term-num shrink-0 text-base">
            {main ? <ListMetricCell metric={main} expected={['REVENUE']} /> : <span className="font-sans text-xs text-term-dim"><span className="mr-1 text-term-label">{UI.LIST_COL_REVENUE}</span>{UI.LIST_REVENUE_UNKNOWN}</span>}
          </span>
        </span>
        <ListDescription reader={entity.reader} className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-term-muted" />
        <span className="mt-0.5 flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-3 truncate text-term-label">
            {sector && <span className="truncate">{sector}</span>}
            {profit && <span className="term-num truncate"><ListMetricCell metric={profit} /></span>}
          </span>
          {main && <span className="shrink-0"><ListOriginCell metric={main} /></span>}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-label={uiFormat(isBookmarked ? UI.UNSAVE_ARIA : UI.SAVE_ARIA, entity.name)}
        aria-pressed={isBookmarked}
        className={`inline-flex w-11 shrink-0 items-center justify-center hover:text-term-fg ${isBookmarked ? 'text-term-accent' : 'text-term-dim'}`}
      >
        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
};

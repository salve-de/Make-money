'use client';

import React from 'react';
import type { FinancialEntity } from '../../types/terminal';
import { Bookmark } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { entityDescription } from '@/platform/utils/entityDescription';
import { CONFIRM_TONE_CLASS, confirmStatus, monthlyRevenueParts, teamSizeText, listDescription } from './ledgerRow';

interface MobileFeedCardProps {
  entity: FinancialEntity;
  isSelected: boolean;
  onSelect: () => void;
  currency: 'JPY' | 'USD';
  onToggleBookmark: (event: React.MouseEvent) => void;
  isBookmarked: boolean;
  /** 偶数行の縞（一覧側から渡す） */
  zebra?: boolean;
}

export const MobileFeedCard: React.FC<MobileFeedCardProps> = ({
  entity,
  isSelected,
  onSelect,
  currency,
  onToggleBookmark,
  isBookmarked,
  zebra = false,
}) => {
  const revenue = monthlyRevenueParts(entity, currency);
  const team = teamSizeText(entity);
  const status = confirmStatus(entity);
  const description = listDescription(entityDescription(entity));

  return (
    <article data-entity-id={entity.id} className={`relative border-b border-term-line-soft ${isSelected ? 'bg-term-select' : zebra ? 'bg-term-row-alt' : ''}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`${entity.name}の事例を開く`}
        className="block min-h-11 w-full px-3 py-[9px] text-left focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-term-accent"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] font-semibold text-term-fg-strong">{entity.name}</span>
          <span className={`term-num shrink-0 text-base ${revenue ? 'text-term-fg-strong' : 'text-term-dim'}`}>
            {revenue ? revenue.value : '—'}
            {revenue?.unit && <span className="ml-0.5 font-sans text-xs text-term-label">{revenue.unit}</span>}
          </span>
        </span>
        {description && <span className="mt-0.5 block truncate text-[13px] text-term-muted">{description}</span>}
        <span className="mt-0.5 flex items-center justify-between gap-3 pr-11 text-xs">
          <span className="min-w-0 truncate text-term-label">
            {sectorLabel(entity.sector)}{team ? ` ・ ${team}人` : ''}
          </span>
          <span className={`shrink-0 ${CONFIRM_TONE_CLASS[status.tone]}`}>{status.label}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
        aria-pressed={isBookmarked}
        className={`absolute bottom-0 right-0 inline-flex h-9 w-11 items-center justify-center hover:text-term-fg ${isBookmarked ? 'text-term-accent' : 'text-term-dim'}`}
      >
        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
};

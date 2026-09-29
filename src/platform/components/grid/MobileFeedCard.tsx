'use client';

import React from 'react';
import type { FinancialEntity } from '../../types/terminal';
import { Bookmark } from 'lucide-react';
import { sectorLabel } from './sectorLabel';
import { entityDescription } from '@/platform/utils/entityDescription';
import type { PublicMediaAsset } from '@/shared/media-display';
import { EntityLogo } from './EntityLogo';

interface MobileFeedCardProps {
  entity: FinancialEntity;
  /** 許可済みの公式ロゴ。無ければ何も出さない。 */
  logo?: PublicMediaAsset | null;
  isSelected: boolean;
  onSelect: () => void;
  currency: 'JPY' | 'USD';
  onToggleBookmark: (event: React.MouseEvent) => void;
  isBookmarked: boolean;
}

function formatMoney(yen: number, currency: 'JPY' | 'USD'): string {
  if (currency === 'USD') {
    const usd = Math.round(yen / 150);
    if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
    return `$${usd}`;
  }
  if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
  if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
  return `¥${yen.toLocaleString()}`;
}

function revenueUnknown(entity: FinancialEntity): boolean {
  return entity.pnl.isRevenueUnconfirmed === true || entity.pnl.financialStatus === 'UNAVAILABLE';
}

function sourceStatus(entity: FinancialEntity): string {
  if (revenueUnknown(entity)) return '';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return '一次資料';
    case 'REPORTED': return '報道';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return '根拠未登録';
  }
}

function sourceStatusTone(entity: FinancialEntity): string {
  if (revenueUnknown(entity)) return 'text-zinc-400';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return 'text-emerald-300';
    case 'REPORTED': return 'text-sky-300';
    case 'ESTIMATED': return 'text-amber-300';
    case 'POST_MORTEM': return 'text-rose-300';
    default: return 'text-zinc-400';
  }
}

function teamSizeLabel(entity: FinancialEntity): string {
  const teamSize = entity.operations?.teamSize;
  if (entity.operations?.isTeamSizeUnconfirmed || teamSize == null) return '';
  return `${teamSize.toLocaleString()}人`;
}

function Metric({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      <dt className="text-[11px] text-zinc-400">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums text-zinc-100 break-words">{value}</dd>
      {secondary && <dd className="mt-0.5 truncate text-[11px] text-zinc-400">{secondary}</dd>}
    </div>
  );
}

export const MobileFeedCard: React.FC<MobileFeedCardProps> = ({
  entity,
  logo = null,
  isSelected,
  onSelect,
  currency,
  onToggleBookmark,
  isBookmarked,
}) => {
  const isCandidate = entity.tags?.includes('未精査候補') === true;
  const foundedYear = entity.temporal?.foundedYear;
  const isRevenueUnknown = revenueUnknown(entity);
  const isProfitUnknown = isRevenueUnknown || entity.pnl.isOperatingProfitUnconfirmed === true;
  const isMarginUnknown = isRevenueUnknown || entity.pnl.isMarginUnconfirmed === true;
  const description = entityDescription(entity);
  const isRetiredCase = entity.architecturePattern?.startsWith('地雷:') === true;
  const revenueValue = isRevenueUnknown ? (entity.pnl.revenueLabel || '売上未確認') : formatMoney(entity.pnl.monthlyRevenue, currency);
  const hasProfit = !isProfitUnknown;
  const hasMargin = !isMarginUnknown;
  const team = teamSizeLabel(entity);
  const status = sourceStatus(entity);

  return (
    <article className={`border-b border-l-2 transition-colors ${isSelected ? 'border-sky-300 bg-sky-300/[0.15] shadow-[inset_0_0_0_1px_rgba(90,168,245,0.16)]' : 'border-transparent border-b-white/[0.12] bg-[#0c1016]' }`}>
      <div className="relative flex items-start px-3 py-3">
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={isBookmarked ? `${entity.name}の保存を解除` : `${entity.name}を保存`}
          aria-pressed={isBookmarked}
          className="absolute right-1 top-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-sky-200' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          aria-label={`${entity.name}の事例を開く`}
          className="min-w-0 flex-1 rounded-md px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <div className="flex min-w-0 items-center gap-2 pr-9">
            <EntityLogo asset={logo} />
            <h2 className="min-w-0 truncate text-[15px] font-semibold text-zinc-100">{entity.name}</h2>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
            <span className="max-w-full truncate text-zinc-300">
              {sectorLabel(entity.sector)}
            </span>
            {foundedYear !== undefined && foundedYear > 0 && <span>{foundedYear}年創業</span>}
            {team && <span>{team}</span>}
            {isCandidate && (
              <span className="rounded border border-amber-300/30 bg-amber-300/[0.08] px-1.5 py-0.5 text-[11px] text-amber-200">確認中</span>
            )}
            {isRetiredCase && <span className="rounded border border-rose-300/30 bg-rose-300/[0.08] px-1.5 py-0.5 text-[11px] text-rose-200">撤退事例</span>}
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-200">
            {description}
          </p>

          <dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-white/[0.09] pt-2">
            <Metric
              label="売上"
              value={revenueValue}
            />
            {hasProfit && <Metric label="営業利益" value={formatMoney(entity.pnl.operatingProfit, currency)} />}
            {hasMargin && <Metric label="利益率" value={`${entity.pnl.operatingMargin}%`} />}
          </dl>

          {status && <span className={`mt-1 block text-[11px] ${sourceStatusTone(entity)}`}>{status}</span>}
        </button>
      </div>
    </article>
  );
};

'use client';

import React from 'react';
import type { NewArrivalsRelease } from '@/lib/foundation/new-arrivals';
import type { FinancialEntity } from '@/shared/terminal';
import { hasRecordedRevenue, isFailureCase } from '@/platform/model/case-outcome';
import { confirmStatus } from '@/platform/components/grid/ledgerRow';
import { sectorLabel } from '@/platform/components/grid/sectorLabel';
import { formatYen } from '@/platform/utils/moneyDisplay';

const LAST_SEEN_KEY = 'make-money:new-arrivals:last-seen:v1';
const HIGHLIGHT_LIMIT = 3;

function readLastSeenReleaseId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function subscribeToSeenChanges(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

function getServerLastSeenReleaseId(): string | null {
  return null;
}

interface NewArrivalsBannerProps {
  release: NewArrivalsRelease | null;
  /** 読み込み済みの事例。新着のうち売上や失敗の記録があるものを拾う。 */
  entities?: readonly FinancialEntity[];
  onOpen: () => void;
  onOpenEntity?: (id: string) => void;
}

/** 新着のうち、売上の記録がある事例（金額の大きい順）と失敗の記録を拾う。数字は記録があるものだけ。 */
export function newArrivalHighlights(release: NewArrivalsRelease, entities: readonly FinancialEntity[]) {
  const ids = new Set(release.entityIds);
  const arrived = entities.filter((entity) => ids.has(entity.id));
  const withRevenue = arrived.filter(hasRecordedRevenue).sort((a, b) => b.pnl.monthlyRevenue - a.pnl.monthlyRevenue);
  const failures = arrived.filter(isFailureCase);
  const highlights = [...failures.slice(0, 1), ...withRevenue.filter((entity) => !failures.includes(entity))].slice(0, HIGHLIGHT_LIMIT);
  // 新着がすべて読み込めた時だけ件数を出す（一部だけで数えると少なく見えるため）
  const complete = arrived.length >= release.count;
  return { highlights, revenueCount: complete ? withRevenue.length : null, failureCount: complete ? failures.length : null };
}

export const NewArrivalsBanner: React.FC<NewArrivalsBannerProps> = ({ release, entities = [], onOpen, onOpenEntity }) => {
  const persistedLastSeenReleaseId = React.useSyncExternalStore(
    subscribeToSeenChanges,
    readLastSeenReleaseId,
    getServerLastSeenReleaseId,
  );
  const [locallySeenReleaseId, setLocallySeenReleaseId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const summary = React.useMemo(
    () => (release && release.count > 0 ? newArrivalHighlights(release, entities) : null),
    [release, entities],
  );

  if (!release || release.count <= 0 || !summary) return null;

  const lastSeenReleaseId = locallySeenReleaseId ?? persistedLastSeenReleaseId;
  const unread = lastSeenReleaseId !== release.releaseId;
  const markSeen = () => {
    setLocallySeenReleaseId(release.releaseId);
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, release.releaseId);
    } catch {
      // Private browsing or storage-disabled sessions still get the banner.
    }
  };
  const detailId = `new-arrival-highlights-${release.releaseId}`;

  return (
    <section
      aria-label="新着の発見"
      className={`border-b border-term-line-soft text-xs ${unread ? 'bg-term-accent-bg text-term-fg' : 'bg-term-panel text-term-muted'}`}
      aria-live={unread ? 'polite' : undefined}
    >
      <div className="flex min-h-7 items-center justify-between gap-3 px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${unread ? 'text-term-accent' : 'text-term-dim'}`}>{unread ? '新着' : '確認済み'}</span>
          <span className="truncate">
            <span className="text-term-fg-strong">新しく公開された事例</span>
            <span className="mx-1.5 text-term-dim">・</span>
            <span className="term-num">{release.count}件</span>
            {summary.revenueCount !== null && summary.revenueCount > 0 && (
              <><span className="mx-1.5 text-term-dim">・</span>売上の記録あり <span className="term-num">{summary.revenueCount}件</span></>
            )}
            {summary.failureCount !== null && summary.failureCount > 0 && (
              <><span className="mx-1.5 text-term-dim">・</span>失敗・撤退 <span className="term-num">{summary.failureCount}件</span></>
            )}
            <span className="mx-1.5 hidden text-term-dim sm:inline">・</span>
            <span className="hidden sm:inline">{release.label}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {summary.highlights.length > 0 && onOpenEntity && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={() => setExpanded((value) => !value)}
              className="hidden min-h-0 rounded-sm px-2 text-xs text-term-sub hover:bg-term-head hover:text-term-fg-strong sm:inline-flex sm:h-[22px] sm:items-center"
            >
              {expanded ? '注目を閉じる' : `注目の${summary.highlights.length}件`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              markSeen();
              onOpen();
            }}
            className="min-h-11 shrink-0 rounded-sm border border-term-line px-2 text-xs text-term-fg hover:bg-term-head hover:text-term-fg-strong lg:min-h-0 lg:h-[22px]"
          >
            新着を見る
          </button>
        </div>
      </div>
      {expanded && onOpenEntity && (
        <ul id={detailId} className="border-t border-term-line-soft">
          {summary.highlights.map((entity) => {
            const failure = isFailureCase(entity);
            const status = confirmStatus(entity);
            return (
              <li key={entity.id}>
                <button
                  type="button"
                  onClick={() => {
                    markSeen();
                    onOpenEntity(entity.id);
                  }}
                  className="grid h-7 w-full grid-cols-[minmax(0,1fr)_7rem_7.5rem] items-center gap-3 px-2.5 text-left hover:bg-term-head"
                >
                  <span className="truncate text-term-fg-strong">{entity.name}</span>
                  <span className="truncate text-term-muted">{sectorLabel(entity.sector)}</span>
                  <span className="truncate text-right">
                    {failure ? (
                      <span className="text-term-danger">失敗・撤退の記録</span>
                    ) : (
                      <><span className="term-num text-term-fg-strong">{formatYen(entity.pnl.monthlyRevenue)}</span><span className="ml-1 text-term-dim">{status.label}</span></>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

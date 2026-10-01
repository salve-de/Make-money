'use client';

import React from 'react';
import type { NewArrivalsRelease } from '@/lib/foundation/new-arrivals';
import type { FinancialEntity } from '@/shared/terminal';
import { hasRecordedRevenue, isFailureCase } from '@/platform/model/case-outcome';

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

/** 公開日を「09/28」の形にする。読めない時は出さない。 */
function shortReleaseDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('month')}/${get('day')}`;
}

/**
 * 一覧の道具欄に置く、今回の公開分への入口（1語）。帯を1段使わず、件数の横に並べる。
 * 未読の間だけ強調色にし、押すと一覧を今回の公開分に絞る。
 */
export const NewArrivalsBanner: React.FC<NewArrivalsBannerProps> = ({ release, entities = [], onOpen }) => {
  const persistedLastSeenReleaseId = React.useSyncExternalStore(
    subscribeToSeenChanges,
    readLastSeenReleaseId,
    getServerLastSeenReleaseId,
  );
  const [locallySeenReleaseId, setLocallySeenReleaseId] = React.useState<string | null>(null);
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
      // Private browsing or storage-disabled sessions still get the link.
    }
  };
  const date = shortReleaseDate(release.releaseAt);
  const breakdown = [
    summary.revenueCount ? `売上の記録あり ${summary.revenueCount}件` : null,
    summary.failureCount ? `失敗・撤退 ${summary.failureCount}件` : null,
  ].filter(Boolean).join('・');

  return (
    <>
    {/* 最終更新日は信頼の手がかりなので、新着の有無と別に件数の横へ常に出す */}
    {date && <span className="term-num hidden whitespace-nowrap px-1 text-xs text-term-dim sm:inline">{date} 更新</span>}
    <button
      type="button"
      onClick={() => {
        markSeen();
        onOpen();
      }}
      title={[`${release.label} に公開`, breakdown].filter(Boolean).join('　')}
      aria-label={`最新の更新で追加された${release.count}件を表示`}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm px-2 text-xs hover:bg-term-head lg:min-h-7 ${unread ? 'text-term-accent' : 'text-term-muted hover:text-term-fg-strong'}`}
    >
      {unread && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-term-accent" />}
      {/* 左の「新着事例」絞り込みと同じ語を避け、更新日に続けて読める文にする（09/28 更新 ● 1件追加） */}
      <span className="term-num">{release.count}件追加</span>
    </button>
    </>
  );
};

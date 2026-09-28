'use client';

import React from 'react';
import type { NewArrivalsRelease } from '@/lib/foundation/new-arrivals';

const LAST_SEEN_KEY = 'make-money:new-arrivals:last-seen:v1';

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
  onOpen: () => void;
}

export const NewArrivalsBanner: React.FC<NewArrivalsBannerProps> = ({ release, onOpen }) => {
  const persistedLastSeenReleaseId = React.useSyncExternalStore(
    subscribeToSeenChanges,
    readLastSeenReleaseId,
    getServerLastSeenReleaseId,
  );
  const [locallySeenReleaseId, setLocallySeenReleaseId] = React.useState<string | null>(null);

  if (!release || release.count <= 0) return null;

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

  return (
    <div
      className={`flex min-h-7 items-center justify-between gap-3 border-b border-term-line-soft px-2.5 text-xs ${
        unread ? 'bg-term-accent-bg text-term-fg' : 'bg-term-panel text-term-muted'
      }`}
      aria-live={unread ? 'polite' : undefined}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`shrink-0 ${unread ? 'text-term-accent' : 'text-term-dim'}`}>
          {unread ? '新着' : '確認済み'}
        </span>
        <span className="truncate">
          <span className="text-term-fg-strong">新着公開便</span>
          <span className="mx-1.5 text-term-dim">・</span>
          <span className="term-num">{release.count}件</span>
          <span className="mx-1.5 text-term-dim">・</span>
          <span>{release.label}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          markSeen();
          onOpen();
        }}
        className="h-[22px] shrink-0 rounded-sm border border-term-line px-2 text-xs text-term-fg hover:bg-term-head hover:text-term-fg-strong"
      >
        新着を見る
      </button>
    </div>
  );
};

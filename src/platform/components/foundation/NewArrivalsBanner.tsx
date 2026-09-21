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
      className={`flex items-center justify-between gap-3 border-b px-3 py-2 text-xs ${
        unread
          ? 'border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-100'
          : 'border-white/[0.06] bg-white/[0.02] text-zinc-400'
      }`}
      aria-live={unread ? 'polite' : undefined}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded border border-cyan-400/30 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
          {unread ? 'NEW' : '確認済み'}
        </span>
        <span className="truncate">
          <strong className="font-semibold">新着公開便</strong>
          <span className="mx-1.5 text-zinc-500">·</span>
          <span>{release.count}件</span>
          <span className="mx-1.5 text-zinc-500">·</span>
          <span>{release.label}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          markSeen();
          onOpen();
        }}
        className="shrink-0 rounded border border-cyan-400/30 px-2.5 py-1 font-medium text-cyan-200 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white"
      >
        新着を見る
      </button>
    </div>
  );
};

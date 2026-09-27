'use client';

import React from 'react';

interface FoundationSearchContinuationProps {
  available: boolean;
  failed: boolean;
  loading: boolean;
  retryMessage: string | null;
  onContinue: () => void;
}

export const FoundationSearchContinuation: React.FC<FoundationSearchContinuationProps> = ({
  available,
  failed,
  loading,
  retryMessage,
  onContinue,
}) => {
  if (!available) return null;

  const message = failed
    ? retryMessage || 'Foundation検索の続き取得に失敗しました。現在の検索結果は保持されています。'
    : 'Foundation検索は未完了です。過去の公開事例を追加で探索できます。';

  return (
    <div className="flex items-center justify-between gap-3 border-y border-white/[0.05] bg-white/[0.015] px-3 py-2 text-[10px]">
      <span className={failed ? 'text-amber-300' : 'text-zinc-500'}>
        {message}
      </span>
      <button
        type="button"
        disabled={loading}
        onClick={onContinue}
        className="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/[0.08] px-3 py-1.5 font-mono text-cyan-300 transition-colors hover:bg-cyan-500/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? '検索中...' : failed ? '再試行' : '続けて検索'}
      </button>
    </div>
  );
};

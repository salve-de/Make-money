'use client';

import React from 'react';

interface FoundationSearchContinuationProps {
  available: boolean;
  failed: boolean;
  loading: boolean;
  retryMessage: string | null;
  onContinue: () => void;
}

export const FoundationSearchContinuation:
  React.FC<FoundationSearchContinuationProps> = ({
    available,
    failed,
    loading,
    retryMessage,
    onContinue,
  }) => {
    if (!available) return null;

    const message = failed
      ? retryMessage ||
        '追加検索に失敗しました。表示中の結果は保持しています。'
      : '検索対象の続きがあります。';

    return (
      <div className="flex min-h-7 items-center justify-between gap-3 border-y border-term-line-soft bg-term-panel px-2.5 text-xs">
        <span className={failed ? 'text-term-accent' : 'sr-only'}>
          {message}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={onContinue}
          className="min-h-11 shrink-0 rounded-sm border border-term-line px-2 text-xs text-term-fg hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-6"
        >
          {loading ? '検索中...' : failed ? '再試行' : '続けて検索'}
        </button>
      </div>
    );
  };

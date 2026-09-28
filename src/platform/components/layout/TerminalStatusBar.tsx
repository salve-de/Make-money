'use client';

import React from 'react';

interface TerminalStatusBarProps {
  shownCount: number;
  totalCount: number;
  /** データ更新時刻（ISO）。取れないときは表示しない */
  updatedAt?: string | null;
}

function formatJst(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('month')}/${get('day')} ${hour}:${get('minute')}`;
}

export const TerminalStatusBar: React.FC<TerminalStatusBarProps> = ({ shownCount, totalCount, updatedAt }) => {
  const updated = updatedAt ? formatJst(updatedAt) : null;
  const shown = shownCount.toLocaleString('ja-JP');
  const total = Math.max(totalCount, shownCount).toLocaleString('ja-JP');
  return (
    <footer
      aria-label="ステータスバー"
      className="hidden h-[22px] shrink-0 items-center gap-3 border-t border-term-line bg-term-panel px-2.5 font-mono text-xs text-term-label lg:flex"
    >
      <span>
        表示 <span className="text-term-fg">{shown}</span> / {total}
      </span>
      {updated && <span>データ更新 <span className="text-term-fg">{updated}</span></span>}
      <span className="ml-auto flex items-center gap-3">
        <span><span className="text-term-accent">↑↓</span> 移動</span>
        <span><span className="text-term-accent">Enter</span> 開く</span>
        <span><span className="text-term-accent">/</span> 検索</span>
      </span>
    </footer>
  );
};

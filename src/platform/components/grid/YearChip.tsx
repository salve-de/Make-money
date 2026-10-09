import React from 'react';

/**
 * 事業が作られた年（創業・公開）。事例の名前のすぐ右に、枠を付けない小さな数字で添える。押せない（ボタンの見た目にせず、手のカーソルも押した時の動きも付けない）。
 * 年が決まらない事例には出さない（src/shared/case-year.ts）。
 */
export function YearChip({ year, className = '' }: { year: number | null; className?: string }) {
  if (!year) return null;
  return (
    <span data-testid="year-chip" className={`term-num shrink-0 cursor-default select-none whitespace-nowrap text-xs font-normal text-term-dim ${className}`}>
      {year}
    </span>
  );
}

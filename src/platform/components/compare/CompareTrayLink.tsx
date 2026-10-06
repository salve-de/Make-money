'use client';

import Link from 'next/link';
import React from 'react';
import { useCompareTray } from '@/platform/hooks/useCompareTray';
import { compareHref } from '@/platform/model/compare-ids';

/** 比較に事例を入れている時だけ、一覧の道具欄に「比較 n件」を出す。 */
export function CompareTrayLink({ className = '' }: { className?: string }) {
  const { items } = useCompareTray();
  if (items.length === 0) return null;
  return (
    <Link
      href={compareHref(items.map((item) => item.id))}
      className={`inline-flex min-h-9 items-center gap-1.5 border border-term-accent px-2.5 text-xs text-term-accent hover:bg-term-head lg:min-h-7 ${className}`}
      title={items.map((item) => item.name).join(' / ')}
    >
      比較する<span className="term-num">{items.length}件</span>
    </Link>
  );
}

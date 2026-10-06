import React from 'react';

import type { ReaderCase } from '@/shared/reader-case';
import { dedupeReaderSources } from '@/shared/display-text';

export const evidenceAnchor = (prefix: string, id: string) => `${prefix}-evidence-${encodeURIComponent(id)}`;
export const sourceAnchor = (prefix: string, n: number) => `${prefix}-source-${n}`;

/** sourceId → 下の出典一覧での番号（重複をまとめた後の並び）。画面の出典番号はこの1体系だけ。 */
export function sourceNumbers(reader: ReaderCase): Map<string, number> {
  const list = dedupeReaderSources(reader.sources);
  const key = (url: string) => url.replace(/#.*$/, '').replace(/\/$/, '');
  const byKey = new Map(list.map((s, i) => [key(s.url), i + 1]));
  return new Map(reader.sources.map((s) => [s.id, byKey.get(key(s.url)) ?? 0]));
}

/** 事実・数値の後ろに付ける小さい出典番号。押すと下の出典一覧へ飛ぶ。 */
export function SourceRef({ n, prefix }: { n?: number; prefix: string }) {
  if (!n) return null;
  return (
    <a href={`#${sourceAnchor(prefix, n)}`} className="ml-1 inline-flex min-h-6 min-w-6 items-center justify-center align-baseline text-xs text-term-label underline underline-offset-2 hover:text-term-fg-strong">
      {n}
    </a>
  );
}

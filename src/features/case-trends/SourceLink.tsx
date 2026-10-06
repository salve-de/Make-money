import React from 'react';
import type { ReaderSource } from '@/shared/reader-case';
import { cleanDisplayText } from '@/shared/display-text';

function sourceHref(raw: string): string | undefined {
  if (/[\u0000-\u0020\u007f]/.test(raw)) return undefined;
  try {
    const url = new URL(raw);
    return /^(https?:)$/.test(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

/** Keep the source label visible even when its URL cannot be linked safely. */
export function SourceLink({ source, className }: { source: ReaderSource; className: string }) {
  const label = cleanDisplayText(source.publisher) || '出典';
  const href = sourceHref(source.url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
    : <span className="break-words">{label}</span>;
}

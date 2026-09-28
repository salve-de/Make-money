'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function httpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>）)]+/u);
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function SourcesSection({ entity }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const references = new Set<string>();
  for (const card of entity.evidenceCards || []) {
    const url = httpUrl(card.sourceNote || '');
    if (url) references.add(url);
  }

  const links = [
    ...(entity.url ? [{ label: '公式サイト', href: httpUrl(entity.url) }] : []),
    ...[...references].map((href) => ({ label: new URL(href).hostname, href })),
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
  const uniqueLinks = links.filter((link, index) => links.findIndex((item) => item.href === link.href) === index);

  const sourceNotes = [...new Set((entity.evidenceCards || []).map((card) => card.sourceNote?.trim()).filter((note): note is string => Boolean(note)))];
  if (uniqueLinks.length === 0 && sourceNotes.length === 0) return null;

  return (
    <section id="section-sources" className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721] scroll-mt-4">
      <h3 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">参照先</h3>
      <ul className="divide-y divide-white/[0.1]">
        {uniqueLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-sm text-sky-200 hover:bg-white/[0.05]">
              <span className="min-w-0 truncate">{link.label}</span>
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      {sourceNotes.length > 0 && <details className="border-t border-white/10 px-4 py-2.5">
        <summary className="cursor-pointer text-sm text-sky-200">資料名・出典メモ</summary>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-300">{sourceNotes.map((note) => <li key={note} className="break-words">{note}</li>)}</ul>
      </details>}
    </section>
  );
}

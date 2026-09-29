'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function httpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>）)]+/u);
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    if (url.username || url.password) return null;
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

interface AuditedSource {
  url: string;
  publisher: string | null;
  publicationDate: string | null;
  checkedAt: string | null;
  tierLabel: string;
  selfReported: boolean;
  unreachable: boolean;
}

const TIER_LABELS: Record<string, string> = {
  automatic: '出典表示で掲載可',
  facts_only: '事実のみ・出典表示必須',
  unregistered: '権利未登録・事実のみ',
};

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Re-audit sources carry per-source provenance (publisher, dates) and the registry display tier. */
export function auditedSources(reaudit: unknown): AuditedSource[] {
  const sources = reaudit && typeof reaudit === 'object' ? (reaudit as { sources?: unknown }).sources : undefined;
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((item): AuditedSource[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const url = httpUrl(stringField(record, 'url') ?? '');
    if (!url) return [];
    const claim = stringField(record, 'claimStatus') ?? '';
    return [{
      url,
      publisher: stringField(record, 'publisher'),
      publicationDate: stringField(record, 'publicationDate'),
      checkedAt: stringField(record, 'checkedAt'),
      tierLabel: TIER_LABELS[stringField(record, 'displayTier') ?? 'unregistered'] ?? TIER_LABELS.unregistered,
      selfReported: /SELF_REPORT|REPORTED_BY_SUBJECT|(FOUNDER|COMPANY|OWNER)_(SELF|STATEMENT)/.test(claim),
      unreachable: claim === 'UNREACHABLE',
    }];
  });
}

export function SourcesSection({ entity }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  // Only explicit public presentation fields; never enumerate raw/internal metadata.
  const sourceNotes = [...new Set([
    entity.pnl.sourceDoc,
    ...(entity.evidenceCards || []).map((card) => card.sourceNote),
  ].map((note) => note?.trim().replace(/https?:\/\/[^\s<>）)]+/gu, (url) => httpUrl(url) || '[参照URL]')).filter((note): note is string => Boolean(note)))];
  const references = new Set<string>();
  for (const note of sourceNotes) {
    for (const match of note.matchAll(/https?:\/\/[^\s<>）)]+/gu)) {
      const url = httpUrl(match[0]);
      if (url) references.add(url);
    }
  }
  for (const observation of entity.observationsStream || []) {
    for (const value of [observation.sourceUrl, ...(observation.publicDisplay?.sourceUrls || [])]) {
      if (!value) continue;
      const url = httpUrl(value);
      if (url) references.add(url);
    }
  }
  const audited = auditedSources(entity.reaudit);
  const auditedUrls = new Set(audited.map((source) => source.url));
  const links = [
    ...(entity.url ? [{ label: '公式サイト', href: httpUrl(entity.url) }] : []),
    ...[...references].map((href) => ({ label: new URL(href).hostname, href })),
  ].filter((link): link is { label: string; href: string } => Boolean(link.href) && !auditedUrls.has(link.href as string));
  const uniqueLinks = links.filter((link, index) => links.findIndex((item) => item.href === link.href) === index);
  const period = entity.pnl.dataSnapshotPeriod;
  if (audited.length === 0 && uniqueLinks.length === 0 && sourceNotes.length === 0 && !period) return null;

  return (
    <section id="section-sources" className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721] scroll-mt-4">
      <h3 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">参照先</h3>
      {audited.length > 0 && <ul data-testid="audited-sources" className="divide-y divide-white/[0.1] border-b border-white/[0.12]">
        {audited.map((source) => (
          <li key={source.url} className="px-4 py-2 text-xs text-zinc-300">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center justify-between gap-3 text-sm text-sky-200 hover:underline">
              <span className="min-w-0 truncate">{source.publisher ?? new URL(source.url).hostname}<span className="ml-2 text-xs text-zinc-400">{new URL(source.url).hostname}</span></span>
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>{source.tierLabel}</span>
              {source.selfReported && <span className="text-amber-200">本人申告（独立確認なし）</span>}
              {source.unreachable && <span className="text-zinc-400">確認時に到達不能</span>}
              {source.publicationDate && <span>掲載 {source.publicationDate}</span>}
              {source.checkedAt && <span>確認 {source.checkedAt}</span>}
            </p>
          </li>
        ))}
      </ul>}
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
      {period && <p className="border-t border-white/10 px-4 py-2.5 text-xs text-zinc-300"><span className="mr-2 text-zinc-400">対象期間</span>{period}</p>}
      {sourceNotes.length > 0 && <div className="border-t border-white/10 px-4 py-2.5">
        <h4 className="text-sm text-sky-200">資料名・出典メモ</h4>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-300">{sourceNotes.map((note) => <li key={note} className="break-words">{note}</li>)}</ul>
      </div>}
    </section>
  );
}

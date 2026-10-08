'use client';

import React from 'react';
import { formatDisplayDate, formatSourceNote, snapshotPeriodLabel, sourceDocLabel } from '@/shared/display-text';
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
  tierLabel: string | null;
  unreachable: boolean;
}

// 権利が未登録のものは社内の区分なので、読者には出さない（null）。
const TIER_LABELS: Record<string, string | null> = {
  automatic: '出典表示で掲載可',
  facts_only: '事実のみ・出典表示必須',
  unregistered: null,
};

// 中身の無い見出しだけのメモ。出典メモの一覧に出さない。
const EMPTY_NOTES = new Set(['調査範囲の開示']);

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Re-audit sources carry per-source provenance (publisher, dates) and the registry display tier. 出どころの印（本人申告など）は画面に出さない（OWNER_INTENT 20章1）。 */
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
      publicationDate: formatDisplayDate(stringField(record, 'publicationDate')) || null,
      checkedAt: formatDisplayDate(stringField(record, 'checkedAt')) || null,
      tierLabel: TIER_LABELS[stringField(record, 'displayTier') ?? 'unregistered'] ?? null,
      unreachable: claim === 'UNREACHABLE',
    }];
  });
}

/** 同じ発行元・同じサイトの出典（公式サイトの複数ページなど）は1行にまとめる。 */
export function mergeAuditedSources(sources: AuditedSource[]): AuditedSource[] {
  const merged = new Map<string, AuditedSource>();
  for (const source of sources) {
    const key = `${source.publisher ?? ''}|${new URL(source.url).hostname}`;
    const current = merged.get(key);
    if (!current) { merged.set(key, { ...source }); continue; }
    current.unreachable &&= source.unreachable;
    if (source.checkedAt && (!current.checkedAt || source.checkedAt > current.checkedAt)) current.checkedAt = source.checkedAt;
    if (!current.publicationDate) current.publicationDate = source.publicationDate;
  }
  return [...merged.values()];
}

/** SEC 提出書類は CIK・accession の生の文字列ではなく「SEC 10-K（FY2025、提出 2026-01-23）」と書く。 */
export function secFilingLabels(reaudit: unknown): string[] {
  const sources = reaudit && typeof reaudit === 'object' ? (reaudit as { sources?: unknown }).sources : undefined;
  if (!Array.isArray(sources)) return [];
  const labels = sources.flatMap((item): string[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const form = stringField(record, 'form');
    if (!form || !stringField(record, 'accessionNumber')) return [];
    const fy = /FY\s?(\d{4})/.exec(stringField(record, 'periodCovered') ?? '')?.[1];
    const filed = formatDisplayDate(stringField(record, 'publicationDate'));
    const detail = [fy ? `FY${fy}` : '', filed ? `提出 ${filed}` : ''].filter(Boolean).join('、');
    return [`SEC ${form}${detail ? `（${detail}）` : ''}`];
  });
  return [...new Set(labels)];
}

const RAW_SEC_NOTE = /\bCIK\s*\d|accession/i;
const CONFIRMED_ON = /^\d{4}-\d{2}-\d{2}\s*確認$/;

/** 出典メモから URL・英語の社内メモ・発行元名だけの断片・確認日だけの断片を外す。中身が残らなければ ''。 */
export function readableSourceNote(note: string, coveredNames: ReadonlySet<string>): string {
  if (RAW_SEC_NOTE.test(note)) return '';
  const hadUrl = /https?:\/\//.test(note);
  const segments = note
    .replace(/https?:\/\/[^\s<>）)]+/gu, '')
    .split(/(?:^|\s)\/(?=\s|$)/u)
    .map((segment) => segment.replace(/\s{2,}/g, ' ').trim())
    .filter((segment) => segment
      && !/^[a-z][a-z ]+$/.test(segment)
      && !CONFIRMED_ON.test(segment)
      && !coveredNames.has(segment)
      // URL に付けた短い名札（「公式サイト(トップ)」など）は、URL が無ければ意味が無い
      && !(hadUrl && segment.length <= 20 && !/\d/.test(segment)));
  return segments.join(' / ');
}

export function SourcesSection({ entity }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  // Only explicit public presentation fields; never enumerate raw/internal metadata.
  const allNotes = [...new Set([
    entity.pnl.sourceDoc,
    ...(entity.evidenceCards || []).map((card) => card.sourceNote),
  ].map((note) => formatSourceNote(note?.trim().replace(/https?:\/\/[^\s<>）)]+/gu, (url) => httpUrl(url) || '[参照URL]'))).filter((note): note is string => Boolean(note)))];
  const references = new Set<string>();
  for (const note of allNotes) {
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
  const auditedAll = auditedSources(entity.reaudit);
  const audited = mergeAuditedSources(auditedAll);
  // 発行元の名前・サイト名は「参照先」に出ているので、出典メモでは繰り返さない
  const coveredNames = new Set(audited.flatMap((source) => [source.publisher ?? '', new URL(source.url).hostname]).filter(Boolean));
  // 「出典未記録」は中身の無い印なので出典メモに並べない。URL だけ・英語の社内メモ・SEC の CIK/accession の生の文字列も出さない。
  const sourceNotes = [...new Set([
    ...secFilingLabels(entity.reaudit),
    ...allNotes
      .filter((note) => !EMPTY_NOTES.has(note) && sourceDocLabel(note) !== '')
      .map((note) => readableSourceNote(note, coveredNames)),
  ].filter(Boolean))];
  const auditedUrls = new Set(auditedAll.map((source) => source.url));
  const links = [
    ...(entity.url ? [{ label: '公式サイト', href: httpUrl(entity.url) }] : []),
    ...[...references].map((href) => ({ label: new URL(href).hostname, href })),
  ].filter((link): link is { label: string; href: string } => Boolean(link.href) && !auditedUrls.has(link.href as string));
  const uniqueLinks = links.filter((link, index) => links.findIndex((item) => item.href === link.href) === index);
  const period = snapshotPeriodLabel(entity.pnl.dataSnapshotPeriod);
  // 公式サイトのリンクだけなら、ヘッダーの公式サイトボタンと同じ内容なので見出しごと出さない。
  const onlyOfficialLink = uniqueLinks.length > 0 && uniqueLinks.every((link) => link.label === '公式サイト');
  if (audited.length === 0 && (uniqueLinks.length === 0 || onlyOfficialLink) && sourceNotes.length === 0 && !period) return null;

  return (
    <section id="section-sources" className="border-b border-term-line scroll-mt-4">
      <div className="term-panel-title"><h3 className="term-panel-name">参照先</h3></div>
      {audited.length > 0 && <ul data-testid="audited-sources" className="divide-y divide-term-line-soft border-b border-term-line">
        {audited.map((source) => (
          <li key={source.url} className="px-3 py-2 text-xs text-term-fg">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center justify-between gap-3 text-sm text-term-fg underline-offset-2 hover:text-term-fg-strong hover:underline">
              <span className="min-w-0 truncate">{source.publisher ?? new URL(source.url).hostname}<span className="ml-2 text-xs text-term-label">{new URL(source.url).hostname}</span></span>
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {source.unreachable && <span className="text-term-label">確認時に到達不能</span>}
              {source.publicationDate && <span>掲載 {source.publicationDate}</span>}
              {source.checkedAt && <span>確認 {source.checkedAt}</span>}
            </p>
          </li>
        ))}
      </ul>}
      <ul className="divide-y divide-term-line-soft">
        {uniqueLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 px-3 py-1 text-[13px] text-term-fg hover:bg-term-head">
              <span className="min-w-0 truncate">{link.label}</span>
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      {period && <p className="border-t border-term-line-soft px-3 py-1.5 text-xs text-zinc-300"><span className="mr-2 text-zinc-400">対象期間</span>{period}</p>}
      {sourceNotes.length > 0 && <div className="border-t border-term-line-soft px-3 py-1.5">
        <h4 className="text-xs text-term-label">資料名・出典メモ</h4>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-300">{sourceNotes.map((note) => <li key={note} className="break-words">{note}</li>)}</ul>
      </div>}
    </section>
  );
}

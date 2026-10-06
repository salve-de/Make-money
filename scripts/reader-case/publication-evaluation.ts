/** Shared release gate. Missing optional fields are not a reason to invent a value. */
import { createHash } from 'node:crypto';
import { ReaderCaseSchema, type ReaderCase } from '../../src/shared/reader-case';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { checkCase, citesRestrictedSource, missingRequired, reflectAnalysis, type StoredAnalysis } from './analysis-lib';
import { hasText, quoteInText, type SourceCacheRecord, type VerdictsFile } from './verify-lib';

export const PUBLICATION_AUDITS_FILE = 'data/publication-audits.json';
export interface PublicationSource {
  sourceId: string;
  url: string;
  publisher: string;
  text: string;
  snapshot: (Omit<SourceCacheRecord, 'text'> & { text?: string; textHash?: string }) | null;
  policy: unknown | null;
}
export interface PublicationMedia { assets: unknown[]; displayableIds: string[]; problems: string[] }
export interface PublicationInput {
  identity: { id: string; name: string; url?: string | null; publishability?: string };
  reader: ReaderCase;
  verdicts: VerdictsFile[string] | undefined;
  sources: PublicationSource[];
  media: PublicationMedia;
  entityEligible: boolean;
}
export interface PublicationAudit {
  version: 1;
  inputHash: string;
  approvedHash: string;
  inputFile: string;
  outputFile: string;
  inputFileHash: string;
  outputFileHash: string;
}
export type PublicationAudits = Record<string, PublicationAudit>;
export function contentHash(value: unknown): string {
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stable(x)])) : v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
/** Audit files contain bounded excerpts and full-body hashes, not duplicated full cache bodies. */
export function auditSnapshot(input: PublicationInput): PublicationInput {
  return { ...input, sources: input.sources.map((source) => {
    if (!source.snapshot) return source;
    const { text, textHash, ...metadata } = source.snapshot;
    return { ...source, snapshot: { ...metadata, textHash: typeof text === 'string' ? contentHash(text) : textHash } };
  }) };
}
export const publicationHash = (input: PublicationInput): string => contentHash(auditSnapshot(input));

/** Null/omitted analysis means unknown; an active but invalid item is rejected, never silently approved. */
export function preparePublicationReader(reader: ReaderCase, verdicts: VerdictsFile[string] | undefined, analysis: StoredAnalysis[] | null | undefined) {
  if (analysis != null && !Array.isArray(analysis)) return { reader: { ...reader, analysis: [] }, problems: ['推論の形式が不正'] };
  const applied = applyVerdicts(reader, verdicts);
  if (!applied) return { reader: { ...reader, facts: [], metrics: [], analysis: [] }, problems: ['未照合'] };
  const checked = checkCase('publication', analysis ?? [], applied.reader);
  return { reader: reflectAnalysis(applied.reader, checked.kept), problems: checked.dropped.map((x) => `推論:${x.item}:${x.reason}`) };
}

export function evaluatePublication(input: PublicationInput, audit: PublicationAudit | undefined, problems: string[] = []) {
  const reasons = [...problems];
  const { reader, identity } = input;
  reasons.push(...checkCase(identity.id, reader.analysis, reader).dropped.map((d) => `推論:${d.item}:${d.reason}`));
  if (!identity.id?.trim() || !identity.name?.trim()) reasons.push('事業identityが無い');
  if (!input.entityEligible) reasons.push('事業の公開区分または根拠が無効');
  if (!ReaderCaseSchema.safeParse(reader).success) reasons.push('表示形式が不正');
  if (!reader.facts.some((f) => f.kind === 'DESCRIPTION') && !reader.analysis.some((a) => a.item === 'BUSINESS_MODEL')) reasons.push('根拠付きの事業説明が無い');
  if (!reader.facts.length && !reader.metrics.length) reasons.push('照合済みの事実が無い');
  if (!reader.sources.length || citesRestrictedSource(reader)) reasons.push('出典の利用条件が未充足');
  for (const source of reader.sources) {
    const current = input.sources.find((s) => s.sourceId === source.id && s.url === source.url);
    if (!current?.policy || (typeof current.policy === 'object' && 'decision' in current.policy && current.policy.decision !== 'allowed')) reasons.push(`利用条件:${source.id}`);
    if (!current?.snapshot || current.snapshot.url !== source.url || current.snapshot.status !== 200 || typeof current.snapshot.text !== 'string' || !hasText(current.snapshot as SourceCacheRecord) || !!current.snapshot.error) {
      reasons.push(`出典本文:${source.id}`); continue;
    }
    for (const claim of [...reader.facts, ...reader.metrics].filter((c) => c.sourceId === source.id)) {
      const verdict = input.verdicts?.[claim.id];
      if (!verdict || !['SUPPORTED', 'PARTIAL'].includes(verdict.verdict) || verdict.sourceUrl !== source.url || !quoteInText(verdict.quote, current.snapshot.text)) reasons.push(`根拠の不一致:${claim.id}`);
    }
  }
  const claimIds = [...reader.facts, ...reader.metrics].map((c) => c.id);
  if (new Set(claimIds).size !== claimIds.length || new Set(reader.sources.map((s) => s.id)).size !== reader.sources.length) reasons.push('根拠IDが重複');
  for (const metric of reader.metrics) if (metric.origin === 'ESTIMATED' && !metric.basis?.trim()) reasons.push(`推定の根拠:${metric.id}`);
  if (input.media.problems.length || !input.media.displayableIds.length) reasons.push('画像の権利または実体が未充足');
  const hash = publicationHash(input);
  if (audit?.version !== 1 || audit.approvedHash !== hash) reasons.push('現在の入力に対する監査が無い');
  return { publishable: reasons.length === 0, reasons, hash, reader };
}

/**
 * 選別（select-finished）と公開データ作り（prepare-catalog-release）が共通で使う関門。
 * 受領書・出典・権利・画像の確認（evaluatePublication）に、main の完成基準（OWNER_INTENT 2章: 必須項目の空欄・薄い事例は出さない）を足す。
 */
export function evaluateForRelease(input: PublicationInput, audit: PublicationAudit | undefined, problems: string[] = []) {
  const base = evaluatePublication(input, audit, problems);
  const reasons = [...base.reasons];
  const { reader } = input;
  if (reader.facts.length <= 2 && reader.metrics.length === 0) reasons.push('データが少ない（事実2件以下で数字なし）');
  reasons.push(...missingRequired(reader).map((m) => `空欄:${m}`));
  return { ...base, reasons, publishable: reasons.length === 0 };
}

/** A release candidate list is mandatory. An absent/malformed file must never mean all records. */
export function parseFinishedManifest(text: string): Set<string> {
  const ids = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  if (ids.some((id) => !/^[A-Za-z0-9_-]+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('Invalid catalog-finished-ids manifest');
  return new Set(ids);
}

import { z } from 'zod';
import {
  MEDIA_ASSET_ID_PATTERN,
  MEDIA_RIGHTS_DECISIONS,
  MediaAssetManifestSchema,
  type MediaAssetManifest,
  type MediaRightsDecision,
} from './media-asset-schema';

/**
 * Review decisions for media assets (ledger v2, owner decision 2026-09-29).
 *
 * `manifest.json` is the record of what was captured and never changes. What a
 * reviewer decided afterwards lives in an append-only `decisions.jsonl` next to
 * it: one JSON object per line, the latest line for an asset is in force. The
 * "effective" view of an asset is the manifest record with that line applied.
 *
 * Fail-closed by construction:
 *   - a decision line that the schema does not accept is an error, never skipped
 *     (a half-written `blocked` line must not leave an older `allowed` in force);
 *   - a line whose result would break the manifest schema (for example `allowed`
 *     on a record with basis "unknown") is ignored and reported, so a bad line
 *     can never grant more than the schema allows;
 *   - only `allowed` with `subjectIsPerson === false` is displayable.
 *
 * Pure module: no I/O. Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md
 */

export const MEDIA_DECISIONS_FILE = 'decisions.jsonl';
export const MEDIA_MANIFEST_FILE = 'manifest.json';

const NOT_BLANK = /\S/;
const isoDateTime = z.iso.datetime({ offset: true });

export const MediaDecisionLineSchema = z
  .strictObject({
    assetId: z.string().regex(MEDIA_ASSET_ID_PATTERN),
    decision: z.enum(MEDIA_RIGHTS_DECISIONS),
    /** True when a person is the subject. `allowed` needs an explicit `false` after looking at the image. */
    subjectIsPerson: z.boolean(),
    /** Who looked at the image, e.g. `owner-delegated-2026-09-29`. */
    reviewer: z.string().min(1).max(200).regex(NOT_BLANK),
    reviewedAt: isoDateTime,
    /** What was checked (allowed) or why it is not used (blocked). */
    note: z.string().max(2000),
  })
  .superRefine((line, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (line.decision === 'allowed') {
      if (line.subjectIsPerson) add('subjectIsPerson', 'an asset whose subject is a person can never be allowed');
      if (!NOT_BLANK.test(line.note)) add('note', 'an allowed decision needs a note recording what was checked');
    }
    if (line.decision === 'blocked' && !NOT_BLANK.test(line.note)) add('note', 'a blocked decision needs the reason in note');
  });

export type MediaDecisionLine = z.infer<typeof MediaDecisionLineSchema>;

export type MediaLedgerErrorCode =
  | 'INVALID_ENTITY_ID'
  | 'MANIFEST_INVALID'
  | 'DECISIONS_INVALID'
  | 'ASSET_NOT_FOUND'
  | 'DECISION_REJECTED'
  | 'FILE_MISSING'
  | 'FILE_MISMATCH';

/** A ledger file that cannot be trusted. Callers that display images must treat it as "show nothing". */
export class MediaLedgerError extends Error {
  constructor(
    message: string,
    readonly code: MediaLedgerErrorCode,
  ) {
    super(message);
    this.name = 'MediaLedgerError';
  }
}

/** The first few schema problems as one line, e.g. `note: a blocked decision needs the reason in note`. */
export function describeMediaIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Parse the text of a `decisions.jsonl`. Blank lines are skipped; any other line that is not
 * a valid decision throws (with its line number) so that the whole ledger fails closed.
 */
export function parseMediaDecisionLog(text: string): MediaDecisionLine[] {
  const lines: MediaDecisionLine[] = [];
  const rows = text.replace(/^﻿/, '').split(/\r?\n/);
  rows.forEach((row, index) => {
    if (!NOT_BLANK.test(row)) return;
    let json: unknown;
    try {
      json = JSON.parse(row);
    } catch {
      throw new MediaLedgerError(`${MEDIA_DECISIONS_FILE} line ${index + 1} is not JSON`, 'DECISIONS_INVALID');
    }
    const parsed = MediaDecisionLineSchema.safeParse(json);
    if (!parsed.success) {
      throw new MediaLedgerError(`${MEDIA_DECISIONS_FILE} line ${index + 1} is invalid (${describeMediaIssues(parsed.error)})`, 'DECISIONS_INVALID');
    }
    lines.push(parsed.data);
  });
  return lines;
}

/** Serialise one decision as a single JSONL row (with the trailing newline). */
export function formatMediaDecisionLine(line: MediaDecisionLine): string {
  return `${JSON.stringify(MediaDecisionLineSchema.parse(line))}\n`;
}

/** The capture-time record with one decision applied. Not yet validated. */
function applyDecision(record: MediaAssetManifest, line: MediaDecisionLine): MediaAssetManifest {
  return {
    ...record,
    subjectIsPerson: line.subjectIsPerson,
    rights: {
      ...record.rights,
      decision: line.decision,
      reviewedAt: line.reviewedAt,
      notes: NOT_BLANK.test(line.note) ? line.note : record.rights.notes,
    },
    // The public copy lives at the same key as the original (foundation-public, same key).
    storage: {
      ...record.storage,
      publicKey: line.decision === 'allowed' ? (record.storage.publicKey ?? record.storage.key) : null,
    },
  };
}

/** A manifest record with the latest valid decision applied. Always satisfies `MediaAssetManifestSchema`. */
export interface EffectiveMediaAsset extends MediaAssetManifest {
  /** The decision line in force, or null while the capture-time record still applies. */
  review: MediaDecisionLine | null;
}

export interface EffectiveMediaLedger {
  assets: EffectiveMediaAsset[];
  /** Lines that were ignored (unknown asset, or a result the schema refuses) and why. */
  problems: string[];
}

/**
 * Manifest + decisions -> the effective judgement of every asset, in manifest order.
 * Lines are applied in file order per asset; a line the schema refuses is skipped and
 * reported, leaving the previous state (never a more permissive one) in force.
 */
export function composeEffectiveManifest(
  records: readonly MediaAssetManifest[],
  decisions: readonly MediaDecisionLine[],
): EffectiveMediaLedger {
  const problems: string[] = [];
  const known = new Set(records.map((record) => record.assetId));
  const byAsset = new Map<string, { line: MediaDecisionLine; position: number }[]>();
  decisions.forEach((line, index) => {
    if (!known.has(line.assetId)) {
      problems.push(`decision #${index + 1} names ${line.assetId}, which is not in manifest.json (ignored)`);
      return;
    }
    const list = byAsset.get(line.assetId) ?? [];
    list.push({ line, position: index + 1 });
    byAsset.set(line.assetId, list);
  });

  const assets = records.map((record): EffectiveMediaAsset => {
    let current: MediaAssetManifest = record;
    let review: MediaDecisionLine | null = null;
    for (const { line, position } of byAsset.get(record.assetId) ?? []) {
      const candidate = MediaAssetManifestSchema.safeParse(applyDecision(record, line));
      if (!candidate.success) {
        problems.push(`decision #${position} for ${record.assetId} (${line.decision}) was ignored: ${describeMediaIssues(candidate.error)}`);
        continue;
      }
      current = candidate.data;
      review = line;
    }
    return { ...current, review };
  });
  return { assets, problems };
}

/** The structural part of an asset that the display gate looks at. */
export interface MediaDisplayGate {
  subjectIsPerson: boolean;
  rights: { decision: MediaRightsDecision };
}

/**
 * The one rule for showing an image: the effective decision is `allowed` and the subject is
 * confirmed not to be a person. Anything else (held, blocked, unconfirmed person flag, malformed
 * input) is not displayable.
 */
export function isMediaDisplayable(asset: MediaDisplayGate): boolean {
  return asset.rights?.decision === 'allowed' && asset.subjectIsPerson === false;
}

export function displayableMediaAssets<T extends MediaDisplayGate>(assets: readonly T[]): T[] {
  return assets.filter(isMediaDisplayable);
}

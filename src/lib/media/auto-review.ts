import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type MediaAssetKind } from '../../shared/media-asset-schema';
import { appendMediaDecision, listStagedEntityIds, readEffectiveManifest, readStagedAsset, stagedFileName, mediaEntityDir } from '../../shared/media-asset-store';
import { MediaLedgerError, type EffectiveMediaAsset } from '../../shared/media-decisions';
import { sniffImage } from '../../shared/media-fetch-policy';
import { join } from 'node:path';

/**
 * Rule-based review of staged media (reviewer "auto-rule-v3"), used instead of a human look for the kinds where a
 * person in the picture is the only realistic problem. It appends to decisions.jsonl exactly like review-assets.
 *
 *   allowed  kind is favicon / app_icon / og_image / store_screenshot / logo, the bytes are a readable image, the
 *            SHA-256 matches the ledger and no face is detected  ->  subjectIsPerson=false
 *   blocked  a face is detected                                   ->  subjectIsPerson=true
 *   held     everything else stays as it is: the image cannot be inspected (Vision cannot read it, file missing or
 *            changed), or the kind needs a human (screenshot_home / screenshot_pricing can show consent banners)
 *
 * Assets that already have a decision line (a human's or an earlier run) are never touched.
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 7.2)
 */

export const AUTO_REVIEWER = 'auto-rule-v3';
export const AUTO_REVIEW_KINDS: readonly MediaAssetKind[] = ['favicon', 'app_icon', 'og_image', 'store_screenshot', 'logo'];
const FACE_CHUNK = 100;

export type FaceResult = { faces: number } | { error: string };
export type FaceDetector = (paths: readonly string[]) => Promise<Map<string, FaceResult>>;

const execFileAsync = promisify(execFile);

/** Vision face detection through osascript/JXA (scripts/media/detect-faces.js). Rejects when osascript itself fails. */
export function createOsascriptFaceDetector(scriptPath: string): FaceDetector {
  return async (paths) => {
    const results = new Map<string, FaceResult>();
    for (let start = 0; start < paths.length; start += FACE_CHUNK) {
      const chunk = paths.slice(start, start + FACE_CHUNK);
      const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', scriptPath, ...chunk], { maxBuffer: 16 * 1024 * 1024, timeout: 300_000 });
      const parsed: unknown = JSON.parse(stdout.trim() || '[]');
      if (!Array.isArray(parsed)) throw new Error('face detector printed something other than an array');
      for (const row of parsed as { path?: unknown; faces?: unknown; error?: unknown }[]) {
        if (typeof row.path !== 'string') continue;
        results.set(row.path, typeof row.faces === 'number' ? { faces: row.faces } : { error: typeof row.error === 'string' ? row.error : 'unknown' });
      }
    }
    return results;
  };
}

export interface AutoReviewTally {
  entities: number;
  allowed: number;
  blocked: number;
  /** Assets left without a decision line: needs a human kind, or could not be inspected. */
  held: number;
  /** Assets that already had a decision line and were not touched. */
  alreadyDecided: number;
  ledgerErrors: string[];
  /** Why assets were held, e.g. { screenshot_home: 12, unreadable: 3 }. */
  heldReasons: Record<string, number>;
}

export interface AutoReviewOptions {
  root: string;
  detector: FaceDetector;
  now: () => Date;
  dryRun?: boolean;
  log?: (line: string) => void;
}

interface Candidate {
  entityId: string;
  asset: EffectiveMediaAsset;
  path: string;
}

export async function runAutoReview(entityIds: readonly string[] | null, options: AutoReviewOptions): Promise<AutoReviewTally> {
  const store = { root: options.root };
  const ids = entityIds ? [...entityIds] : await listStagedEntityIds(store);
  const tally: AutoReviewTally = { entities: 0, allowed: 0, blocked: 0, held: 0, alreadyDecided: 0, ledgerErrors: [], heldReasons: {} };
  const hold = (reason: string) => {
    tally.held += 1;
    tally.heldReasons[reason] = (tally.heldReasons[reason] ?? 0) + 1;
  };

  const candidates: Candidate[] = [];
  for (const entityId of ids) {
    let ledger;
    try {
      ledger = await readEffectiveManifest(entityId, store);
    } catch (error) {
      if (error instanceof MediaLedgerError) {
        tally.ledgerErrors.push(`${entityId}: ${error.message}`);
        continue;
      }
      throw error;
    }
    if (!ledger) continue;
    tally.entities += 1;
    for (const asset of ledger.assets) {
      if (asset.review) {
        tally.alreadyDecided += 1;
        continue;
      }
      if (!AUTO_REVIEW_KINDS.includes(asset.kind)) {
        hold(asset.kind === 'screenshot_home' || asset.kind === 'screenshot_pricing' ? `${asset.kind} (consent banners: human review)` : `${asset.kind} (human review)`);
        continue;
      }
      // The bytes must be the recorded bytes (size and SHA-256) and must look like an image.
      let bytes: Buffer;
      try {
        bytes = await readStagedAsset(entityId, asset, store);
      } catch (error) {
        if (error instanceof MediaLedgerError) {
          hold(`file unverifiable (${error.code})`);
          continue;
        }
        throw error;
      }
      if (!sniffImage(bytes)) {
        hold('not readable as an image');
        continue;
      }
      candidates.push({ entityId, asset, path: join(mediaEntityDir(entityId, store), stagedFileName(asset)) });
    }
  }

  const faces = candidates.length > 0 ? await options.detector(candidates.map((candidate) => candidate.path)) : new Map<string, FaceResult>();
  for (const { entityId, asset, path } of candidates) {
    const result = faces.get(path);
    if (!result || 'error' in result) {
      hold(`face check impossible (${result && 'error' in result ? result.error : 'no result'})`);
      continue;
    }
    const reviewedAt = options.now().toISOString();
    const size = asset.width && asset.height ? ` ${asset.width}x${asset.height}` : '';
    const inspected = `画像として読める (${asset.contentType}${size})、SHA-256が台帳と一致 (${asset.sha256.slice(0, 12)})、macOS Vision の顔検出 (VNDetectFaceRectanglesRequest)`;
    const line =
      result.faces > 0
        ? { assetId: asset.assetId, decision: 'blocked' as const, subjectIsPerson: true, reviewer: AUTO_REVIEWER, reviewedAt, note: `自動判定 ${AUTO_REVIEWER}: ${asset.kind}。${inspected} で顔を ${result.faces} 件検出したため使わない。` }
        : {
            assetId: asset.assetId,
            decision: 'allowed' as const,
            subjectIsPerson: false,
            reviewer: AUTO_REVIEWER,
            reviewedAt,
            note: `自動判定 ${AUTO_REVIEWER}: ${asset.kind}。${inspected} で顔 0 件。公式素材として識別・説明目的の小さな表示に限る。バナーや文言の目視確認はしていない。`,
          };
    if (!options.dryRun) {
      try {
        await appendMediaDecision(entityId, line, store);
      } catch (error) {
        if (error instanceof MediaLedgerError) {
          hold(`decision rejected (${error.code})`);
          continue;
        }
        throw error;
      }
    }
    if (line.decision === 'allowed') tally.allowed += 1;
    else tally.blocked += 1;
    options.log?.(`${line.decision.toUpperCase().padEnd(8)} ${entityId} ${asset.assetId} ${asset.kind}`);
  }
  return tally;
}

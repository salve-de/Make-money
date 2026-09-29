import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MediaAssetManifestFileSchema, type MediaAssetManifest } from '../../shared/media-asset-schema';
import {
  MediaLedgerError,
  MEDIA_DECISIONS_FILE,
  MEDIA_MANIFEST_FILE,
  composeEffectiveManifest,
  isMediaDisplayable,
  parseMediaDecisionLog,
  type MediaDecisionLine,
} from '../../shared/media-decisions';
import { assertMediaEntityId, mediaEntityDir, readStagedAsset, type MediaStoreOptions } from '../../shared/media-asset-store';
import {
  buildPublicMediaManifest,
  latestInstant,
  mediaStamp,
  publicManifestKey,
  rawDecisionsKey,
  rawManifestKey,
  serializePublicMediaManifest,
} from '../../shared/media-public-manifest';

/**
 * Upload plan and execution for one entity's media ledger (owner decision 2026-09-29).
 *
 *   foundation-raw     media/<entityId>/<sha256>.<ext>                  every staged asset (held and blocked too)
 *                      media/<entityId>/manifest.<latest retrievedAt>.json      the capture-time manifest, byte for byte
 *                      media/<entityId>/decisions.<latest reviewedAt>.jsonl     the decision log, byte for byte
 *   foundation-public  media/<entityId>/<sha256>.<ext>                  only assets that are displayable (same key)
 *                      media/<entityId>/public-manifest.<asOf>.json     the public projection (newest stamp wins)
 *
 * Every write is create-only: an existing key with identical bytes is reported `identical`, one with
 * different bytes `conflict`; nothing is overwritten or deleted. Every object is read back and its
 * SHA-256 compared. Stamps come from the ledger's own timestamps, never the wall clock, so running the
 * upload again without new captures or decisions changes nothing.
 *
 * Storage is injected (`MediaObjectStore`) so the flow can be tested without R2; the R2 adapter is
 * r2-media-store.ts. Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 5)
 */

export interface MediaObjectStore {
  /** Throws unless writes can work at all (credentials present, buckets reachable). Never falls back to local files. */
  assertReady(buckets: readonly string[]): Promise<void>;
  putCreateOnly(input: { bucket: string; key: string; body: Uint8Array; contentType: string }): Promise<'created' | 'identical' | 'conflict'>;
  read(bucket: string, key: string): Promise<Uint8Array | null>;
}

export type UploadObjectKind = 'raw_asset' | 'raw_manifest' | 'raw_decisions' | 'public_asset' | 'public_manifest';
export type UploadStatus = 'planned' | 'created' | 'identical' | 'conflict' | 'error' | 'skipped';

export interface PlannedObject {
  kind: UploadObjectKind;
  bucket: string;
  key: string;
  contentType: string;
  bytes: number;
  sha256: string;
  assetId?: string;
  body: Uint8Array;
}

export interface UploadPlan {
  entityId: string;
  buckets: { raw: string; public: string };
  /** Objects in write order: raw first, then the public copies, the public manifest last. */
  objects: PlannedObject[];
  displayable: string[];
  withheld: { assetId: string; kind: string; decision: string; subjectIsPerson: boolean }[];
  /** Anything here stops the upload before the first write. */
  problems: string[];
  warnings: string[];
}

export interface UploadObjectResult {
  kind: UploadObjectKind;
  bucket: string;
  key: string;
  bytes: number;
  sha256: string;
  assetId?: string;
  status: UploadStatus;
  /** True when the object was read back from the store and its SHA-256 and size matched. */
  verified: boolean;
  detail?: string;
}

export interface UploadReport {
  entityId: string;
  dryRun: boolean;
  buckets: { raw: string; public: string };
  displayable: string[];
  withheld: UploadPlan['withheld'];
  objects: UploadObjectResult[];
  problems: string[];
  warnings: string[];
  ok: boolean;
}

const sha256Of = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function readOptional(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Read the ledger and the staged files of one entity and work out exactly what would be written. No network. */
export async function buildUploadPlan(
  entityId: string,
  buckets: { raw: string; public: string },
  options?: MediaStoreOptions,
): Promise<UploadPlan> {
  assertMediaEntityId(entityId);
  const dir = mediaEntityDir(entityId, options);
  const plan: UploadPlan = { entityId, buckets, objects: [], displayable: [], withheld: [], problems: [], warnings: [] };

  const manifestBytes = await readOptional(join(dir, MEDIA_MANIFEST_FILE));
  if (!manifestBytes) {
    plan.problems.push(`${entityId} has no ${MEDIA_MANIFEST_FILE} in the staging directory`);
    return plan;
  }
  let records: MediaAssetManifest[];
  try {
    const parsed = MediaAssetManifestFileSchema.safeParse(JSON.parse(manifestBytes.toString('utf8')));
    if (!parsed.success) throw new MediaLedgerError(`${parsed.error.issues[0]?.path.join('.') ?? '?'}: ${parsed.error.issues[0]?.message ?? 'invalid'}`, 'MANIFEST_INVALID');
    records = parsed.data;
  } catch (error) {
    plan.problems.push(`${MEDIA_MANIFEST_FILE} of ${entityId} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    return plan;
  }
  if (records.length === 0) {
    plan.problems.push(`${MEDIA_MANIFEST_FILE} of ${entityId} has no records`);
    return plan;
  }
  if (records.some((record) => record.entityId !== entityId)) {
    plan.problems.push(`${MEDIA_MANIFEST_FILE} in the ${entityId} directory holds records of another entity`);
    return plan;
  }

  const decisionsBytes = await readOptional(join(dir, MEDIA_DECISIONS_FILE));
  let decisions: MediaDecisionLine[] = [];
  if (decisionsBytes) {
    try {
      decisions = parseMediaDecisionLog(decisionsBytes.toString('utf8'));
    } catch (error) {
      plan.problems.push(error instanceof Error ? error.message : String(error));
      return plan;
    }
  }

  const ledger = composeEffectiveManifest(records, decisions);
  for (const problem of ledger.problems) plan.warnings.push(problem);

  const retrievedAt = latestInstant(records.map((record) => record.retrievedAt)) as string;
  const reviewedAt = latestInstant(decisions.map((line) => line.reviewedAt));
  const asOf = latestInstant([retrievedAt, ...(reviewedAt ? [reviewedAt] : [])]) as string;

  const push = (object: Omit<PlannedObject, 'bytes' | 'sha256'>) => {
    plan.objects.push({ ...object, bytes: object.body.byteLength, sha256: sha256Of(object.body) });
  };

  // 1. foundation-raw: every staged asset whose bytes still match the ledger.
  const bytesByAsset = new Map<string, Buffer>();
  for (const asset of ledger.assets) {
    if (asset.storage.bucket !== buckets.raw) plan.warnings.push(`${asset.assetId}: the ledger says bucket ${asset.storage.bucket}, uploading to ${buckets.raw}`);
    try {
      bytesByAsset.set(asset.assetId, await readStagedAsset(entityId, asset, options));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A displayable asset that cannot be verified must stop the run. A withheld one (for example a file removed
      // after a takedown request) is simply not archived again.
      if (isMediaDisplayable(asset)) plan.problems.push(`${asset.assetId} is allowed but its staged file cannot be used: ${message}`);
      else plan.warnings.push(`${asset.assetId} (${asset.rights.decision}) was not archived: ${message}`);
    }
  }
  for (const asset of ledger.assets) {
    const body = bytesByAsset.get(asset.assetId);
    if (body) push({ kind: 'raw_asset', bucket: buckets.raw, key: asset.storage.key, contentType: asset.contentType, assetId: asset.assetId, body });
  }
  push({
    kind: 'raw_manifest',
    bucket: buckets.raw,
    key: rawManifestKey(entityId, mediaStamp(retrievedAt)),
    contentType: 'application/json; charset=utf-8',
    body: manifestBytes,
  });
  if (decisionsBytes && decisions.length > 0) {
    push({
      kind: 'raw_decisions',
      bucket: buckets.raw,
      key: rawDecisionsKey(entityId, mediaStamp(reviewedAt as string)),
      contentType: 'application/x-ndjson; charset=utf-8',
      body: decisionsBytes,
    });
  }
  const manifestObject = plan.objects.find((object) => object.kind === 'raw_manifest') as PlannedObject;
  const decisionsObject = plan.objects.find((object) => object.kind === 'raw_decisions');

  // 2. foundation-public: only what the display gate lets through, at the same key, then the public manifest.
  const shown = ledger.assets.filter(isMediaDisplayable);
  for (const asset of shown) {
    const body = bytesByAsset.get(asset.assetId);
    if (body) push({ kind: 'public_asset', bucket: buckets.public, key: asset.storage.publicKey ?? asset.storage.key, contentType: asset.contentType, assetId: asset.assetId, body });
  }
  plan.displayable = shown.map((asset) => asset.assetId);
  plan.withheld = ledger.assets
    .filter((asset) => !isMediaDisplayable(asset))
    .map((asset) => ({ assetId: asset.assetId, kind: asset.kind, decision: asset.rights.decision, subjectIsPerson: asset.subjectIsPerson }));

  if (plan.problems.length === 0) {
    const manifest = buildPublicMediaManifest({
      entityId,
      assets: ledger.assets,
      asOf,
      ledger: { manifestKey: manifestObject.key, decisionsKey: decisionsObject?.key ?? null },
    });
    push({
      kind: 'public_manifest',
      bucket: buckets.public,
      key: publicManifestKey(entityId, mediaStamp(asOf)),
      contentType: 'application/json; charset=utf-8',
      body: new TextEncoder().encode(serializePublicMediaManifest(manifest)),
    });
  }
  return plan;
}

function toResult(object: PlannedObject, status: UploadStatus, verified: boolean, detail?: string): UploadObjectResult {
  return {
    kind: object.kind,
    bucket: object.bucket,
    key: object.key,
    bytes: object.bytes,
    sha256: object.sha256,
    ...(object.assetId ? { assetId: object.assetId } : {}),
    status,
    verified,
    ...(detail ? { detail } : {}),
  };
}

async function putAndVerify(store: MediaObjectStore, object: PlannedObject): Promise<UploadObjectResult> {
  try {
    const outcome = await store.putCreateOnly({ bucket: object.bucket, key: object.key, body: object.body, contentType: object.contentType });
    if (outcome === 'conflict') return toResult(object, 'conflict', false, 'the key already holds different bytes; nothing was overwritten');
    const stored = await store.read(object.bucket, object.key);
    if (!stored) return toResult(object, 'error', false, 'read-back found no object');
    if (stored.byteLength !== object.bytes || sha256Of(stored) !== object.sha256) return toResult(object, 'error', false, 'read-back does not match the local bytes');
    return toResult(object, outcome, true);
  } catch (error) {
    return toResult(object, 'error', false, error instanceof Error ? error.message.split('\n')[0].slice(0, 300) : String(error));
  }
}

/**
 * Write the plan (or only describe it with `dryRun`). Raw objects go first; the public copies are written
 * only when every raw object is safe, and the public manifest only when every public copy is.
 * Throws when the store is not ready (nothing was written).
 */
export async function executeUpload(plan: UploadPlan, store: MediaObjectStore, options: { dryRun: boolean }): Promise<UploadReport> {
  const base = {
    entityId: plan.entityId,
    dryRun: options.dryRun,
    buckets: plan.buckets,
    displayable: plan.displayable,
    withheld: plan.withheld,
    problems: [...plan.problems],
    warnings: [...plan.warnings],
  };
  if (plan.problems.length > 0) {
    return { ...base, objects: plan.objects.map((object) => toResult(object, 'skipped', false, 'the plan has problems')), ok: false };
  }
  if (options.dryRun) return { ...base, objects: plan.objects.map((object) => toResult(object, 'planned', false)), ok: true };

  await store.assertReady([...new Set(plan.objects.map((object) => object.bucket))]);

  const results: UploadObjectResult[] = [];
  const safe = (result: UploadObjectResult) => result.status === 'created' || result.status === 'identical';
  let blocked: string | null = null;
  for (const phase of [['raw_asset', 'raw_manifest', 'raw_decisions'], ['public_asset'], ['public_manifest']] as const) {
    const objects = plan.objects.filter((object) => (phase as readonly string[]).includes(object.kind));
    if (blocked) {
      for (const object of objects) results.push(toResult(object, 'skipped', false, blocked));
      continue;
    }
    for (const object of objects) results.push(await putAndVerify(store, object));
    if (!results.filter((result) => (phase as readonly string[]).includes(result.kind)).every(safe)) {
      blocked = phase[0] === 'public_asset' ? 'not written: a public copy did not verify' : 'not written: an object of the archive (foundation-raw) did not verify';
    }
  }
  return { ...base, objects: results, ok: results.every(safe) };
}

const kb = (bytes: number) => `${bytes.toLocaleString('en-US')} B`;

/** Human readable lines for a plan or a finished report. */
export function formatUploadReport(report: UploadReport): string[] {
  const lines = [
    `${report.entityId}: ${report.objects.length} objects, ${report.displayable.length} displayable asset(s), ${report.withheld.length} withheld from foundation-public`,
  ];
  for (const object of report.objects) {
    const where = `${object.bucket}/${object.key}`;
    lines.push(`  ${object.status.toUpperCase().padEnd(9)} ${object.kind.padEnd(15)} ${where}  ${kb(object.bytes)}  sha256:${object.sha256.slice(0, 12)}${object.status === 'created' || object.status === 'identical' ? (object.verified ? '  read-back OK' : '  READ-BACK NOT VERIFIED') : ''}${object.detail ? `  (${object.detail})` : ''}`);
  }
  for (const held of report.withheld) lines.push(`  withheld  ${held.assetId} ${held.kind} decision=${held.decision} person=${held.subjectIsPerson}`);
  for (const warning of report.warnings) lines.push(`  WARNING   ${warning}`);
  for (const problem of report.problems) lines.push(`  PROBLEM   ${problem}`);
  lines.push(`  result: ${report.ok ? (report.dryRun ? 'plan is consistent (dry run, nothing was read from or written to R2)' : 'all objects verified') : 'NOT OK'}`);
  return lines;
}

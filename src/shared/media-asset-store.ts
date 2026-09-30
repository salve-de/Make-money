import { createHash } from 'node:crypto';
import { open, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import {
  MEDIA_ENTITY_ID_PATTERN,
  MediaAssetManifestFileSchema,
  type MediaAssetManifest,
} from './media-asset-schema';
import {
  MEDIA_DECISIONS_FILE,
  MEDIA_MANIFEST_FILE,
  MediaDecisionLineSchema,
  MediaLedgerError,
  composeEffectiveManifest,
  describeMediaIssues,
  formatMediaDecisionLine,
  parseMediaDecisionLog,
  type EffectiveMediaAsset,
  type EffectiveMediaLedger,
  type MediaDecisionLine,
} from './media-decisions';

/**
 * Local staging store for the media ledger: data/media-staging/<entityId>/
 *   manifest.json     capture-time records (never rewritten)
 *   decisions.jsonl   append-only review decisions (latest line per asset is in force)
 *   <assetId>.<ext>   the staged image bytes
 *
 * Node only (fs). Browser code must use `media-display.ts`; this file is imported by scripts and API routes.
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md
 */

export const MEDIA_STAGING_RELATIVE_DIR = 'data/media-staging';
/** No staged image is larger than this (the fetcher caps og:image at 8 MiB); refuse to serve anything bigger. */
export const MAX_STAGED_ASSET_BYTES = 16 * 1024 * 1024;

export interface MediaStoreOptions {
  /** Staging root. Defaults to <cwd>/data/media-staging. */
  root?: string;
}

export function defaultMediaStagingRoot(cwd: string = process.cwd()): string {
  return resolve(cwd, MEDIA_STAGING_RELATIVE_DIR);
}

function stagingRoot(options?: MediaStoreOptions): string {
  return options?.root ? resolve(options.root) : defaultMediaStagingRoot();
}

/** Entity ids become directory names, so only the ledger's own id alphabet is accepted (no `/`, no `.`). */
export function assertMediaEntityId(entityId: string): void {
  if (typeof entityId !== 'string' || entityId.length > 128 || !MEDIA_ENTITY_ID_PATTERN.test(entityId)) {
    throw new MediaLedgerError(`invalid entity id: ${String(entityId).slice(0, 80)}`, 'INVALID_ENTITY_ID');
  }
}

export function mediaEntityDir(entityId: string, options?: MediaStoreOptions): string {
  assertMediaEntityId(entityId);
  return join(stagingRoot(options), entityId);
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}

/** File name of the staged bytes: <assetId>.<ext>, the extension taken from storage.key. */
export function stagedFileName(asset: Pick<MediaAssetManifest, 'assetId' | 'storage'>): string {
  const key = asset.storage.key;
  return `${asset.assetId}${key.slice(key.lastIndexOf('.'))}`;
}

/** The capture-time records of one entity, or null when it has no manifest.json. Throws when the file is not trustworthy. */
export async function readMediaManifest(entityId: string, options?: MediaStoreOptions): Promise<MediaAssetManifest[] | null> {
  const path = join(mediaEntityDir(entityId, options), MEDIA_MANIFEST_FILE);
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new MediaLedgerError(`${MEDIA_MANIFEST_FILE} of ${entityId} is not JSON`, 'MANIFEST_INVALID');
  }
  const parsed = MediaAssetManifestFileSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new MediaLedgerError(`${MEDIA_MANIFEST_FILE} of ${entityId} is invalid (${first?.path.join('.') ?? '?'}: ${first?.message ?? 'unknown'})`, 'MANIFEST_INVALID');
  }
  const foreign = parsed.data.find((record) => record.entityId !== entityId);
  if (foreign) throw new MediaLedgerError(`${MEDIA_MANIFEST_FILE} in the ${entityId} directory holds records of ${foreign.entityId}`, 'MANIFEST_INVALID');
  return parsed.data;
}

/** The decision lines of one entity in file order; an entity without decisions.jsonl has none. */
export async function readMediaDecisions(entityId: string, options?: MediaStoreOptions): Promise<MediaDecisionLine[]> {
  const path = join(mediaEntityDir(entityId, options), MEDIA_DECISIONS_FILE);
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  return parseMediaDecisionLog(text);
}

export interface EffectiveMediaManifest extends EffectiveMediaLedger {
  entityId: string;
  /** Number of decision lines read from decisions.jsonl. */
  decisionCount: number;
}

/**
 * manifest.json + decisions.jsonl -> the effective judgement of every asset of one entity
 * (null when the entity has no manifest). Throws MediaLedgerError when either file is corrupt:
 * display code must catch that and show nothing for the entity.
 */
export async function readEffectiveManifest(entityId: string, options?: MediaStoreOptions): Promise<EffectiveMediaManifest | null> {
  const records = await readMediaManifest(entityId, options);
  if (!records) return null;
  const decisions = await readMediaDecisions(entityId, options);
  return { entityId, decisionCount: decisions.length, ...composeEffectiveManifest(records, decisions) };
}

/** Entity ids that have a manifest.json in the staging root, sorted. */
export async function listStagedEntityIds(options?: MediaStoreOptions): Promise<string[]> {
  const root = stagingRoot(options);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.length > 128 || !MEDIA_ENTITY_ID_PATTERN.test(entry.name)) continue;
    try {
      await stat(join(root, entry.name, MEDIA_MANIFEST_FILE));
      ids.push(entry.name);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return ids.sort();
}

/**
 * Read the staged bytes of one asset and prove they are the bytes that were recorded (size and
 * SHA-256). The reviewed image and the served image must be the same image. Refuses paths that
 * resolve outside the staging root (symlinks).
 */
export async function readStagedAsset(
  entityId: string,
  asset: Pick<MediaAssetManifest, 'assetId' | 'storage' | 'bytes' | 'sha256'>,
  options?: MediaStoreOptions,
): Promise<Buffer> {
  const file = join(mediaEntityDir(entityId, options), stagedFileName(asset));
  if (asset.bytes > MAX_STAGED_ASSET_BYTES) throw new MediaLedgerError(`${asset.assetId} is larger than ${MAX_STAGED_ASSET_BYTES} bytes`, 'FILE_MISMATCH');
  let realFile: string;
  let realRoot: string;
  try {
    [realRoot, realFile] = await Promise.all([realpath(stagingRoot(options)), realpath(file)]);
  } catch (error) {
    if (isNotFound(error)) throw new MediaLedgerError(`${stagedFileName(asset)} is missing in the staging directory of ${entityId}`, 'FILE_MISSING');
    throw error;
  }
  if (!realFile.startsWith(`${realRoot}${sep}`)) throw new MediaLedgerError(`${stagedFileName(asset)} resolves outside the staging root`, 'FILE_MISMATCH');
  const info = await stat(realFile);
  if (!info.isFile() || info.size !== asset.bytes) {
    throw new MediaLedgerError(`${stagedFileName(asset)} has ${info.size} bytes, the manifest says ${asset.bytes}`, 'FILE_MISMATCH');
  }
  const bytes = await readFile(realFile);
  if (bytes.byteLength !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
    throw new MediaLedgerError(`${stagedFileName(asset)} does not match the recorded sha256`, 'FILE_MISMATCH');
  }
  return bytes;
}

export interface AppendedMediaDecision {
  line: MediaDecisionLine;
  /** The asset as it is now, after the new line. */
  asset: EffectiveMediaAsset;
}

/**
 * Validate and append one decision to decisions.jsonl. manifest.json is never touched.
 *   - the asset must be in the manifest and the existing log must be readable;
 *   - the result must be accepted by the ledger schema (for example, no `allowed` on basis "unknown");
 *   - `allowed` additionally requires the staged file to match the recorded SHA-256, so what is
 *     approved is exactly what will be uploaded and shown.
 */
export async function appendMediaDecision(
  entityId: string,
  input: MediaDecisionLine,
  options?: MediaStoreOptions,
): Promise<AppendedMediaDecision> {
  const checked = MediaDecisionLineSchema.safeParse(input);
  if (!checked.success) throw new MediaLedgerError(`invalid decision: ${describeMediaIssues(checked.error)}`, 'DECISION_REJECTED');
  const line = checked.data;
  const records = await readMediaManifest(entityId, options);
  if (!records) throw new MediaLedgerError(`${entityId} has no ${MEDIA_MANIFEST_FILE} in the staging directory`, 'ASSET_NOT_FOUND');
  const record = records.find((candidate) => candidate.assetId === line.assetId);
  if (!record) throw new MediaLedgerError(`${line.assetId} is not in the manifest of ${entityId}`, 'ASSET_NOT_FOUND');

  const existing = await readMediaDecisions(entityId, options);
  const composed = composeEffectiveManifest(records, [...existing, line]);
  const asset = composed.assets.find((candidate) => candidate.assetId === line.assetId);
  if (!asset || asset.review !== line) {
    const reason = composed.problems.find((problem) => problem.includes(line.assetId) && problem.includes(`#${existing.length + 1} `));
    throw new MediaLedgerError(`the ${line.decision} decision for ${line.assetId} was rejected${reason ? `: ${reason}` : ''}`, 'DECISION_REJECTED');
  }
  if (line.decision === 'allowed') await readStagedAsset(entityId, record, options);

  const path = join(mediaEntityDir(entityId, options), MEDIA_DECISIONS_FILE);
  const handle = await open(path, 'a');
  try {
    // A log that was edited by hand may lack its final newline; never glue two records together.
    const previous = existing.length > 0 ? await readFile(path, 'utf8') : '';
    const prefix = previous.length > 0 && !previous.endsWith('\n') ? '\n' : '';
    await handle.write(`${prefix}${formatMediaDecisionLine(line)}`);
  } finally {
    await handle.close();
  }
  return { line, asset };
}

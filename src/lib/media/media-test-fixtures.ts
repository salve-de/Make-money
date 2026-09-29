import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey, type MediaAssetKind, type MediaAssetManifest } from '../../shared/media-asset-schema';
import { appendMediaDecision, stagedFileName } from '../../shared/media-asset-store';

/** Test support: builds a staged entity (manifest.json + image files) the way scripts/media/fetch-official-assets.ts leaves it. */

export interface FixtureAsset {
  kind: MediaAssetKind;
  /** The image bytes; also decides the asset id. */
  bytes: Buffer;
  extension?: string;
  retrievedAt?: string;
  attribution?: string;
}

export function fixtureRecord(entityId: string, asset: FixtureAsset): MediaAssetManifest {
  const sha256 = createHash('sha256').update(asset.bytes).digest('hex');
  const extension = asset.extension ?? 'png';
  const rendered = asset.kind === 'screenshot_home' || asset.kind === 'screenshot_pricing';
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha256),
    entityId,
    kind: asset.kind,
    sourcePageUrl: 'https://www.keyence.co.jp/',
    assetUrl: rendered ? null : 'https://www.keyence.co.jp/asset',
    retrievedAt: asset.retrievedAt ?? '2026-09-29T00:38:11.808Z',
    capturedBy: 'media-fetch-20260929',
    sha256,
    bytes: asset.bytes.byteLength,
    contentType: extension === 'ico' ? 'image/vnd.microsoft.icon' : 'image/png',
    width: 152,
    height: 152,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: asset.attribution ?? `出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)`,
      decision: 'held',
      reviewedAt: null,
      notes: '自動取得。権利審査前のため held。',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey(entityId, sha256, extension), publicKey: null },
    subjectIsPerson: true,
  });
}

/** Write manifest.json and the image files of one entity under `root`; returns the records in order. */
export async function stageEntity(root: string, entityId: string, assets: readonly FixtureAsset[]): Promise<MediaAssetManifest[]> {
  const dir = join(root, entityId);
  await mkdir(dir, { recursive: true });
  const records = assets.map((asset) => fixtureRecord(entityId, asset));
  for (const [index, record] of records.entries()) await writeFile(join(dir, stagedFileName(record)), assets[index].bytes);
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(records, null, 2)}\n`);
  return records;
}

/** Record a review decision through the same path the CLI uses. */
export async function review(
  root: string,
  entityId: string,
  record: MediaAssetManifest,
  decision: 'allowed' | 'held' | 'blocked',
  overrides: { subjectIsPerson?: boolean; note?: string; reviewedAt?: string } = {},
): Promise<void> {
  await appendMediaDecision(
    entityId,
    {
      assetId: record.assetId,
      decision,
      subjectIsPerson: overrides.subjectIsPerson ?? decision !== 'allowed',
      reviewer: 'owner-delegated-2026-09-29',
      reviewedAt: overrides.reviewedAt ?? '2026-09-29T10:00:00.000Z',
      note: overrides.note ?? (decision === 'held' ? '' : '目視確認済み'),
    },
    { root },
  );
}

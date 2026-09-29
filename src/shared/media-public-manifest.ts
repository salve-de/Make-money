import { z } from 'zod';
import {
  MEDIA_ASSET_ID_PATTERN,
  MEDIA_ASSET_KINDS,
  MEDIA_ENTITY_ID_PATTERN,
  mediaAssetIdFromSha256,
  type MediaAssetKind,
} from './media-asset-schema';
import { isMediaDisplayable, type EffectiveMediaAsset } from './media-decisions';

/**
 * The public projection of one entity's media ledger, stored in foundation-public next to the
 * displayable images:
 *
 *   media/<entityId>/<sha256>.<ext>                     the image (same key as the original in foundation-raw)
 *   media/<entityId>/public-manifest.<stamp>.json       this file; the newest stamp is the current view
 *
 * It lists only assets whose effective decision is `allowed` with `subjectIsPerson === false`, and only
 * the fields the UI needs (no review notes, no reviewer names). It is create-only and versioned by
 * stamp, so a withdrawn image is expressed by a newer public manifest that no longer lists it.
 * foundation-public is a rebuildable projection: the ledger in foundation-raw stays the source of truth.
 *
 * Pure module: no I/O.
 */

export const PUBLIC_MEDIA_MANIFEST_SCHEMA = 'make-money-media-public-manifest.v1';
export const MEDIA_KEY_PREFIX = 'media/';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9][a-z0-9.+-]*$/;
const isoDateTime = z.iso.datetime({ offset: true });
const dimension = z.number().int().positive().max(100_000);

/** `YYYYMMDDTHHMMSSZ` in UTC; sorts like the time it names. */
export function mediaStamp(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) throw new Error(`not a date: ${iso}`);
  return new Date(time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Latest of the given ISO date-times, or null for none. */
export function latestInstant(values: readonly string[]): string | null {
  let best: string | null = null;
  for (const value of values) {
    if (best === null || Date.parse(value) > Date.parse(best)) best = value;
  }
  return best;
}

export const rawManifestKey = (entityId: string, stamp: string) => `${MEDIA_KEY_PREFIX}${entityId}/manifest.${stamp}.json`;
export const rawDecisionsKey = (entityId: string, stamp: string) => `${MEDIA_KEY_PREFIX}${entityId}/decisions.${stamp}.jsonl`;
export const publicManifestKey = (entityId: string, stamp: string) => `${MEDIA_KEY_PREFIX}${entityId}/public-manifest.${stamp}.json`;

const PUBLIC_MANIFEST_KEY_PATTERN = /^media\/(ent_[A-Za-z0-9_-]{1,124})\/public-manifest\.(\d{8}T\d{6}Z)\.json$/;

export function parsePublicManifestKey(key: string): { entityId: string; stamp: string } | null {
  const match = PUBLIC_MANIFEST_KEY_PATTERN.exec(key);
  return match ? { entityId: match[1], stamp: match[2] } : null;
}

export const PublicMediaManifestAssetSchema = z.strictObject({
  assetId: z.string().regex(MEDIA_ASSET_ID_PATTERN),
  kind: z.enum(MEDIA_ASSET_KINDS),
  /** Key of the image in foundation-public: media/<entityId>/<sha256>.<ext>. */
  key: z.string().min(1).max(512),
  sha256: z.string().regex(SHA256_PATTERN),
  bytes: z.number().int().positive(),
  contentType: z.string().regex(IMAGE_CONTENT_TYPE_PATTERN),
  width: dimension.nullable(),
  height: dimension.nullable(),
  attribution: z.string().min(1).max(500).regex(/\S/),
  sourcePageUrl: z.httpUrl(),
  retrievedAt: isoDateTime,
  reviewedAt: isoDateTime,
});

export const PublicMediaManifestSchema = z
  .strictObject({
    schema: z.literal(PUBLIC_MEDIA_MANIFEST_SCHEMA),
    entityId: z.string().max(128).regex(MEDIA_ENTITY_ID_PATTERN),
    /** Newest ledger event (capture or review) this view reflects. Not the wall clock, so re-running is idempotent. */
    asOf: isoDateTime,
    /** Where the complete ledger this view was projected from is kept (foundation-raw). */
    ledger: z.strictObject({
      manifestKey: z.string().min(1).max(512),
      decisionsKey: z.string().min(1).max(512).nullable(),
    }),
    assets: z.array(PublicMediaManifestAssetSchema).max(200),
  })
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    manifest.assets.forEach((asset, index) => {
      const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: ['assets', index, path], message });
      if (asset.assetId !== mediaAssetIdFromSha256(asset.sha256)) add('assetId', 'assetId must be "ma_" followed by the first 24 hex characters of sha256');
      const prefix = `${MEDIA_KEY_PREFIX}${manifest.entityId}/${asset.sha256}.`;
      if (!asset.key.startsWith(prefix) || !/^[a-z0-9]{1,8}$/.test(asset.key.slice(prefix.length))) add('key', 'key must be media/<entityId>/<sha256>.<ext> for this asset');
      if ((asset.width === null) !== (asset.height === null)) add('height', 'width and height must both be set or both be null');
      if (seen.has(asset.assetId)) add('assetId', 'duplicate assetId');
      seen.add(asset.assetId);
    });
  });

export type PublicMediaManifest = z.infer<typeof PublicMediaManifestSchema>;
export type PublicMediaManifestAsset = z.infer<typeof PublicMediaManifestAssetSchema>;

/**
 * Project the effective ledger of one entity to its public manifest: only displayable assets, only
 * public fields. `ledger` records where the complete ledger was stored.
 */
export function buildPublicMediaManifest(input: {
  entityId: string;
  assets: readonly EffectiveMediaAsset[];
  asOf: string;
  ledger: { manifestKey: string; decisionsKey: string | null };
}): PublicMediaManifest {
  const assets = input.assets.filter(isMediaDisplayable).map((asset): PublicMediaManifestAsset => {
    if (asset.rights.reviewedAt === null) throw new Error(`${asset.assetId} is allowed without reviewedAt`);
    return {
      assetId: asset.assetId,
      kind: asset.kind as MediaAssetKind,
      key: asset.storage.publicKey ?? asset.storage.key,
      sha256: asset.sha256,
      bytes: asset.bytes,
      contentType: asset.contentType,
      width: asset.width,
      height: asset.height,
      attribution: asset.rights.attribution,
      sourcePageUrl: asset.sourcePageUrl,
      retrievedAt: asset.retrievedAt,
      reviewedAt: asset.rights.reviewedAt,
    };
  });
  return PublicMediaManifestSchema.parse({
    schema: PUBLIC_MEDIA_MANIFEST_SCHEMA,
    entityId: input.entityId,
    asOf: input.asOf,
    ledger: input.ledger,
    assets,
  });
}

/** Canonical bytes of a public manifest (stable key order, trailing newline) so identical views have identical bytes. */
export function serializePublicMediaManifest(manifest: PublicMediaManifest): string {
  return `${JSON.stringify(PublicMediaManifestSchema.parse(manifest), null, 2)}\n`;
}

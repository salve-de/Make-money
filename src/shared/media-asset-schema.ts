import { z } from 'zod';

/**
 * Media asset provenance ledger (v1).
 *
 * One record describes one stored image (logo, favicon, OG image, screenshot,
 * product image, press-kit image, generated chart/illustration or open-licence
 * image) together with where it came from and on which rights basis it may be
 * shown. An entity's `manifest.json` is an array of these records.
 *
 * Fail-closed by design: an asset is displayable only when
 * `rights.decision === 'allowed'`, and the schema refuses `allowed` unless the
 * basis is known, a review is recorded and the subject is not a person.
 *
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md
 *
 * This module has no I/O and no hashing so that scripts, tests and a future
 * read path can share one contract.
 */

export const MEDIA_ASSET_KINDS = [
  'logo',
  'favicon',
  'og_image',
  'screenshot_home',
  'screenshot_pricing',
  'screenshot_product',
  'product_image',
  'press_kit',
  'generated_chart',
  'generated_illustration',
  'open_licence_image',
] as const;

export const MEDIA_RIGHTS_BASES = [
  'owned',
  'provider_press_terms',
  'official_marketing_material',
  'open_licence',
  'unknown',
] as const;

export const MEDIA_RIGHTS_DECISIONS = ['allowed', 'held', 'blocked'] as const;

export type MediaAssetKind = (typeof MEDIA_ASSET_KINDS)[number];
export type MediaRightsBasis = (typeof MEDIA_RIGHTS_BASES)[number];
export type MediaRightsDecision = (typeof MEDIA_RIGHTS_DECISIONS)[number];

/** `ma_` + the first 24 hex characters of the SHA-256 of the stored bytes. */
export const MEDIA_ASSET_ID_PATTERN = /^ma_[0-9a-f]{24}$/;
/** Entity ids come from data/entities-index.json (ASCII, `_` and `-`); never contain `/` or `.`. */
export const MEDIA_ENTITY_ID_PATTERN = /^ent_[A-Za-z0-9_-]+$/;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9][a-z0-9.+-]*$/;
const NOT_BLANK = /\S/;

/** Kinds we produce ourselves: no upstream URL, rights are always ours. */
const GENERATED_KINDS: ReadonlySet<MediaAssetKind> = new Set(['generated_chart', 'generated_illustration']);
/** Kinds rendered by our own browser: there is no asset URL to point at. */
const RENDERED_KINDS: ReadonlySet<MediaAssetKind> = new Set(['screenshot_home', 'screenshot_pricing']);
/** Kinds that are downloaded and therefore must say where from. */
const DOWNLOADED_KINDS: ReadonlySet<MediaAssetKind> = new Set(['og_image', 'press_kit', 'open_licence_image']);

export function mediaAssetIdFromSha256(sha256: string): string {
  return `ma_${sha256.slice(0, 24)}`;
}

/** Key of the immutable original in the raw bucket: media/<entityId>/<sha256>.<ext>. */
export function mediaRawKey(entityId: string, sha256: string, extension: string): string {
  return `media/${entityId}/${sha256}.${extension}`;
}

const isoDateTime = z.iso.datetime({ offset: true });
const dimension = z.number().int().positive().max(100_000);

export const MediaRightsSchema = z.strictObject({
  basis: z.enum(MEDIA_RIGHTS_BASES),
  /** Terms page that grants the use (press terms, brand guidelines). Required for `provider_press_terms`. */
  termsUrl: z.httpUrl().nullable(),
  /** Licence name and version, e.g. "CC BY 4.0". Required for `open_licence`. */
  licence: z.string().min(1).max(200).nullable(),
  /** Text shown with the asset. Always required, also while the asset is held. */
  attribution: z.string().min(1).max(500).regex(NOT_BLANK),
  decision: z.enum(MEDIA_RIGHTS_DECISIONS),
  /** When a human or a policy step recorded `decision`. Required for `allowed` and `blocked`. */
  reviewedAt: isoDateTime.nullable(),
  notes: z.string().max(2000),
});

export const MediaStorageSchema = z.strictObject({
  bucket: z.string().min(1).max(100),
  /** Planned/actual key of the original in `bucket`: media/<entityId>/<sha256>.<ext>. */
  key: z.string().min(1).max(512),
  /** Key of the public copy. May only be set when `rights.decision` is `allowed`. */
  publicKey: z.string().min(1).max(512).nullable(),
});

export const MediaAssetManifestSchema = z
  .strictObject({
    assetId: z.string().regex(MEDIA_ASSET_ID_PATTERN),
    entityId: z.string().max(128).regex(MEDIA_ENTITY_ID_PATTERN),
    kind: z.enum(MEDIA_ASSET_KINDS),
    /** Page the asset was found on or rendered from. */
    sourcePageUrl: z.httpUrl(),
    /** Direct URL of the file. `null` for assets that we rendered or generated ourselves. */
    assetUrl: z.httpUrl().nullable(),
    retrievedAt: isoDateTime,
    /** Run id of the capture job, e.g. `media-fetch-20260929`. */
    capturedBy: z.string().min(1).max(200),
    sha256: z.string().regex(SHA256_PATTERN),
    bytes: z.number().int().positive(),
    contentType: z.string().regex(IMAGE_CONTENT_TYPE_PATTERN),
    width: dimension.nullable(),
    height: dimension.nullable(),
    rights: MediaRightsSchema,
    storage: MediaStorageSchema,
    /**
     * True when a person is the subject of the picture; such assets can never be `allowed`.
     * Automated captures start as `true` (= not yet confirmed) and a reviewer sets `false` after looking at the image.
     */
    subjectIsPerson: z.boolean(),
  })
  .superRefine((record, ctx) => {
    const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const { rights, storage } = record;

    if (record.assetId !== mediaAssetIdFromSha256(record.sha256)) {
      add(['assetId'], 'assetId must be "ma_" followed by the first 24 hex characters of sha256');
    }
    if ((record.width === null) !== (record.height === null)) {
      add(['height'], 'width and height must both be set or both be null');
    }

    const keyPrefix = `media/${record.entityId}/${record.sha256}.`;
    if (!storage.key.startsWith(keyPrefix) || !/^[a-z0-9]{1,8}$/.test(storage.key.slice(keyPrefix.length))) {
      add(['storage', 'key'], 'storage.key must be media/<entityId>/<sha256>.<ext> for this record');
    }
    if (storage.publicKey !== null) {
      if (rights.decision !== 'allowed') add(['storage', 'publicKey'], 'publicKey may only be set when rights.decision is "allowed"');
      if (!storage.publicKey.startsWith(`media/${record.entityId}/`)) add(['storage', 'publicKey'], 'publicKey must live under media/<entityId>/');
    }

    // Source class <-> rights basis (owner decision 2026-09-29).
    const generated = GENERATED_KINDS.has(record.kind);
    if (generated && rights.basis !== 'owned') add(['rights', 'basis'], 'generated assets must have basis "owned"');
    if (!generated && rights.basis === 'owned') add(['rights', 'basis'], 'basis "owned" is only for generated_chart / generated_illustration');
    if (record.kind === 'press_kit' && rights.basis !== 'provider_press_terms' && rights.basis !== 'unknown') {
      add(['rights', 'basis'], 'press_kit assets must have basis "provider_press_terms" (or "unknown" while undecided)');
    }
    if (record.kind === 'open_licence_image' && rights.basis !== 'open_licence' && rights.basis !== 'unknown') {
      add(['rights', 'basis'], 'open_licence_image assets must have basis "open_licence" (or "unknown" while undecided)');
    }
    if ((generated || RENDERED_KINDS.has(record.kind)) && record.assetUrl !== null) {
      add(['assetUrl'], 'generated or rendered assets have no upstream assetUrl');
    }
    if (DOWNLOADED_KINDS.has(record.kind) && record.assetUrl === null) {
      add(['assetUrl'], `${record.kind} assets must record the URL they were downloaded from`);
    }

    // Evidence that each basis needs.
    if (rights.basis === 'open_licence' && rights.licence === null) add(['rights', 'licence'], 'basis "open_licence" needs the licence name and version');
    if (rights.basis === 'provider_press_terms' && rights.termsUrl === null) add(['rights', 'termsUrl'], 'basis "provider_press_terms" needs the press-terms URL');

    // Decisions.
    if (rights.decision === 'allowed') {
      if (record.subjectIsPerson) add(['subjectIsPerson'], 'an asset whose subject is a person can never be allowed');
      if (rights.basis === 'unknown') add(['rights', 'basis'], 'basis "unknown" cannot be allowed');
      if (rights.reviewedAt === null) add(['rights', 'reviewedAt'], 'an allowed decision needs reviewedAt');
    }
    if (rights.decision === 'blocked') {
      if (rights.reviewedAt === null) add(['rights', 'reviewedAt'], 'a blocked decision needs reviewedAt');
      if (!NOT_BLANK.test(rights.notes)) add(['rights', 'notes'], 'a blocked decision needs the reason in notes');
    }
  });

/** The `manifest.json` of one entity: an array of records with unique assetIds. */
export const MediaAssetManifestFileSchema = z.array(MediaAssetManifestSchema).superRefine((records, ctx) => {
  const seen = new Set<string>();
  records.forEach((record, index) => {
    if (seen.has(record.assetId)) ctx.addIssue({ code: 'custom', path: [index, 'assetId'], message: 'duplicate assetId in manifest' });
    seen.add(record.assetId);
    if (record.entityId !== records[0].entityId) ctx.addIssue({ code: 'custom', path: [index, 'entityId'], message: 'a manifest holds one entity only' });
  });
});

export type MediaAssetRights = z.infer<typeof MediaRightsSchema>;
export type MediaAssetStorage = z.infer<typeof MediaStorageSchema>;
export type MediaAssetManifest = z.infer<typeof MediaAssetManifestSchema>;
export type MediaAssetManifestFile = z.infer<typeof MediaAssetManifestFileSchema>;

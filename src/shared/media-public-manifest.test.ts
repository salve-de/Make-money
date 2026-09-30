import { describe, expect, it } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey } from './media-asset-schema';
import { composeEffectiveManifest, type MediaDecisionLine } from './media-decisions';
import {
  PUBLIC_MEDIA_MANIFEST_SCHEMA,
  PublicMediaManifestSchema,
  buildPublicMediaManifest,
  latestInstant,
  mediaStamp,
  parsePublicManifestKey,
  publicManifestKey,
  rawDecisionsKey,
  rawManifestKey,
  serializePublicMediaManifest,
} from './media-public-manifest';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function record(sha256: string, kind: 'favicon' | 'og_image', extension: string) {
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha256),
    entityId: 'ent_keyence',
    kind,
    sourcePageUrl: 'https://www.keyence.co.jp/',
    assetUrl: 'https://www.keyence.co.jp/asset',
    retrievedAt: '2026-09-29T00:38:11.808Z',
    capturedBy: 'media-fetch-20260929',
    sha256,
    bytes: 2048,
    contentType: extension === 'ico' ? 'image/vnd.microsoft.icon' : 'image/png',
    width: 152,
    height: 152,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
      decision: 'held',
      reviewedAt: null,
      notes: '内部メモ: 公開しない',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey('ent_keyence', sha256, extension), publicKey: null },
    subjectIsPerson: true,
  });
}

const allow = (sha256: string): MediaDecisionLine => ({
  assetId: mediaAssetIdFromSha256(sha256),
  decision: 'allowed',
  subjectIsPerson: false,
  reviewer: 'owner-delegated-2026-09-29',
  reviewedAt: '2026-09-29T10:00:00.000Z',
  note: '内部メモ: 目視確認の詳細',
});

describe('keys and stamps', () => {
  it('formats a sortable UTC stamp and builds the three object names of a ledger upload', () => {
    expect(mediaStamp('2026-09-29T00:38:11.808Z')).toBe('20260929T003811Z');
    expect(mediaStamp('2026-09-29T09:38:11+09:00')).toBe('20260929T003811Z');
    expect(() => mediaStamp('soon')).toThrow();
    expect(rawManifestKey('ent_keyence', '20260929T003811Z')).toBe('media/ent_keyence/manifest.20260929T003811Z.json');
    expect(rawDecisionsKey('ent_keyence', '20260929T100000Z')).toBe('media/ent_keyence/decisions.20260929T100000Z.jsonl');
    expect(publicManifestKey('ent_keyence', '20260929T100000Z')).toBe('media/ent_keyence/public-manifest.20260929T100000Z.json');
  });

  it('parses public manifest keys strictly', () => {
    expect(parsePublicManifestKey('media/ent_keyence/public-manifest.20260929T100000Z.json')).toEqual({ entityId: 'ent_keyence', stamp: '20260929T100000Z' });
    for (const bad of ['media/ent_keyence/manifest.20260929T100000Z.json', 'media/ent_keyence/public-manifest.2026.json', 'media/x/public-manifest.20260929T100000Z.json', 'media/ent_a/b/public-manifest.20260929T100000Z.json', 'other/ent_a/public-manifest.20260929T100000Z.json']) {
      expect(parsePublicManifestKey(bad)).toBeNull();
    }
  });

  it('finds the latest instant across offsets', () => {
    expect(latestInstant([])).toBeNull();
    // 09:30 at +09:00 is 00:30Z, later than 00:00Z.
    expect(latestInstant(['2026-09-29T00:00:00Z', '2026-09-29T09:30:00+09:00', '2026-09-28T23:00:00Z'])).toBe('2026-09-29T09:30:00+09:00');
    expect(latestInstant(['2026-09-29T00:30:00Z', '2026-09-29T09:00:00+09:00'])).toBe('2026-09-29T00:30:00Z');
  });
});

describe('buildPublicMediaManifest', () => {
  const ledger = { manifestKey: rawManifestKey('ent_keyence', '20260929T003811Z'), decisionsKey: rawDecisionsKey('ent_keyence', '20260929T100000Z') };

  it('lists only displayable assets and none of the internal review fields', () => {
    const favicon = record(SHA_A, 'favicon', 'ico');
    const og = record(SHA_B, 'og_image', 'png');
    const { assets } = composeEffectiveManifest([favicon, og], [allow(SHA_A)]);
    const manifest = buildPublicMediaManifest({ entityId: 'ent_keyence', assets, asOf: '2026-09-29T10:00:00.000Z', ledger });
    expect(manifest.schema).toBe(PUBLIC_MEDIA_MANIFEST_SCHEMA);
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0]).toMatchObject({ kind: 'favicon', key: `media/ent_keyence/${SHA_A}.ico`, contentType: 'image/vnd.microsoft.icon', reviewedAt: '2026-09-29T10:00:00.000Z' });
    const text = serializePublicMediaManifest(manifest);
    expect(text).not.toContain('内部メモ');
    expect(text).not.toContain('owner-delegated');
    expect(text).not.toContain(SHA_B);
    expect(PublicMediaManifestSchema.safeParse(JSON.parse(text)).success).toBe(true);
  });

  it('is an empty view, still valid, when nothing is displayable (for example after a takedown)', () => {
    const { assets } = composeEffectiveManifest([record(SHA_A, 'favicon', 'ico')], [allow(SHA_A), { ...allow(SHA_A), decision: 'blocked', note: '削除依頼', reviewedAt: '2026-09-29T11:00:00.000Z' }]);
    const manifest = buildPublicMediaManifest({ entityId: 'ent_keyence', assets, asOf: '2026-09-29T11:00:00.000Z', ledger });
    expect(manifest.assets).toEqual([]);
    expect(serializePublicMediaManifest(manifest)).toBe(serializePublicMediaManifest(manifest));
  });

  it('refuses a listing whose key, id or dimensions do not belong together', () => {
    const { assets } = composeEffectiveManifest([record(SHA_A, 'favicon', 'ico')], [allow(SHA_A)]);
    const good = buildPublicMediaManifest({ entityId: 'ent_keyence', assets, asOf: '2026-09-29T10:00:00.000Z', ledger });
    const tamper = (change: (asset: (typeof good.assets)[number]) => void) => {
      const copy = structuredClone(good);
      change(copy.assets[0]);
      return PublicMediaManifestSchema.safeParse(copy).success;
    };
    expect(tamper(() => undefined)).toBe(true);
    expect(tamper((asset) => { asset.key = `media/ent_other/${SHA_A}.ico`; })).toBe(false);
    expect(tamper((asset) => { asset.key = `media/ent_keyence/${SHA_B}.ico`; })).toBe(false);
    expect(tamper((asset) => { asset.assetId = mediaAssetIdFromSha256(SHA_B); })).toBe(false);
    expect(tamper((asset) => { asset.height = null; })).toBe(false);
    expect(PublicMediaManifestSchema.safeParse({ ...good, extra: true }).success).toBe(false);
    expect(PublicMediaManifestSchema.safeParse({ ...good, assets: [good.assets[0], good.assets[0]] }).success).toBe(false);
  });
});

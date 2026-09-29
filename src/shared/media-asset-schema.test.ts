import { describe, expect, it } from 'vitest';
import {
  MediaAssetManifestFileSchema,
  MediaAssetManifestSchema,
  mediaAssetIdFromSha256,
  mediaRawKey,
} from './media-asset-schema';

const SHA256 = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

/** A record exactly as the fetcher writes it: an official screenshot, held, person flag not yet confirmed. */
function freshCapture() {
  return {
    assetId: mediaAssetIdFromSha256(SHA256),
    entityId: 'ent_photoai',
    kind: 'screenshot_home',
    sourcePageUrl: 'https://photoai.com/',
    assetUrl: null as string | null,
    retrievedAt: '2026-09-29T00:12:34.000Z',
    capturedBy: 'media-fetch-20260929',
    sha256: SHA256,
    bytes: 123456,
    contentType: 'image/png',
    width: 1280,
    height: 800,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null as string | null,
      licence: null as string | null,
      attribution: '出典: Photo AI 公式サイト (https://photoai.com/)',
      decision: 'held',
      reviewedAt: null as string | null,
      notes: '自動取得。権利審査前のため held。',
    },
    storage: {
      bucket: 'foundation-raw',
      key: mediaRawKey('ent_photoai', SHA256, 'png'),
      publicKey: null as string | null,
    },
    subjectIsPerson: true,
  };
}

function issuePaths(input: unknown): string[] {
  const result = MediaAssetManifestSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('MediaAssetManifestSchema', () => {
  it('accepts a freshly captured, held official screenshot', () => {
    const parsed = MediaAssetManifestSchema.parse(freshCapture());
    expect(parsed.assetId).toBe('ma_9f86d081884c7d659a2feaa0');
    expect(parsed.rights.decision).toBe('held');
    expect(parsed.storage.publicKey).toBeNull();
  });

  it('refuses to allow an unreviewed capture whose person flag is still unconfirmed', () => {
    const record = freshCapture();
    record.rights.decision = 'allowed';
    expect(issuePaths(record).sort()).toEqual(['rights.reviewedAt', 'subjectIsPerson']);

    record.rights.reviewedAt = '2026-09-29T02:00:00Z';
    record.rights.basis = 'unknown';
    expect(issuePaths(record).sort()).toEqual(['rights.basis', 'subjectIsPerson']);
  });

  it('rejects an id that does not match the hash, a foreign storage key and a public copy of a held asset', () => {
    const record = freshCapture();
    record.assetId = 'ma_000000000000000000000000';
    record.storage.key = 'media/ent_other/whatever.png';
    record.storage.publicKey = 'media/ent_photoai/ma_9f86d081884c7d659a2feaa0.png';

    const paths = issuePaths(record);
    expect(paths).toContain('assetId');
    expect(paths).toContain('storage.key');
    expect(paths).toContain('storage.publicKey');
  });

  it('rejects unknown keys so that typos in the rights block cannot pass silently', () => {
    const record = freshCapture();
    (record.rights as Record<string, unknown>).decison = 'allowed';
    expect(issuePaths(record)).toContain('rights');
  });

  it('allows an official screenshot once a reviewer has confirmed that no person is the subject', () => {
    const record = freshCapture();
    record.subjectIsPerson = false;
    record.rights.decision = 'allowed';
    record.rights.reviewedAt = '2026-09-29T11:00:00+09:00';
    record.storage.publicKey = 'media/ent_photoai/ma_9f86d081884c7d659a2feaa0.png';
    expect(MediaAssetManifestSchema.safeParse(record).success).toBe(true);

    record.subjectIsPerson = true;
    expect(issuePaths(record)).toEqual(['subjectIsPerson']);
  });

  it('couples generated assets to basis "owned" and to having no upstream URL', () => {
    const chart = freshCapture();
    chart.kind = 'generated_chart';
    chart.subjectIsPerson = false;
    expect(issuePaths(chart)).toEqual(['rights.basis']);

    chart.rights.basis = 'owned';
    expect(MediaAssetManifestSchema.safeParse(chart).success).toBe(true);

    chart.assetUrl = 'https://cdn.example/chart.png';
    expect(issuePaths(chart)).toEqual(['assetUrl']);

    const screenshot = freshCapture();
    screenshot.rights.basis = 'owned';
    expect(issuePaths(screenshot)).toEqual(['rights.basis']);
  });

  it('requires a reason for blocked assets and the evidence that each basis needs', () => {
    const blocked = freshCapture();
    blocked.rights.decision = 'blocked';
    blocked.rights.reviewedAt = '2026-09-29T02:00:00Z';
    blocked.rights.notes = '';
    expect(issuePaths(blocked)).toEqual(['rights.notes']);

    const press = freshCapture();
    press.kind = 'press_kit';
    press.assetUrl = 'https://photoai.com/press/logo.png';
    press.rights.basis = 'provider_press_terms';
    expect(issuePaths(press)).toEqual(['rights.termsUrl']);

    const open = freshCapture();
    open.kind = 'open_licence_image';
    open.assetUrl = 'https://upload.example/a.jpg';
    open.rights.basis = 'open_licence';
    expect(issuePaths(open)).toEqual(['rights.licence']);
  });
});

describe('MediaAssetManifestFileSchema', () => {
  it('rejects duplicate assetIds and mixed entities in one manifest.json', () => {
    const a = freshCapture();
    expect(MediaAssetManifestFileSchema.safeParse([a]).success).toBe(true);
    expect(MediaAssetManifestFileSchema.safeParse([a, freshCapture()]).success).toBe(false);

    const otherSha = 'b'.repeat(64);
    const b = freshCapture();
    b.entityId = 'ent_keyence';
    b.assetId = mediaAssetIdFromSha256(otherSha);
    b.sha256 = otherSha;
    b.storage.key = mediaRawKey('ent_keyence', otherSha, 'png');

    const mixed = MediaAssetManifestFileSchema.safeParse([a, b]);
    expect(mixed.success).toBe(false);
    expect(mixed.success ? [] : mixed.error.issues.map((issue) => issue.path.join('.'))).toContain('1.entityId');
  });
});

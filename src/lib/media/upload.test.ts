import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey, type MediaAssetManifest } from '../../shared/media-asset-schema';
import { appendMediaDecision, stagedFileName } from '../../shared/media-asset-store';
import { PublicMediaManifestSchema } from '../../shared/media-public-manifest';
import { buildUploadPlan, executeUpload, formatUploadReport, type MediaObjectStore, type UploadPlan } from './upload';

const ENTITY = 'ent_keyence';
const BUCKETS = { raw: 'foundation-raw', public: 'foundation-public' };
const FAVICON = Buffer.from('favicon-bytes-ico');
const OG = Buffer.from('og-image-bytes-png');
const SHOT = Buffer.from('home-screenshot-bytes-png');

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-upload-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function record(bytes: Buffer, kind: 'favicon' | 'og_image' | 'screenshot_home', extension: string, retrievedAt: string): MediaAssetManifest {
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha(bytes)),
    entityId: ENTITY,
    kind,
    sourcePageUrl: 'https://www.keyence.co.jp/',
    assetUrl: kind === 'screenshot_home' ? null : 'https://www.keyence.co.jp/asset',
    retrievedAt,
    capturedBy: 'media-fetch-20260929',
    sha256: sha(bytes),
    bytes: bytes.byteLength,
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
      notes: '自動取得。',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey(ENTITY, sha(bytes), extension), publicKey: null },
    subjectIsPerson: true,
  });
}

const RECORDS = [
  record(SHOT, 'screenshot_home', 'png', '2026-09-29T00:38:11.808Z'),
  record(FAVICON, 'favicon', 'ico', '2026-09-29T00:38:11.896Z'),
  record(OG, 'og_image', 'png', '2026-09-29T00:38:11.981Z'),
];
const [SHOT_RECORD, FAVICON_RECORD, OG_RECORD] = RECORDS;

async function stage(withFiles = true): Promise<string> {
  const dir = join(root, ENTITY);
  await mkdir(dir, { recursive: true });
  if (withFiles) {
    for (const [item, bytes] of [[SHOT_RECORD, SHOT], [FAVICON_RECORD, FAVICON], [OG_RECORD, OG]] as const) await writeFile(join(dir, stagedFileName(item)), bytes);
  }
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(RECORDS, null, 2)}\n`);
  return dir;
}

const review = (assetId: string, overrides: Record<string, unknown> = {}) => ({
  assetId,
  decision: 'allowed' as const,
  subjectIsPerson: false,
  reviewer: 'owner-delegated-2026-09-29',
  reviewedAt: '2026-09-29T10:00:00.000Z',
  note: '目視: 人物・バナーなし',
  ...overrides,
});

class MemoryStore implements MediaObjectStore {
  readonly objects = new Map<string, Uint8Array>();
  readonly puts: string[] = [];
  ready = true;
  corruptReadback = false;
  async assertReady() {
    if (!this.ready) throw new Error('R2 credentials are not configured');
  }
  async putCreateOnly({ bucket, key, body }: { bucket: string; key: string; body: Uint8Array }) {
    this.puts.push(`${bucket}/${key}`);
    const id = `${bucket}/${key}`;
    const existing = this.objects.get(id);
    if (existing) return Buffer.compare(Buffer.from(existing), Buffer.from(body)) === 0 ? ('identical' as const) : ('conflict' as const);
    this.objects.set(id, body);
    return 'created' as const;
  }
  async read(bucket: string, key: string) {
    const stored = this.objects.get(`${bucket}/${key}`) ?? null;
    return stored && this.corruptReadback ? new Uint8Array([...stored].reverse()) : stored;
  }
}

async function plan(): Promise<UploadPlan> {
  return buildUploadPlan(ENTITY, BUCKETS, { root });
}

describe('buildUploadPlan', () => {
  it('archives every asset in foundation-raw and publishes only the displayable one, under the same key', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    await appendMediaDecision(ENTITY, review(OG_RECORD.assetId, { decision: 'blocked', subjectIsPerson: true, note: '人物コラージュ', reviewedAt: '2026-09-29T10:05:00.000Z' }), { root });

    const built = await plan();
    expect(built.problems).toEqual([]);
    const summary = built.objects.map((object) => `${object.kind} ${object.bucket} ${object.key}`);
    expect(summary).toEqual([
      `raw_asset foundation-raw ${SHOT_RECORD.storage.key}`,
      `raw_asset foundation-raw ${FAVICON_RECORD.storage.key}`,
      `raw_asset foundation-raw ${OG_RECORD.storage.key}`,
      'raw_manifest foundation-raw media/ent_keyence/manifest.20260929T003811Z.json',
      'raw_decisions foundation-raw media/ent_keyence/decisions.20260929T100500Z.jsonl',
      `public_asset foundation-public ${FAVICON_RECORD.storage.key}`,
      'public_manifest foundation-public media/ent_keyence/public-manifest.20260929T100500Z.json',
    ]);
    expect(built.displayable).toEqual([FAVICON_RECORD.assetId]);
    expect(built.withheld.map((item) => [item.assetId, item.decision])).toEqual([[SHOT_RECORD.assetId, 'held'], [OG_RECORD.assetId, 'blocked']]);

    const publicManifest = built.objects.find((object) => object.kind === 'public_manifest')!;
    const parsed = PublicMediaManifestSchema.parse(JSON.parse(Buffer.from(publicManifest.body).toString('utf8')));
    expect(parsed.assets.map((asset) => asset.assetId)).toEqual([FAVICON_RECORD.assetId]);
    expect(parsed.asOf).toBe('2026-09-29T10:05:00.000Z');
    expect(parsed.ledger).toEqual({
      manifestKey: 'media/ent_keyence/manifest.20260929T003811Z.json',
      decisionsKey: 'media/ent_keyence/decisions.20260929T100500Z.jsonl',
    });
    expect(Buffer.from(publicManifest.body).toString('utf8')).not.toContain('人物コラージュ');
  });

  it('uploads the manifest and decision log byte for byte', async () => {
    const dir = await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const built = await plan();
    const { readFile } = await import('node:fs/promises');
    expect(Buffer.from(built.objects.find((o) => o.kind === 'raw_manifest')!.body)).toEqual(await readFile(join(dir, 'manifest.json')));
    expect(Buffer.from(built.objects.find((o) => o.kind === 'raw_decisions')!.body)).toEqual(await readFile(join(dir, 'decisions.jsonl')));
  });

  it('without any decision nothing is public, and no decision log is uploaded', async () => {
    await stage();
    const built = await plan();
    expect(built.objects.map((object) => object.kind)).toEqual(['raw_asset', 'raw_asset', 'raw_asset', 'raw_manifest', 'public_manifest']);
    expect(built.displayable).toEqual([]);
    const publicManifest = JSON.parse(Buffer.from(built.objects.at(-1)!.body).toString('utf8'));
    expect(publicManifest.assets).toEqual([]);
    expect(publicManifest.asOf).toBe('2026-09-29T00:38:11.981Z');
  });

  it('stops the whole plan when an allowed asset cannot be verified, but only warns for a withheld one', async () => {
    const dir = await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    await unlink(join(dir, stagedFileName(SHOT_RECORD)));
    const warned = await plan();
    expect(warned.problems).toEqual([]);
    expect(warned.warnings.join('\n')).toMatch(new RegExp(`${SHOT_RECORD.assetId} \\(held\\) was not archived`));
    expect(warned.objects.filter((object) => object.kind === 'raw_asset')).toHaveLength(2);

    await writeFile(join(dir, stagedFileName(FAVICON_RECORD)), Buffer.from('tampered'));
    const stopped = await plan();
    expect(stopped.problems.join('\n')).toMatch(new RegExp(`${FAVICON_RECORD.assetId} is allowed but its staged file cannot be used`));
    expect(stopped.objects.some((object) => object.kind === 'public_manifest')).toBe(false);
  });

  it('reports a missing or corrupt ledger instead of guessing', async () => {
    expect((await plan()).problems[0]).toMatch(/no manifest\.json/);
    const dir = await stage();
    await writeFile(join(dir, 'decisions.jsonl'), '{broken');
    expect((await plan()).problems[0]).toMatch(/decisions\.jsonl line 1 is not JSON/);
    await writeFile(join(dir, 'manifest.json'), '[{"nope":1}]');
    expect((await plan()).problems[0]).toMatch(/manifest\.json of ent_keyence is not valid/);
  });
});

describe('executeUpload', () => {
  it('writes raw first, then the public copy, then the public manifest, reading every object back', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const store = new MemoryStore();
    const report = await executeUpload(await plan(), store, { dryRun: false });
    expect(report.ok).toBe(true);
    expect(report.objects.every((object) => object.status === 'created' && object.verified)).toBe(true);
    expect(store.puts.at(-1)).toBe('foundation-public/media/ent_keyence/public-manifest.20260929T100000Z.json');
    expect(store.puts.indexOf(`foundation-public/${FAVICON_RECORD.storage.key}`)).toBeGreaterThan(store.puts.indexOf('foundation-raw/media/ent_keyence/decisions.20260929T100000Z.jsonl'));
    // Only the displayable asset (plus the public manifest) reached the public bucket.
    expect([...store.objects.keys()].filter((id) => id.startsWith('foundation-public/'))).toEqual([
      `foundation-public/${FAVICON_RECORD.storage.key}`,
      'foundation-public/media/ent_keyence/public-manifest.20260929T100000Z.json',
    ]);
    expect([...store.objects.keys()].filter((id) => id.startsWith('foundation-raw/'))).toHaveLength(5);
    expect(formatUploadReport(report).join('\n')).toMatch(/read-back OK/);
  });

  it('is idempotent: a second run finds identical objects and writes nothing new', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const store = new MemoryStore();
    await executeUpload(await plan(), store, { dryRun: false });
    const second = await executeUpload(await plan(), store, { dryRun: false });
    expect(second.ok).toBe(true);
    expect(second.objects.every((object) => object.status === 'identical' && object.verified)).toBe(true);
    expect(store.objects.size).toBe(7);
  });

  it('reports a conflict without overwriting, and then publishes nothing', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const store = new MemoryStore();
    store.objects.set('foundation-raw/media/ent_keyence/manifest.20260929T003811Z.json', new TextEncoder().encode('someone else wrote this'));
    const report = await executeUpload(await plan(), store, { dryRun: false });
    expect(report.ok).toBe(false);
    expect(report.objects.find((object) => object.kind === 'raw_manifest')?.status).toBe('conflict');
    expect(report.objects.filter((object) => object.kind.startsWith('public')).every((object) => object.status === 'skipped')).toBe(true);
    expect([...store.objects.keys()].some((id) => id.startsWith('foundation-public/'))).toBe(false);
    expect(new TextDecoder().decode(store.objects.get('foundation-raw/media/ent_keyence/manifest.20260929T003811Z.json'))).toBe('someone else wrote this');
  });

  it('does not count an object as stored when the read-back differs', async () => {
    await stage();
    const store = new MemoryStore();
    store.corruptReadback = true;
    const report = await executeUpload(await plan(), store, { dryRun: false });
    expect(report.ok).toBe(false);
    expect(report.objects.some((object) => object.status === 'error' && /read-back does not match/.test(object.detail ?? ''))).toBe(true);
    expect(report.objects.every((object) => !object.verified)).toBe(true);
  });

  it('fails before the first write when the store is not ready (no silent local fallback)', async () => {
    await stage();
    const store = new MemoryStore();
    store.ready = false;
    await expect(executeUpload(await plan(), store, { dryRun: false })).rejects.toThrow(/R2 credentials are not configured/);
    expect(store.puts).toEqual([]);
  });

  it('a dry run never touches the store, and says so', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const store: MediaObjectStore = { assertReady: vi.fn(), putCreateOnly: vi.fn(), read: vi.fn() };
    const report = await executeUpload(await plan(), store, { dryRun: true });
    expect(report.ok).toBe(true);
    expect(report.objects.every((object) => object.status === 'planned')).toBe(true);
    expect(store.assertReady).not.toHaveBeenCalled();
    expect(store.putCreateOnly).not.toHaveBeenCalled();
    expect(store.read).not.toHaveBeenCalled();
    expect(formatUploadReport(report).join('\n')).toMatch(/dry run, nothing was read from or written to R2/);
  });

  it('does not write anything when the plan has problems', async () => {
    const dir = await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    await writeFile(join(dir, stagedFileName(FAVICON_RECORD)), Buffer.from('tampered'));
    const store = new MemoryStore();
    const report = await executeUpload(await plan(), store, { dryRun: false });
    expect(report.ok).toBe(false);
    expect(store.puts).toEqual([]);
    expect(formatUploadReport(report).join('\n')).toMatch(/PROBLEM/);
  });
});

describe('takedown by a new decision', () => {
  it('publishes a newer, empty public manifest and never deletes the earlier objects', async () => {
    await stage();
    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId), { root });
    const store = new MemoryStore();
    await executeUpload(await plan(), store, { dryRun: false });

    await appendMediaDecision(ENTITY, review(FAVICON_RECORD.assetId, { decision: 'blocked', note: '権利者から削除依頼', reviewedAt: '2026-09-29T12:00:00.000Z' }), { root });
    const second = await executeUpload(await plan(), store, { dryRun: false });
    expect(second.ok).toBe(true);
    expect(second.displayable).toEqual([]);

    const manifests = [...store.objects.keys()].filter((id) => /public-manifest/.test(id)).sort();
    expect(manifests).toEqual([
      'foundation-public/media/ent_keyence/public-manifest.20260929T100000Z.json',
      'foundation-public/media/ent_keyence/public-manifest.20260929T120000Z.json',
    ]);
    expect(JSON.parse(new TextDecoder().decode(store.objects.get(manifests[1])!)).assets).toEqual([]);
    // Removing the public copy itself is a deliberate manual step; the uploader never deletes.
    expect(store.objects.has(`foundation-public/${FAVICON_RECORD.storage.key}`)).toBe(true);
  });
});

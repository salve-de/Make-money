import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey } from '../../shared/media-asset-schema';
import { appendMediaDecision, stagedFileName } from '../../shared/media-asset-store';
import { parseUploadArgs, runUpload } from './upload-cli';
import type { MediaObjectStore } from './upload';

const ENTITY = 'ent_photoai';
const BYTES = Buffer.from('pricing-screenshot-bytes');
const SHA = createHash('sha256').update(BYTES).digest('hex');
const BUCKETS = { raw: 'foundation-raw', public: 'foundation-public' };

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-upload-cli-'));
  const record = MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(SHA),
    entityId: ENTITY,
    kind: 'screenshot_pricing',
    sourcePageUrl: 'https://photoai.com/pricing',
    assetUrl: null,
    retrievedAt: '2026-09-29T00:38:03.000Z',
    capturedBy: 'media-fetch-20260929',
    sha256: SHA,
    bytes: BYTES.byteLength,
    contentType: 'image/png',
    width: 1280,
    height: 800,
    rights: { basis: 'official_marketing_material', termsUrl: null, licence: null, attribution: '出典: Photo AI 公式サイト (https://photoai.com/pricing)', decision: 'held', reviewedAt: null, notes: '自動取得。' },
    storage: { bucket: 'foundation-raw', key: mediaRawKey(ENTITY, SHA, 'png'), publicKey: null },
    subjectIsPerson: true,
  });
  const dir = join(root, ENTITY);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, stagedFileName(record)), BYTES);
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify([record], null, 2)}\n`);
  await appendMediaDecision(ENTITY, { assetId: record.assetId, decision: 'allowed', subjectIsPerson: false, reviewer: 'owner-delegated-2026-09-29', reviewedAt: '2026-09-29T10:00:00.000Z', note: '料金表のみ' }, { root });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const deps = (store: MediaObjectStore) => {
  const lines: string[] = [];
  const createStore = vi.fn(() => store);
  return { lines, createStore, value: { createStore, buckets: BUCKETS, log: (line: string) => lines.push(line), now: () => new Date('2026-09-29T13:00:00.000Z') } };
};

const memoryStore = (): MediaObjectStore & { objects: Map<string, Uint8Array> } => {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    assertReady: async () => undefined,
    putCreateOnly: async ({ bucket, key, body }) => {
      if (objects.has(`${bucket}/${key}`)) return 'identical';
      objects.set(`${bucket}/${key}`, body);
      return 'created';
    },
    read: async (bucket, key) => objects.get(`${bucket}/${key}`) ?? null,
  };
};

describe('parseUploadArgs', () => {
  it('reads one or several entities and the dry-run flag', () => {
    expect(parseUploadArgs(['--entity', 'ent_a,ent_b', '--entity=ent_a', '--dry-run'], root)).toMatchObject({ entities: ['ent_a', 'ent_b'], dryRun: true, out: root });
    expect(parseUploadArgs(['--entity', 'ent_a'], root).dryRun).toBe(false);
    expect(parseUploadArgs(['--help'], root).help).toBe(true);
  });

  it('rejects missing, malformed and unknown arguments', () => {
    expect(() => parseUploadArgs([], root)).toThrow(/--entity is required/);
    expect(() => parseUploadArgs(['--entity', '../x'], root)).toThrow(/Invalid entity id/);
    expect(() => parseUploadArgs(['--entity', 'ent_a', '--all'], root)).toThrow(/Unknown argument/);
  });
});

describe('runUpload', () => {
  it('a dry run prints the plan, creates no store and writes no receipt', async () => {
    const d = deps(memoryStore());
    const code = await runUpload(parseUploadArgs(['--entity', ENTITY, '--dry-run'], root), d.value);
    expect(code).toBe(0);
    expect(d.createStore).not.toHaveBeenCalled();
    const text = d.lines.join('\n');
    expect(text).toMatch(/DRY RUN\. R2 is not read or written/);
    expect(text).toMatch(/PLANNED\s+public_asset\s+foundation-public\/media\/ent_photoai\//);
    expect(text).toMatch(/to write: node scripts\/with-r2-keychain-secrets\.mjs node --import tsx scripts\/media\/upload-media-assets\.ts --entity ent_photoai/);
    expect((await readdir(root)).filter((name) => name.startsWith('upload-'))).toEqual([]);
  });

  it('a real run writes through the store and leaves a receipt without object bodies', async () => {
    const store = memoryStore();
    const d = deps(store);
    const code = await runUpload(parseUploadArgs(['--entity', ENTITY], root), d.value);
    expect(code).toBe(0);
    expect(store.objects.size).toBe(5);
    const receiptName = (await readdir(root)).find((name) => name.startsWith('upload-'));
    expect(receiptName).toBe('upload-20260929T130000Z.json');
    const receipt = JSON.parse(await readFile(join(root, receiptName as string), 'utf8'));
    expect(receipt).toMatchObject({ schema: 'media-upload-run.v1', ok: true });
    expect(receipt.reports[0].objects).toHaveLength(5);
    expect(JSON.stringify(receipt)).not.toContain('body');
  });

  it('fails without writing anything when the store is not ready, and reports a failing entity in the exit code', async () => {
    const store = memoryStore();
    store.assertReady = async () => {
      throw new Error('R2 credentials are not configured');
    };
    await expect(runUpload(parseUploadArgs(['--entity', ENTITY], root), deps(store).value)).rejects.toThrow(/R2 credentials are not configured/);
    expect(store.objects.size).toBe(0);

    const d = deps(memoryStore());
    expect(await runUpload(parseUploadArgs(['--entity', 'ent_nobody', '--dry-run'], root), d.value)).toBe(1);
    expect(d.lines.join('\n')).toMatch(/PROBLEM.*no manifest\.json/);
  });
});

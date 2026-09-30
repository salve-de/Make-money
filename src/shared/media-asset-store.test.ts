import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey, type MediaAssetManifest } from './media-asset-schema';
import {
  appendMediaDecision,
  listStagedEntityIds,
  readEffectiveManifest,
  readMediaDecisions,
  readStagedAsset,
  stagedFileName,
} from './media-asset-store';
import { MediaLedgerError, isMediaDisplayable, type MediaDecisionLine } from './media-decisions';

const ENTITY = 'ent_keyence';
// 1x1 transparent PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-store-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function recordFor(bytes: Buffer, overrides: { kind?: 'favicon' | 'og_image'; basis?: 'official_marketing_material' | 'unknown' } = {}): MediaAssetManifest {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha256),
    entityId: ENTITY,
    kind: overrides.kind ?? 'favicon',
    sourcePageUrl: 'https://www.keyence.co.jp/',
    assetUrl: 'https://www.keyence.co.jp/favicon.png',
    retrievedAt: '2026-09-29T00:38:11.808Z',
    capturedBy: 'media-fetch-20260929',
    sha256,
    bytes: bytes.byteLength,
    contentType: 'image/png',
    width: 1,
    height: 1,
    rights: {
      basis: overrides.basis ?? 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
      decision: 'held',
      reviewedAt: null,
      notes: '自動取得。権利審査前のため held。',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey(ENTITY, sha256, 'png'), publicKey: null },
    subjectIsPerson: true,
  });
}

async function stage(records: { record: MediaAssetManifest; bytes: Buffer | null }[], entityId = ENTITY): Promise<string> {
  const dir = join(root, entityId);
  await mkdir(dir, { recursive: true });
  for (const { record, bytes } of records) if (bytes) await writeFile(join(dir, stagedFileName(record)), bytes);
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(records.map(({ record }) => record), null, 2)}\n`);
  return dir;
}

function allow(record: MediaAssetManifest, overrides: Partial<MediaDecisionLine> = {}): MediaDecisionLine {
  return {
    assetId: record.assetId,
    decision: 'allowed',
    subjectIsPerson: false,
    reviewer: 'owner-delegated-2026-09-29',
    reviewedAt: '2026-09-29T10:00:00.000Z',
    note: '目視: 人物・バナーなし',
    ...overrides,
  };
}

describe('readEffectiveManifest', () => {
  it('returns null for an entity without a manifest and refuses ids that are not ledger ids', async () => {
    expect(await readEffectiveManifest(ENTITY, { root })).toBeNull();
    for (const bad of ['../etc', 'ent_a/b', 'ent_a.b', 'keyence', '', `ent_${'x'.repeat(200)}`]) {
      await expect(readEffectiveManifest(bad, { root })).rejects.toMatchObject({ code: 'INVALID_ENTITY_ID' });
    }
  });

  it('is the manifest with decisions.jsonl applied', async () => {
    const favicon = recordFor(PNG);
    const og = recordFor(Buffer.concat([PNG, Buffer.from('x')]), { kind: 'og_image' });
    const dir = await stage([{ record: favicon, bytes: PNG }, { record: og, bytes: null }]);
    await writeFile(join(dir, 'decisions.jsonl'), `${JSON.stringify(allow(favicon))}\n`);
    const effective = await readEffectiveManifest(ENTITY, { root });
    expect(effective?.decisionCount).toBe(1);
    expect(effective?.assets.map((asset) => [asset.kind, asset.rights.decision, isMediaDisplayable(asset)])).toEqual([
      ['favicon', 'allowed', true],
      ['og_image', 'held', false],
    ]);
  });

  it('throws instead of guessing when manifest.json or decisions.jsonl cannot be trusted', async () => {
    const record = recordFor(PNG);
    const dir = await stage([{ record, bytes: PNG }]);
    await writeFile(join(dir, 'decisions.jsonl'), `${JSON.stringify(allow(record))}\n{"assetId":"ma_${'0'.repeat(24)}","decis`);
    await expect(readEffectiveManifest(ENTITY, { root })).rejects.toMatchObject({ code: 'DECISIONS_INVALID' });

    await writeFile(join(dir, 'decisions.jsonl'), '');
    await writeFile(join(dir, 'manifest.json'), '{not json');
    await expect(readEffectiveManifest(ENTITY, { root })).rejects.toMatchObject({ code: 'MANIFEST_INVALID' });

    const other = { ...record, entityId: 'ent_photoai' };
    await writeFile(join(dir, 'manifest.json'), JSON.stringify([other]));
    await expect(readEffectiveManifest(ENTITY, { root })).rejects.toBeInstanceOf(MediaLedgerError);
  });
});

describe('appendMediaDecision', () => {
  it('appends a line, leaves manifest.json byte for byte unchanged and makes the asset displayable', async () => {
    const record = recordFor(PNG);
    const dir = await stage([{ record, bytes: PNG }]);
    const manifestBefore = await readFile(join(dir, 'manifest.json'));

    const result = await appendMediaDecision(ENTITY, allow(record), { root });
    expect(result.asset.rights.decision).toBe('allowed');
    expect(await readFile(join(dir, 'manifest.json'))).toEqual(manifestBefore);
    expect((await readFile(join(dir, 'decisions.jsonl'), 'utf8')).trimEnd().split('\n')).toHaveLength(1);

    const effective = await readEffectiveManifest(ENTITY, { root });
    expect(isMediaDisplayable(effective!.assets[0])).toBe(true);

    await appendMediaDecision(ENTITY, allow(record, { decision: 'blocked', subjectIsPerson: true, note: '削除依頼', reviewedAt: '2026-09-29T11:00:00.000Z' }), { root });
    expect(await readMediaDecisions(ENTITY, { root })).toHaveLength(2);
    expect(isMediaDisplayable((await readEffectiveManifest(ENTITY, { root }))!.assets[0])).toBe(false);
  });

  it('refuses to allow bytes that are missing or differ from the recorded sha256', async () => {
    const record = recordFor(PNG);
    const dir = await stage([{ record, bytes: null }]);
    await expect(appendMediaDecision(ENTITY, allow(record), { root })).rejects.toMatchObject({ code: 'FILE_MISSING' });

    await writeFile(join(dir, stagedFileName(record)), Buffer.concat([PNG.subarray(0, PNG.byteLength - 1), Buffer.from([0])]));
    await expect(appendMediaDecision(ENTITY, allow(record), { root })).rejects.toMatchObject({ code: 'FILE_MISMATCH' });
    await expect(readMediaDecisions(ENTITY, { root })).resolves.toEqual([]);

    // Not looking at the bytes is fine for a block: it only ever removes.
    await appendMediaDecision(ENTITY, allow(record, { decision: 'blocked', subjectIsPerson: true, note: 'ファイル不整合' }), { root });
  });

  it('refuses decisions the ledger schema would not accept and unknown assets', async () => {
    const unknownBasis = recordFor(PNG, { basis: 'unknown' });
    await stage([{ record: unknownBasis, bytes: PNG }]);
    await expect(appendMediaDecision(ENTITY, allow(unknownBasis), { root })).rejects.toMatchObject({ code: 'DECISION_REJECTED' });
    await expect(appendMediaDecision(ENTITY, allow({ ...unknownBasis, assetId: 'ma_' + '1'.repeat(24) }), { root })).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
    await expect(appendMediaDecision(ENTITY, allow(unknownBasis, { subjectIsPerson: true }), { root })).rejects.toThrow(/invalid decision: subjectIsPerson: an asset whose subject is a person can never be allowed/);
    await expect(appendMediaDecision(ENTITY, allow(unknownBasis, { note: 'x'.repeat(2001) }), { root })).rejects.toMatchObject({ code: 'DECISION_REJECTED' });
    await expect(appendMediaDecision('ent_nobody', allow(unknownBasis), { root })).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
  });

  it('does not append to a log it cannot read, and repairs a missing final newline', async () => {
    const record = recordFor(PNG);
    const dir = await stage([{ record, bytes: PNG }]);
    await writeFile(join(dir, 'decisions.jsonl'), 'garbage\n');
    await expect(appendMediaDecision(ENTITY, allow(record), { root })).rejects.toMatchObject({ code: 'DECISIONS_INVALID' });

    await writeFile(join(dir, 'decisions.jsonl'), JSON.stringify(allow(record, { decision: 'held', subjectIsPerson: true, note: '' })));
    await appendMediaDecision(ENTITY, allow(record), { root });
    const lines = (await readFile(join(dir, 'decisions.jsonl'), 'utf8')).trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect((await readMediaDecisions(ENTITY, { root })).map((line) => line.decision)).toEqual(['held', 'allowed']);
  });
});

describe('readStagedAsset', () => {
  it('returns the bytes only when size and sha256 match the record', async () => {
    const record = recordFor(PNG);
    const dir = await stage([{ record, bytes: PNG }]);
    expect(await readStagedAsset(ENTITY, record, { root })).toEqual(PNG);

    await writeFile(join(dir, stagedFileName(record)), Buffer.alloc(PNG.byteLength, 1));
    await expect(readStagedAsset(ENTITY, record, { root })).rejects.toMatchObject({ code: 'FILE_MISMATCH' });
    await expect(readStagedAsset(ENTITY, { ...record, bytes: PNG.byteLength + 1 }, { root })).rejects.toMatchObject({ code: 'FILE_MISMATCH' });
  });

  it('does not follow a symlink out of the staging root', async () => {
    const record = recordFor(PNG);
    const outside = await mkdtemp(join(tmpdir(), 'media-outside-'));
    try {
      await writeFile(join(outside, 'secret.png'), PNG);
      const dir = await stage([{ record, bytes: null }]);
      await symlink(join(outside, 'secret.png'), join(dir, stagedFileName(record)));
      await expect(readStagedAsset(ENTITY, record, { root })).rejects.toMatchObject({ code: 'FILE_MISMATCH' });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

describe('listStagedEntityIds', () => {
  it('lists directories that hold a manifest, sorted, and nothing else', async () => {
    expect(await listStagedEntityIds({ root: join(root, 'missing') })).toEqual([]);
    await stage([{ record: recordFor(PNG), bytes: PNG }]);
    await mkdir(join(root, 'ent_empty'));
    await mkdir(join(root, 'not-an-entity'));
    await writeFile(join(root, 'run-20260929T003743Z.json'), '{}');
    expect(await listStagedEntityIds({ root })).toEqual([ENTITY]);
  });
});

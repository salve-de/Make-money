import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey, type MediaAssetManifest } from '../../shared/media-asset-schema';
import { stagedFileName } from '../../shared/media-asset-store';
import { parseReviewArgs, runReview } from './review-cli';

const ENTITY = 'ent_photoai';
const BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
const ASSET_ID = mediaAssetIdFromSha256(createHash('sha256').update(BYTES).digest('hex'));

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-review-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function stage(): Promise<{ record: MediaAssetManifest; dir: string }> {
  const sha256 = createHash('sha256').update(BYTES).digest('hex');
  const record = MediaAssetManifestSchema.parse({
    assetId: ASSET_ID,
    entityId: ENTITY,
    kind: 'screenshot_pricing',
    sourcePageUrl: 'https://photoai.com/pricing',
    assetUrl: null,
    retrievedAt: '2026-09-29T00:38:03.000Z',
    capturedBy: 'media-fetch-20260929',
    sha256,
    bytes: BYTES.byteLength,
    contentType: 'image/png',
    width: 1,
    height: 1,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: '出典: Photo AI 公式サイト (https://photoai.com/pricing)',
      decision: 'held',
      reviewedAt: null,
      notes: '自動取得。',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey(ENTITY, sha256, 'png'), publicKey: null },
    subjectIsPerson: true,
  });
  const dir = join(root, ENTITY);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, stagedFileName(record)), BYTES);
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify([record], null, 2)}\n`);
  return { record, dir };
}

const base = ['--entity', ENTITY, '--asset', ASSET_ID, '--reviewer', 'owner-delegated-2026-09-29', '--out'];

describe('parseReviewArgs', () => {
  it('reads a complete allow command', () => {
    const options = parseReviewArgs([...base, root, '--allow', '--subject-is-person', 'false', '--note', 'pricing table only'], root);
    expect(options).toMatchObject({ mode: 'decide', decision: 'allowed', subjectIsPerson: false, note: 'pricing table only', reviewer: 'owner-delegated-2026-09-29' });
    expect(parseReviewArgs(['--entity=ent_a', `--asset=${ASSET_ID}`, '--hold', '--reviewer=me'], root)).toMatchObject({ decision: 'held', subjectIsPerson: null });
  });

  it('will not allow without an explicit non-person confirmation and a note, nor block without a reason', () => {
    expect(() => parseReviewArgs([...base, root, '--allow', '--note', 'x'], root)).toThrow(/--subject-is-person false/);
    expect(() => parseReviewArgs([...base, root, '--allow', '--subject-is-person', 'true', '--note', 'x'], root)).toThrow(/--subject-is-person false/);
    expect(() => parseReviewArgs([...base, root, '--allow', '--subject-is-person', 'false'], root)).toThrow(/--note/);
    expect(() => parseReviewArgs([...base, root, '--block'], root)).toThrow(/--note/);
  });

  it('rejects ambiguous or malformed commands', () => {
    expect(() => parseReviewArgs([...base, root, '--allow', '--block'], root)).toThrow(/exactly one/);
    expect(() => parseReviewArgs([...base, root], root)).toThrow(/one of --allow/);
    expect(() => parseReviewArgs(['--entity', 'ent_a', '--asset', 'nope', '--hold', '--reviewer', 'x'], root)).toThrow(/asset id/);
    expect(() => parseReviewArgs(['--entity', '../x', '--asset', ASSET_ID, '--hold', '--reviewer', 'x'], root)).toThrow(/Invalid entity id/);
    expect(() => parseReviewArgs(['--entity', 'ent_a', '--asset', ASSET_ID, '--hold'], root)).toThrow(/--reviewer/);
    expect(() => parseReviewArgs([...base, root, '--hold', '--subject-is-person', 'maybe'], root)).toThrow(/true.*false/);
    expect(() => parseReviewArgs(['--frobnicate'], root)).toThrow(/Unknown argument/);
  });
});

describe('runReview', () => {
  const io = () => {
    const lines: string[] = [];
    return { lines, log: (line: string) => lines.push(line), now: () => new Date('2026-09-29T10:30:00.000Z') };
  };

  it('appends the decision with the reviewer and time, and reports that the asset is now displayable', async () => {
    const { dir } = await stage();
    const manifestBefore = await readFile(join(dir, 'manifest.json'));
    const out = io();
    const code = await runReview(parseReviewArgs([...base, root, '--allow', '--subject-is-person', 'false', '--note', '料金表のみ。人物なし'], root), out);
    expect(code).toBe(0);
    expect(out.lines.join('\n')).toMatch(/display=yes/);
    expect(await readFile(join(dir, 'manifest.json'))).toEqual(manifestBefore);
    const written = JSON.parse((await readFile(join(dir, 'decisions.jsonl'), 'utf8')).trim());
    expect(written).toEqual({
      assetId: ASSET_ID,
      decision: 'allowed',
      subjectIsPerson: false,
      reviewer: 'owner-delegated-2026-09-29',
      reviewedAt: '2026-09-29T10:30:00.000Z',
      note: '料金表のみ。人物なし',
    });
  });

  it('keeps the current person flag on hold and block when none is given, and lists what is in force', async () => {
    await stage();
    await runReview(parseReviewArgs([...base, root, '--block', '--note', '削除依頼'], root), io());
    const list = io();
    expect(await runReview(parseReviewArgs(['--list', '--out', root], root), list)).toBe(0);
    expect(list.lines.join('\n')).toMatch(/ent_photoai {2}1 assets, 1 decision lines/);
    expect(list.lines.join('\n')).toMatch(/blocked\s+person=true\s+display=no/);
  });

  it('fails for an asset that is not in the manifest', async () => {
    await stage();
    const wrong = parseReviewArgs(['--entity', ENTITY, '--asset', 'ma_' + '2'.repeat(24), '--hold', '--reviewer', 'me', '--out', root], root);
    await expect(runReview(wrong, io())).rejects.toThrow(/not in the manifest/);
  });
});

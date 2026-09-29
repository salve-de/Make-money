import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stagedFileName } from '../../shared/media-asset-store';
import { readLocalMediaFile, readLocalPublicMedia } from './local-source';
import { review, stageEntity } from './media-test-fixtures';

const ENTITY = 'ent_keyence';
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-local-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const problems = () => {
  const seen: string[] = [];
  return { seen, report: (entityId: string, message: string) => seen.push(`${entityId}: ${message}`) };
};

async function stageThree() {
  const [home, favicon, og] = await stageEntity(root, ENTITY, [
    { kind: 'screenshot_home', bytes: Buffer.from('home') },
    { kind: 'favicon', bytes: Buffer.from('favicon'), extension: 'ico' },
    { kind: 'og_image', bytes: Buffer.from('og') },
  ]);
  return { home, favicon, og };
}

describe('readLocalPublicMedia', () => {
  it('offers only allowed, non-person, unmodified images, each with its attribution and a file url', async () => {
    const { home, favicon, og } = await stageThree();
    await review(root, ENTITY, favicon, 'allowed');
    await review(root, ENTITY, og, 'blocked', { subjectIsPerson: true, note: '人物' });
    const { seen, report } = problems();
    const media = await readLocalPublicMedia([ENTITY, 'ent_nobody', 'not an id'], { root }, report);
    expect(Object.keys(media)).toEqual([ENTITY]);
    expect(media[ENTITY]).toEqual([
      {
        assetId: favicon.assetId,
        kind: 'favicon',
        url: `/api/media/file?entity_id=ent_keyence&asset=${favicon.assetId}`,
        contentType: 'image/vnd.microsoft.icon',
        width: 152,
        height: 152,
        attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
        sourcePageUrl: 'https://www.keyence.co.jp/',
        retrievedAt: '2026-09-29T00:38:11.808Z',
      },
    ]);
    expect(JSON.stringify(media)).not.toContain(home.assetId);
    expect(JSON.stringify(media)).not.toContain(og.assetId);
    expect(seen).toEqual([]);
  });

  it('withholds an allowed image whose file no longer matches the record, and says why', async () => {
    const { favicon } = await stageThree();
    await review(root, ENTITY, favicon, 'allowed');
    await writeFile(join(root, ENTITY, stagedFileName(favicon)), Buffer.from('replaced'));
    const { seen, report } = problems();
    expect(await readLocalPublicMedia([ENTITY], { root }, report)).toEqual({});
    expect(seen[0]).toMatch(/is allowed but not shown/);
  });

  it('shows nothing for an entity whose decision log is corrupt (a half-written block must not leave an allow in force)', async () => {
    const { favicon } = await stageThree();
    await review(root, ENTITY, favicon, 'allowed');
    await writeFile(join(root, ENTITY, 'decisions.jsonl'), `{"assetId":"${favicon.assetId}","decision":"blo`, { flag: 'a' });
    const { seen, report } = problems();
    expect(await readLocalPublicMedia([ENTITY], { root }, report)).toEqual({});
    expect(seen[0]).toMatch(/ledger unreadable/);
  });

  it('reads nothing for an entity without a ledger', async () => {
    expect(await readLocalPublicMedia([ENTITY], { root })).toEqual({});
  });
});

describe('readLocalMediaFile', () => {
  it('serves an allowed image with the content type of the record, and nothing else', async () => {
    const { home, favicon, og } = await stageThree();
    await review(root, ENTITY, favicon, 'allowed');
    await review(root, ENTITY, og, 'allowed', { subjectIsPerson: false });
    await review(root, ENTITY, og, 'blocked', { subjectIsPerson: true, note: '削除依頼', reviewedAt: '2026-09-29T11:00:00.000Z' });

    const file = await readLocalMediaFile(ENTITY, favicon.assetId, { root });
    expect(file?.contentType).toBe('image/vnd.microsoft.icon');
    expect(file?.bytes).toEqual(Buffer.from('favicon'));
    expect(await readLocalMediaFile(ENTITY, home.assetId, { root })).toBeNull(); // held
    expect(await readLocalMediaFile(ENTITY, og.assetId, { root })).toBeNull(); // blocked
    expect(await readLocalMediaFile(ENTITY, 'ma_' + '9'.repeat(24), { root })).toBeNull(); // unknown
    expect(await readLocalMediaFile('../etc', favicon.assetId, { root })).toBeNull();
  });

  it('does not serve bytes that differ from the reviewed ones', async () => {
    const { favicon } = await stageThree();
    await review(root, ENTITY, favicon, 'allowed');
    await writeFile(join(root, ENTITY, stagedFileName(favicon)), Buffer.from('swapped'));
    const { seen, report } = problems();
    expect(await readLocalMediaFile(ENTITY, favicon.assetId, { root }, report)).toBeNull();
    expect(seen[0]).toMatch(/was not served/);
  });
});

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isMediaDisplayable } from '../../shared/media-decisions';
import { appendMediaDecision, readEffectiveManifest, stagedFileName } from '../../shared/media-asset-store';
import { AUTO_REVIEWER, runAutoReview, type FaceDetector } from './auto-review';
import { review, stageEntity, type FixtureAsset } from './media-test-fixtures';

/** A PNG header the ledger's image sniffer accepts; `tag` makes the bytes distinct. */
function png(tag: string): Buffer {
  const be32 = (value: number) => Buffer.from([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), be32(13), Buffer.from('IHDR'), be32(152), be32(152), Buffer.from([8, 6, 0, 0, 0]), Buffer.from(tag)]);
}

const NOW = () => new Date('2026-09-29T12:00:00.000Z');
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-auto-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A detector that answers by the tag inside the file name lookup table. */
function detector(answers: Record<string, number | 'error'>, seen: string[][] = []): FaceDetector {
  return async (paths) => {
    seen.push([...paths]);
    const out = new Map();
    for (const path of paths) {
      const tag = Object.keys(answers).find((key) => path.includes(key));
      const answer = tag ? answers[tag] : 0;
      out.set(path, answer === 'error' ? { error: 'vision_failed' } : { faces: answer });
    }
    return out;
  };
}

const PRODUCT_NOTE = (alt: string) => `実際の製品画面の候補 [product-screen-rule:v1] 判定=screen 根拠=signal:dashboard 位置=main alt=${JSON.stringify(alt)} class="" context=""`;
const productAsset = (tag: string, overrides: Partial<FixtureAsset> = {}): FixtureAsset => ({
  kind: 'screenshot_product',
  bytes: png(tag),
  assetUrl: 'https://www.keyence.co.jp/static/home-hero-dashboard.png',
  width: 1600,
  height: 900,
  notes: PRODUCT_NOTE('Dashboard of the product'),
  ...overrides,
});

describe('runAutoReview', () => {
  it('allows faceless icons and store screenshots, blocks faces, and leaves the rest held', async () => {
    const assets: FixtureAsset[] = [
      { kind: 'favicon', bytes: png('favicon') },
      { kind: 'app_icon', bytes: png('icon') },
      { kind: 'favicon', bytes: png('face-icon') },
      { kind: 'store_screenshot', bytes: png('store') },
      { kind: 'screenshot_home', bytes: png('home') },
      { kind: 'screenshot_pricing', bytes: png('pricing') },
      { kind: 'favicon', bytes: png('unreadable'), extension: 'svg' },
    ];
    const records = await stageEntity(root, 'ent_a', assets);
    const seen: string[][] = [];
    const answers: Record<string, number | 'error'> = {
      [records[2].assetId]: 3,
      [records[6].assetId]: 'error',
    };

    const tally = await runAutoReview(['ent_a'], { root, detector: detector(answers, seen), now: NOW });
    expect(tally).toMatchObject({ entities: 1, allowed: 3, blocked: 1, held: 3, alreadyDecided: 0 });
    // screenshots never reach the face check
    expect(seen.flat().some((path) => path.includes(records[4].assetId) || path.includes(records[5].assetId))).toBe(false);
    expect(Object.keys(tally.heldReasons).some((reason) => reason.startsWith('screenshot_home'))).toBe(true);

    const ledger = await readEffectiveManifest('ent_a', { root });
    const byId = new Map((ledger?.assets ?? []).map((asset) => [asset.assetId, asset]));
    expect(ledger?.problems).toEqual([]);
    for (const index of [0, 1, 3]) {
      const asset = byId.get(records[index].assetId)!;
      expect(asset.rights.decision).toBe('allowed');
      expect(asset.subjectIsPerson).toBe(false);
      expect(isMediaDisplayable(asset)).toBe(true);
      expect(asset.review).toMatchObject({ reviewer: AUTO_REVIEWER });
      expect(asset.review?.note).toContain('顔');
      expect(asset.review?.note).toContain('SHA-256');
    }
    const blocked = byId.get(records[2].assetId)!;
    expect(blocked.rights.decision).toBe('blocked');
    expect(blocked.subjectIsPerson).toBe(true);
    expect(isMediaDisplayable(blocked)).toBe(false);
    for (const index of [4, 5, 6]) {
      expect(byId.get(records[index].assetId)!.review).toBeNull();
      expect(byId.get(records[index].assetId)!.rights.decision).toBe('held');
    }
  });

  it('holds an asset whose file no longer matches the ledger hash', async () => {
    const [record] = await stageEntity(root, 'ent_a', [{ kind: 'favicon', bytes: png('favicon') }]);
    await writeFile(join(root, 'ent_a', stagedFileName(record)), png('tampered'));
    const tally = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(tally).toMatchObject({ allowed: 0, blocked: 0, held: 1 });
    expect(Object.keys(tally.heldReasons)[0]).toContain('file unverifiable');
  });

  it('holds bytes that are not an image', async () => {
    const [record] = await stageEntity(root, 'ent_a', [{ kind: 'favicon', bytes: Buffer.from('<html>not an image</html>') }]);
    const tally = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(tally.held).toBe(1);
    expect(Object.keys(tally.heldReasons)[0]).toContain('not readable');
    expect((await readEffectiveManifest('ent_a', { root }))?.assets.find((a) => a.assetId === record.assetId)?.review).toBeNull();
  });

  it('never overrides an earlier decision and is idempotent', async () => {
    const records = await stageEntity(root, 'ent_a', [
      { kind: 'og_image', bytes: png('human-blocked') },
      { kind: 'favicon', bytes: png('fresh') },
    ]);
    await review(root, 'ent_a', records[0], 'blocked', { subjectIsPerson: true, note: '人物写真' });
    const first = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(first).toMatchObject({ allowed: 1, alreadyDecided: 1 });
    const log = await readFile(join(root, 'ent_a', 'decisions.jsonl'), 'utf8');
    const second = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(second).toMatchObject({ allowed: 0, alreadyDecided: 2 });
    expect(await readFile(join(root, 'ent_a', 'decisions.jsonl'), 'utf8')).toBe(log);
  });

  it('writes nothing in a dry run, and scans every staged entity when none is named', async () => {
    await stageEntity(root, 'ent_a', [{ kind: 'favicon', bytes: png('a') }]);
    await stageEntity(root, 'ent_b', [{ kind: 'app_icon', bytes: png('b') }]);
    const dry = await runAutoReview(null, { root, detector: detector({}), now: NOW, dryRun: true });
    expect(dry).toMatchObject({ entities: 2, allowed: 2 });
    await expect(readFile(join(root, 'ent_a', 'decisions.jsonl'), 'utf8')).rejects.toThrow();
  });

  it('reports a corrupt ledger and carries on with the other entities', async () => {
    await stageEntity(root, 'ent_a', [{ kind: 'favicon', bytes: png('a') }]);
    await stageEntity(root, 'ent_b', [{ kind: 'favicon', bytes: png('b') }]);
    await writeFile(join(root, 'ent_a', 'decisions.jsonl'), 'not json\n');
    const tally = await runAutoReview(null, { root, detector: detector({}), now: NOW });
    expect(tally.ledgerErrors).toHaveLength(1);
    expect(tally.allowed).toBe(1);
  });

  it('blocks og:image banners as promotional art, also over an earlier automatic allow, but never over a human decision', async () => {
    const records = await stageEntity(root, 'ent_a', [
      { kind: 'og_image', bytes: png('og-fresh') },
      { kind: 'og_image', bytes: png('og-auto-allowed') },
      { kind: 'og_image', bytes: png('og-human-allowed') },
    ]);
    await appendMediaDecision(
      'ent_a',
      { assetId: records[1].assetId, decision: 'allowed', subjectIsPerson: false, reviewer: 'auto-rule-v3', reviewedAt: '2026-09-29T10:00:00.000Z', note: '自動判定 auto-rule-v3: og_image。' },
      { root },
    );
    await review(root, 'ent_a', records[2], 'allowed', { subjectIsPerson: false, note: '画面が写っていることを目視' });

    const tally = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(tally).toMatchObject({ promoBlocked: 2, allowed: 0, alreadyDecided: 1 });
    const byId = new Map(((await readEffectiveManifest('ent_a', { root }))?.assets ?? []).map((asset) => [asset.assetId, asset]));
    for (const index of [0, 1]) {
      const asset = byId.get(records[index].assetId)!;
      expect(asset.rights.decision).toBe('blocked');
      expect(asset.review?.note).toContain('promo_banner_no_product');
      expect(isMediaDisplayable(asset)).toBe(false);
    }
    expect(isMediaDisplayable(byId.get(records[2].assetId)!)).toBe(true);

    const log = await readFile(join(root, 'ent_a', 'decisions.jsonl'), 'utf8');
    expect(await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW })).toMatchObject({ promoBlocked: 0, alreadyDecided: 3 });
    expect(await readFile(join(root, 'ent_a', 'decisions.jsonl'), 'utf8')).toBe(log);
  });

  it('allows a product screen whose recorded evidence still passes the rule and which shows no face', async () => {
    const records = await stageEntity(root, 'ent_a', [productAsset('screen-ok'), productAsset('screen-face')]);
    const tally = await runAutoReview(['ent_a'], { root, detector: detector({ [records[1].assetId]: 1 }), now: NOW });
    expect(tally).toMatchObject({ allowed: 1, blocked: 1, held: 0 });
    const byId = new Map(((await readEffectiveManifest('ent_a', { root }))?.assets ?? []).map((asset) => [asset.assetId, asset]));
    expect(isMediaDisplayable(byId.get(records[0].assetId)!)).toBe(true);
    expect(byId.get(records[0].assetId)!.review?.note).toContain('製品画面');
    expect(byId.get(records[1].assetId)!.rights.decision).toBe('blocked');
  });

  it('holds a product screen without the rule marker or whose evidence no longer passes (logo, shape, off the page body)', async () => {
    await stageEntity(root, 'ent_a', [
      productAsset('no-marker', { notes: '手で入れた記録' }),
      productAsset('logo-path', { assetUrl: 'https://www.keyence.co.jp/static/customer-logos-dashboard.png' }),
      productAsset('square', { width: 900, height: 900 }),
      productAsset('footer', { notes: PRODUCT_NOTE('Dashboard').replace('位置=main', '位置=footer') }),
    ]);
    const seen: string[][] = [];
    const tally = await runAutoReview(['ent_a'], { root, detector: detector({}, seen), now: NOW });
    expect(tally).toMatchObject({ allowed: 0, blocked: 0, held: 4 });
    expect(seen).toEqual([]);
  });

  it('sends an earlier automatic product-screen allow back to held when the rule says it is no longer clearly a screen, but keeps a human allow', async () => {
    const records = await stageEntity(root, 'ent_a', [
      productAsset('weak-word', { assetUrl: 'https://www.keyence.co.jp/static/feature-section.png', notes: PRODUCT_NOTE('Feature section') }),
      productAsset('clear', { notes: PRODUCT_NOTE('Dashboard of the product') }),
      productAsset('human', { assetUrl: 'https://www.keyence.co.jp/static/feature-section2.png', notes: PRODUCT_NOTE('Feature section') }),
    ]);
    const auto = { subjectIsPerson: false, reviewer: 'auto-rule-v4', reviewedAt: '2026-10-02T00:00:00.000Z', note: '自動判定 auto-rule-v4: 顔 0 件。' };
    await appendMediaDecision('ent_a', { assetId: records[0].assetId, decision: 'allowed', ...auto }, { root });
    await appendMediaDecision('ent_a', { assetId: records[1].assetId, decision: 'allowed', ...auto }, { root });
    await review(root, 'ent_a', records[2], 'allowed', { subjectIsPerson: false, note: '製品画面を目視' });

    const tally = await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW });
    expect(tally).toMatchObject({ demoted: 1, allowed: 0, alreadyDecided: 2 });
    const byId = new Map(((await readEffectiveManifest('ent_a', { root }))?.assets ?? []).map((asset) => [asset.assetId, asset]));
    expect(byId.get(records[0].assetId)!.rights.decision).toBe('held');
    expect(isMediaDisplayable(byId.get(records[1].assetId)!)).toBe(true);
    expect(isMediaDisplayable(byId.get(records[2].assetId)!)).toBe(true);
    expect(await runAutoReview(['ent_a'], { root, detector: detector({}), now: NOW })).toMatchObject({ demoted: 0 });
  });
});

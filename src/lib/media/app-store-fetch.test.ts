import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readEffectiveManifest } from '../../shared/media-asset-store';
import {
  AppStoreRateLimited,
  extractAppStoreRef,
  fetchAppStoreAssetsForEntity,
  isAppleImageUrl,
  newAppStoreContext,
  pickSearchMatch,
  readAppStoreProgress,
  runAppStoreFetch,
  searchTermFor,
  selectAppStoreEntities,
  type AppStoreDeps,
  type AppStoreEntity,
  type ItunesApp,
} from './app-store-fetch';

/** A PNG header the ledger's image sniffer accepts; `tag` makes the bytes (and so the asset id) distinct. */
function png(width: number, height: number, tag: string): Uint8Array {
  const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...be32(13), 0x49, 0x48, 0x44, 0x52, ...be32(width), ...be32(height), 8, 6, 0, 0, 0, ...Buffer.from(tag)]);
}

const APP: ItunesApp = {
  trackId: 111222333,
  trackName: 'Photo App',
  trackViewUrl: 'https://apps.apple.com/us/app/photo-app/id111222333?uo=4',
  sellerUrl: 'https://www.photoapp.example/',
  artworkUrl512: 'https://is1-ssl.mzstatic.com/image/thumb/Purple/icon/512x512bb.jpg',
  screenshotUrls: [1, 2, 3, 4, 5].map((n) => `https://is1-ssl.mzstatic.com/image/thumb/Purple/shot${n}/392x696bb.jpg`),
};

const ENTITY: AppStoreEntity = { id: 'ent_photoapp', name: 'Photo App (Solo SaaS)', country: 'US', officialUrl: 'https://photoapp.example/', candidateUrls: ['https://photoapp.example/'] };

function fakeDeps(handlers: { json?: (url: string) => { status: number; json: unknown }; bytes?: (url: string) => { status: number; bytes: Uint8Array; finalUrl?: string } } = {}) {
  const calls = { json: [] as string[], bytes: [] as string[], sleeps: [] as number[] };
  let clock = 1_800_000_000_000;
  const deps: AppStoreDeps = {
    minIntervalMs: 1100,
    now: () => new Date(clock),
    sleep: async (ms) => {
      calls.sleeps.push(ms);
      clock += ms;
    },
    getJson: async (url) => {
      calls.json.push(url);
      return handlers.json ? handlers.json(url) : { status: 200, json: { resultCount: 1, results: [APP] } };
    },
    getBytes: async (url) => {
      calls.bytes.push(url);
      if (handlers.bytes) {
        const answer = handlers.bytes(url);
        return { finalUrl: url, ...answer };
      }
      return { status: 200, finalUrl: url, bytes: png(url.includes('512x512') ? 512 : 392, url.includes('512x512') ? 512 : 696, url) };
    },
  };
  return { deps, calls };
}

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-appstore-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('pure helpers', () => {
  it('finds the app id and storefront in an apps.apple.com URL and ignores other hosts', () => {
    expect(extractAppStoreRef(['https://example.com/', 'https://apps.apple.com/jp/app/foo/id1234567890?l=ja'])).toEqual({ appId: '1234567890', storefront: 'jp', url: 'https://apps.apple.com/jp/app/foo/id1234567890?l=ja' });
    expect(extractAppStoreRef(['https://apps.apple.com/app/id987654321'])?.storefront).toBe('us');
    expect(extractAppStoreRef(['https://play.google.com/store/apps/details?id=com.foo', 'https://evil.example/apps.apple.com/us/app/x/id123456789', 'https://apps.apple.com/us/developer/foo/id555'])).toBeNull();
    expect(extractAppStoreRef(['not a url'])).toBeNull();
  });

  it('drops our own parenthesised label from the search term', () => {
    expect(searchTermFor('Steve Hanov (Micro-SaaS)')).toBe('Steve Hanov');
    expect(searchTermFor('キーエンス（KEYENCE）')).toBe('キーエンス');
  });

  it('accepts a search result only when its sellerUrl is on the official domain', () => {
    const other: ItunesApp = { ...APP, trackViewUrl: 'https://apps.apple.com/us/app/other/id1', sellerUrl: 'https://other.example/' };
    const noSeller: ItunesApp = { ...APP, sellerUrl: undefined };
    expect(pickSearchMatch([other, noSeller, APP], 'https://photoapp.example/pricing')).toBe(APP);
    expect(pickSearchMatch([other, noSeller], 'https://photoapp.example/')).toBeNull();
  });

  it('only trusts images on Apple\'s CDN', () => {
    expect(isAppleImageUrl('https://is1-ssl.mzstatic.com/a.jpg')).toBe(true);
    for (const bad of ['http://is1-ssl.mzstatic.com/a.jpg', 'https://mzstatic.com.evil.example/a.jpg', 'https://example.com/a.jpg', 'x']) expect(isAppleImageUrl(bad)).toBe(false);
  });

  it('selects catalog entities that have an App Store link, or an official URL and an app mention', () => {
    const index = [
      { id: 'ent_e', name: 'E', officialUrl: 'https://e.example/', description: 'A web dashboard for founders' },
      { id: 'ent_a', name: 'A', country: 'JP', officialUrl: 'https://a.example/', description: 'An iPhone app for habit tracking', reaudit: { sources: [{ url: 'https://ebizfacts.com/a' }] } },
      { id: 'ent_b', name: 'B', officialUrl: null, reaudit: { sources: [{ url: 'https://apps.apple.com/us/app/b/id1234567' }] } },
      { id: 'ent_c', name: 'C', officialUrl: null, reaudit: { sources: [{ url: 'https://ebizfacts.com/c' }] } },
      { id: 'ent_d', name: 'D', officialUrl: 'https://d.example/' },
    ];
    expect(selectAppStoreEntities(index, new Set(['ent_a', 'ent_b', 'ent_c', 'ent_e'])).map((entity) => entity.id)).toEqual(['ent_a', 'ent_b']);
  });
});

describe('fetchAppStoreAssetsForEntity', () => {
  it('records the icon and at most three screenshots as held App Store material, with the store page as source', async () => {
    const { deps, calls } = fakeDeps();
    const ctx = newAppStoreContext(deps, root);
    const outcome = await fetchAppStoreAssetsForEntity(ctx, ENTITY);
    expect(outcome).toMatchObject({ status: 'captured', icons: 1, screenshots: 3 });
    expect(calls.bytes).toHaveLength(4);
    expect(calls.json[0]).toContain('https://itunes.apple.com/search?term=Photo%20App');

    const ledger = await readEffectiveManifest(ENTITY.id, { root });
    expect(ledger?.problems).toEqual([]);
    const assets = ledger?.assets ?? [];
    expect(assets.map((asset) => asset.kind).sort()).toEqual(['app_icon', 'store_screenshot', 'store_screenshot', 'store_screenshot']);
    for (const asset of assets) {
      expect(asset.sourcePageUrl).toBe('https://apps.apple.com/us/app/photo-app/id111222333?uo=4');
      expect(asset.rights).toMatchObject({ basis: 'official_marketing_material', decision: 'held' });
      expect(asset.rights.attribution).toContain('App Store 掲載画像');
      expect(asset.rights.attribution).toContain(asset.sourcePageUrl);
      expect(asset.subjectIsPerson).toBe(true);
      expect(asset.assetUrl).toMatch(/^https:\/\/is1-ssl\.mzstatic\.com\//);
      expect(asset.capturedBy).toMatch(/^media-appstore-\d{8}$/);
    }
    expect(assets.find((asset) => asset.kind === 'app_icon')).toMatchObject({ width: 512, height: 512 });
  });

  it('looks the app up by id when the record links to the App Store, without a name search', async () => {
    const { deps, calls } = fakeDeps();
    const entity: AppStoreEntity = { ...ENTITY, officialUrl: null, candidateUrls: ['https://apps.apple.com/jp/app/photo-app/id111222333'] };
    await fetchAppStoreAssetsForEntity(newAppStoreContext(deps, root), entity);
    expect(calls.json).toEqual(['https://itunes.apple.com/lookup?id=111222333&country=jp&entity=software']);
  });

  it('skips with a reason when no search result belongs to the official domain', async () => {
    const { deps, calls } = fakeDeps({ json: () => ({ status: 200, json: { results: [{ ...APP, sellerUrl: 'https://someone-else.example/' }] } }) });
    const outcome = await fetchAppStoreAssetsForEntity(newAppStoreContext(deps, root), ENTITY);
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toContain('no result whose sellerUrl is on the official domain');
    expect(calls.bytes).toHaveLength(0);
  });

  it('skips a name search when the record has no official URL to compare with', async () => {
    const { deps, calls } = fakeDeps();
    const outcome = await fetchAppStoreAssetsForEntity(newAppStoreContext(deps, root), { ...ENTITY, officialUrl: null, candidateUrls: [] });
    expect(outcome.status).toBe('skipped');
    expect(calls.json).toHaveLength(0);
  });

  it('never downloads from a host other than Apple\'s image CDN', async () => {
    const evil: ItunesApp = { ...APP, artworkUrl512: 'https://evil.example/icon.png', screenshotUrls: ['https://evil.example/s.png'] };
    const { deps, calls } = fakeDeps({ json: () => ({ status: 200, json: { results: [evil] } }) });
    const outcome = await fetchAppStoreAssetsForEntity(newAppStoreContext(deps, root), ENTITY);
    expect(calls.bytes).toHaveLength(0);
    expect(outcome.status).toBe('error');
  });

  it('records nothing for a download that is not an image and keeps the good ones', async () => {
    const { deps } = fakeDeps({
      bytes: (url) => (url.includes('shot2') ? { status: 200, bytes: Buffer.from('<html>nope</html>') } : { status: 200, bytes: png(url.includes('512x512') ? 512 : 392, 696, url) }),
    });
    const outcome = await fetchAppStoreAssetsForEntity(newAppStoreContext(deps, root), ENTITY);
    expect(outcome).toMatchObject({ status: 'captured', icons: 1, screenshots: 2 });
    expect(outcome.reason).toContain('not an image');
  });

  it('is idempotent: a second run adds nothing and keeps the ledger', async () => {
    const { deps } = fakeDeps();
    const ctx = newAppStoreContext(deps, root);
    await fetchAppStoreAssetsForEntity(ctx, ENTITY);
    const before = await readFile(join(root, ENTITY.id, 'manifest.json'), 'utf8');
    const again = await fetchAppStoreAssetsForEntity(ctx, ENTITY);
    expect(again.status).toBe('nothing_new');
    expect(await readFile(join(root, ENTITY.id, 'manifest.json'), 'utf8')).toBe(before);
  });
});

describe('runAppStoreFetch', () => {
  it('keeps at least the minimum gap between two API calls', async () => {
    const { deps, calls } = fakeDeps({ json: () => ({ status: 200, json: { results: [] } }) });
    const entities = [1, 2, 3].map((n): AppStoreEntity => ({ ...ENTITY, id: `ent_x${n}` }));
    await runAppStoreFetch(newAppStoreContext(deps, root), entities, { log: () => undefined });
    expect(calls.json).toHaveLength(3);
    // first call needs no wait (clock is far ahead of 0), the next two wait for the 1100 ms gap
    expect(calls.sleeps.filter((ms) => ms >= 1000).length).toBeGreaterThanOrEqual(2);
  });

  it('resumes: finished entities (captured or skipped with a reason) are not asked again, errors are retried', async () => {
    let failing = true;
    const { deps, calls } = fakeDeps({
      json: (url) => {
        if (url.includes('Bad')) return { status: 200, json: { results: [] } };
        return failing ? { status: 500, json: null } : { status: 200, json: { results: [APP] } };
      },
    });
    const ctx = newAppStoreContext(deps, root);
    const entities: AppStoreEntity[] = [
      { ...ENTITY, id: 'ent_ok' },
      { ...ENTITY, id: 'ent_bad', name: 'Bad Name' },
    ];
    const first = await runAppStoreFetch(ctx, entities, { log: () => undefined });
    expect(first).toMatchObject({ processed: 2, errors: 1, skipped: 1, captured: 0 });
    expect(await readAppStoreProgress(root)).toEqual(new Set(['ent_bad']));

    failing = false;
    const before = calls.json.length;
    const second = await runAppStoreFetch(ctx, entities, { log: () => undefined });
    expect(second).toMatchObject({ processed: 1, alreadyDone: 1, captured: 1, icons: 1, screenshots: 3, remaining: 0 });
    expect(calls.json.length - before).toBe(1);
  });

  it('stops the whole run when Apple keeps answering 429, and leaves that entity unfinished', async () => {
    const { deps } = fakeDeps({ json: () => ({ status: 429, json: null }) });
    const summary = await runAppStoreFetch(newAppStoreContext(deps, root), [ENTITY], { log: () => undefined });
    expect(summary.stoppedEarly).toContain('HTTP 429');
    expect(summary.processed).toBe(0);
    expect(await readAppStoreProgress(root)).toEqual(new Set());
    expect(new AppStoreRateLimited('x').name).toBe('AppStoreRateLimited');
  });
});

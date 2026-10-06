import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { listStagedEntityIds, readEffectiveManifest } from '../src/shared/media-asset-store';
import { isMediaDisplayable, type EffectiveMediaAsset } from '../src/shared/media-decisions';
import { NO_MONEY, PRIMARY, SECONDARY, WITH_SCREENS } from './reader-fixture';
import { MEDIA_GALLERY_KINDS, MEDIA_SCREEN_KINDS, PUBLIC_MEDIA_RESPONSE_SCHEMA, pickGalleryAssets, type PublicMediaAsset } from '../src/shared/media-display';

// Official product images (docs/MEDIA_ASSETS_AND_PROVENANCE.md, chapter 11). The server started by playwright.config.ts
// reads the repository's data/media-staging (MEDIA_SOURCE=local_staging), which is gitignored: what is checked here is
// whatever a human has approved with scripts/media/review-assets.ts. Without an approved image the test skips itself.
const STAGING = join(process.cwd(), 'data/media-staging');

async function ledger(entityId: string): Promise<EffectiveMediaAsset[]> {
  try {
    return (await readEffectiveManifest(entityId, { root: STAGING }))?.assets ?? [];
  } catch {
    return [];
  }
}

test.describe('official product images', () => {
  test('the MyOperator inspector shows its approved product screens at the top, with the source, and no held image', async ({ page }) => {
    const assets = await ledger(WITH_SCREENS.id);
    const shown = assets.filter((asset) => isMediaDisplayable(asset) && (MEDIA_GALLERY_KINDS.includes(asset.kind) || MEDIA_SCREEN_KINDS.includes(asset.kind)));
    test.skip(shown.length === 0, 'data/media-staging has no approved MyOperator gallery image (approve one with scripts/media/review-assets.ts)');

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?entity=${WITH_SCREENS.id}`);
    const gallery = page.locator('#section-media');
    await expect(gallery).toBeVisible({ timeout: 45_000 });

    // 画像欄は詳細の先頭の区画（「事業の概要」の区画は無くなった）。
    const pane = page.getByRole('complementary', { name: `${WITH_SCREENS.name}の企業事例インスペクター` });
    await expect(pane.locator('[id^="section-"]').first()).toHaveAttribute('id', 'section-media');
    await expect(gallery).toContainText('製品画像');

    // The images the gallery rule picks, loaded, each with its source text directly below it.
    const images = gallery.getByTestId('media-gallery-image');
    await expect(images).toHaveCount(pickGalleryAssets(shown as unknown as PublicMediaAsset[]).length);
    expect(await images.count()).toBe(WITH_SCREENS.screens);
    await gallery.scrollIntoViewIfNeeded();
    for (const image of await images.all()) {
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      await expect(image).toHaveAttribute('loading', 'lazy');
    }
    const pricing = shown.find((asset) => asset.kind === 'screenshot_pricing');
    if (pricing) {
      const figure = gallery.locator('figure').filter({ has: page.locator('[data-kind="screenshot_pricing"]') });
      await expect(figure.getByTestId('media-gallery-attribution')).toHaveText(pricing.rights.attribution);
      const image = await figure.getByTestId('media-gallery-image').boundingBox();
      const caption = await figure.getByTestId('media-gallery-attribution').boundingBox();
      expect(image && caption && caption.y >= image.y + image.height - 1).toBe(true);
    }

    // Held, blocked and person images are nowhere in the page.
    const html = await page.content();
    for (const asset of assets.filter((candidate) => !isMediaDisplayable(candidate))) expect(html).not.toContain(asset.assetId);

    // No horizontal overflow from the new section.
    await expect(pane).toHaveJSProperty('scrollWidth', await pane.evaluate((element) => element.clientWidth));

    await page.screenshot({ path: 'test-results/media-gallery-myoperator.png' });
    expect(errors).toEqual([]);
  });

  test('the media API offers exactly the approved Teamcamp images and serves only those files', async ({ page, request }) => {
    const assets = await ledger(NO_MONEY.id);
    const approved = assets.filter(isMediaDisplayable);
    test.skip(approved.length === 0, 'data/media-staging has no approved Teamcamp image');

    const body = await (await request.get(`/api/media?entity_id=${NO_MONEY.id}`)).json();
    expect(body).toMatchObject({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true });
    const offered = body.entities[NO_MONEY.id] as PublicMediaAsset[];
    expect(offered.map((asset) => asset.assetId).sort()).toEqual(approved.map((asset) => asset.assetId).sort());
    for (const asset of offered) {
      const record = approved.find((candidate) => candidate.assetId === asset.assetId) as EffectiveMediaAsset;
      expect(asset.attribution).toBe(record.rights.attribution);
      const file = await request.get(asset.url);
      expect(file.status()).toBe(200);
      expect(file.headers()['content-type']).toBe(record.contentType);
      expect(file.headers()['x-content-type-options']).toBe('nosniff');
      const bytes = await file.body();
      expect(bytes.byteLength).toBe(record.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
    }
    for (const held of assets.filter((asset) => !isMediaDisplayable(asset))) {
      expect((await request.get(`/api/media/file?entity_id=${NO_MONEY.id}&asset=${held.assetId}`)).status()).toBe(404);
    }

    // 画像は事例が出ている時だけ出る。画像欄に出るのは実画面（ストアの画面写真・製品画面）とアプリのアイコンだけで、
    // ファビコンだけの事例には画像欄を出さない
    await page.goto(`/?entity=${NO_MONEY.id}`);
    await expect(page.getByRole('heading', { name: NO_MONEY.name, exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('#section-media')).toHaveCount(pickGalleryAssets(offered).length > 0 ? 1 : 0);
    await page.screenshot({ path: 'test-results/media-gallery-teamcamp.png' });
  });

  test('no held, blocked or person image is in any media response, and unpublished cases get none', async ({ request }) => {
    const entityIds = await listStagedEntityIds({ root: STAGING });
    test.skip(entityIds.length === 0, 'data/media-staging is empty');
    // 画像の置き場には公開目録に無い事例の分もある。画像APIは公開目録の事例の分だけを返し、他は混ぜない（全部が未公開なら404）。
    const catalog = await (await request.get('/api/businesses?limit=50')).json() as { data: { id: string }[]; hasMore: boolean };
    expect(catalog.hasMore).toBe(false);
    const published = new Set(catalog.data.map((row) => row.id));
    expect(published.size).toBeGreaterThan(0);
    for (let start = 0; start < entityIds.length; start += 40) {
      const chunk = entityIds.slice(start, start + 40);
      const text = await (await request.get(`/api/media?${chunk.map((id) => `entity_id=${encodeURIComponent(id)}`).join('&')}`)).text();
      for (const id of chunk) {
        for (const asset of await ledger(id)) {
          if (published.has(id) && isMediaDisplayable(asset)) expect(text).toContain(asset.assetId);
          else expect(text).not.toContain(asset.assetId);
        }
      }
      expect(text).not.toContain('owner-delegated');
    }
    // 公開目録の事例の画像は、まとめて頼んでも欠けずに返る
    const mine = [...published].filter((id) => entityIds.includes(id));
    expect(mine.length).toBeGreaterThan(0);
    const body = await (await request.get(`/api/media?${mine.map((id) => `entity_id=${encodeURIComponent(id)}`).join('&')}`)).json();
    expect(Object.keys(body.entities).sort()).toEqual(mine.filter((id) => (body.entities[id] ?? []).length > 0).sort());
  });

  test('a list row shows the logo that the media API offers for it', async ({ page, request }) => {
    // GoRails の行にだけ、実在の承認済み画像（Codementor のファビコン）をAPIの答えとして返し、行の配線を確かめる。
    // 他の行には何も返さない（実際は10件とも小さなアイコンを持つので、答えを差し替えて1件だけ見る）: ids of the visible rows go out in one request, the answer becomes a 20px mark before the name.
    const real = await (await request.get(`/api/media?entity_id=${SECONDARY.id}`)).json();
    const favicon = (real.entities?.[SECONDARY.id] as PublicMediaAsset[] | undefined)?.find((asset) => asset.kind === 'favicon');
    test.skip(!favicon, 'data/media-staging has no approved Codementor favicon');

    const asked: string[][] = [];
    await page.route(/\/api\/media\?/, async (route) => {
      const ids = new URL(route.request().url()).searchParams.getAll('entity_id');
      asked.push(ids);
      await route.fulfill({
        json: { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true, entities: ids.includes(PRIMARY.id) ? { [PRIMARY.id]: [favicon] } : {} },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?entity=${PRIMARY.id}`);
    await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible({ timeout: 45_000 });

    const row = page.getByRole('row').filter({ hasText: PRIMARY.name }).filter({ visible: true }).first();
    const logo = row.getByTestId('entity-logo');
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const box = await logo.boundingBox();
    expect(box && Math.round(box.width) === 20 && Math.round(box.height) === 20).toBe(true);
    await expect(logo).toHaveAttribute('title', favicon!.attribution);
    // Rows without an approved image get no mark at all.
    await expect(page.getByTestId('entity-logo').filter({ visible: true })).toHaveCount(1);
    await row.screenshot({ path: 'test-results/media-list-logo.png' });
    expect(asked.flat()).toContain(PRIMARY.id);
    expect(Math.max(...asked.map((ids) => ids.length))).toBeLessThanOrEqual(40);
    expect(errors).toEqual([]);
  });
});

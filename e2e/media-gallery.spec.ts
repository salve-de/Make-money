import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { listStagedEntityIds, readEffectiveManifest } from '../src/shared/media-asset-store';
import { isMediaDisplayable, type EffectiveMediaAsset } from '../src/shared/media-decisions';
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
  test('the Excalidraw inspector shows its approved pricing screenshot under the summary, with the source, and no held image', async ({ page }) => {
    const assets = await ledger('ent_excalidraw_c7820d');
    const shown = assets.filter((asset) => isMediaDisplayable(asset) && (MEDIA_GALLERY_KINDS.includes(asset.kind) || MEDIA_SCREEN_KINDS.includes(asset.kind)));
    test.skip(shown.length === 0, 'data/media-staging has no approved Excalidraw gallery image (approve one with scripts/media/review-assets.ts)');

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?entity=ent_excalidraw_c7820d');
    const gallery = page.locator('#section-media');
    await expect(gallery).toBeVisible({ timeout: 45_000 });

    // 冒頭の概要の下に、小さく並ぶ。

    // The images the gallery rule picks, loaded, each with its source text directly below it.
    const images = gallery.getByTestId('media-gallery-image');
    await expect(images).toHaveCount(pickGalleryAssets(shown as unknown as PublicMediaAsset[]).length);
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
    const pane = page.getByRole('complementary', { name: 'Excalidrawの企業事例インスペクター' });
    await expect(pane).toHaveJSProperty('scrollWidth', await pane.evaluate((element) => element.clientWidth));

    await page.screenshot({ path: 'test-results/media-gallery-excalidraw.png' });
    expect(errors).toEqual([]);
  });

  test('the media API offers exactly the approved GMass images and serves only those files', async ({ page, request }) => {
    const assets = await ledger('ent_gmass_209d19');
    const approved = assets.filter(isMediaDisplayable);
    test.skip(approved.length === 0, 'data/media-staging has no approved GMass image');

    const body = await (await request.get('/api/media?entity_id=ent_gmass_209d19')).json();
    expect(body).toMatchObject({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true });
    const offered = body.entities.ent_gmass_209d19 as PublicMediaAsset[];
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
      expect((await request.get(`/api/media/file?entity_id=ent_gmass_209d19&asset=${held.assetId}`)).status()).toBe(404);
    }

    // 画像は事例が出ている時だけ出る。画像欄に出るのは実画面（ストアの画面写真・製品画面）とアプリのアイコンだけで、
    // ファビコンだけの事例には画像欄を出さない
    await page.goto('/?entity=ent_gmass_209d19');
    await expect(page.getByRole('heading', { name: 'GMass', exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('#section-media')).toHaveCount(pickGalleryAssets(offered).length > 0 ? 1 : 0);
    await page.screenshot({ path: 'test-results/media-gallery-gmass.png' });
  });

  test('no held, blocked or person image is in any media response', async ({ request }) => {
    const entityIds = await listStagedEntityIds({ root: STAGING });
    test.skip(entityIds.length === 0, 'data/media-staging is empty');
    for (let start = 0; start < entityIds.length; start += 40) {
      const chunk = entityIds.slice(start, start + 40);
      const text = await (await request.get(`/api/media?${chunk.map((id) => `entity_id=${encodeURIComponent(id)}`).join('&')}`)).text();
      for (const id of chunk) {
        for (const asset of await ledger(id)) {
          if (isMediaDisplayable(asset)) expect(text).toContain(asset.assetId);
          else expect(text).not.toContain(asset.assetId);
        }
      }
      expect(text).not.toContain('owner-delegated');
    }
  });

  test('a list row shows the logo that the media API offers for it', async ({ page, request }) => {
    // Excalidraw's own favicon is not approved, so the API is answered for that row with a real, approved image (GMass's favicon)
    // to check how the row is wired: ids of the visible rows go out in one request, the answer becomes a 20px mark before the name.
    const real = await (await request.get('/api/media?entity_id=ent_gmass_209d19')).json();
    const favicon = (real.entities?.ent_gmass_209d19 as PublicMediaAsset[] | undefined)?.find((asset) => asset.kind === 'favicon');
    test.skip(!favicon, 'data/media-staging has no approved GMass favicon');

    const asked: string[][] = [];
    await page.route(/\/api\/media\?/, async (route) => {
      const ids = new URL(route.request().url()).searchParams.getAll('entity_id');
      asked.push(ids);
      await route.fulfill({
        json: { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true, entities: ids.includes('ent_excalidraw_c7820d') ? { ent_excalidraw_c7820d: [favicon] } : {} },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?entity=ent_excalidraw_c7820d');
    await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible({ timeout: 45_000 });

    const row = page.getByRole('row').filter({ hasText: 'Excalidraw' }).filter({ visible: true }).first();
    const logo = row.getByTestId('entity-logo');
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const box = await logo.boundingBox();
    expect(box && Math.round(box.width) === 20 && Math.round(box.height) === 20).toBe(true);
    await expect(logo).toHaveAttribute('title', favicon!.attribution);
    // Rows without an approved image get no mark at all.
    await expect(page.getByTestId('entity-logo').filter({ visible: true })).toHaveCount(1);
    await row.screenshot({ path: 'test-results/media-list-logo.png' });
    expect(asked.flat()).toContain('ent_excalidraw_c7820d');
    expect(Math.max(...asked.map((ids) => ids.length))).toBeLessThanOrEqual(40);
    expect(errors).toEqual([]);
  });
});

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { listStagedEntityIds, readEffectiveManifest } from '../src/shared/media-asset-store';
import { isMediaDisplayable, type EffectiveMediaAsset } from '../src/shared/media-decisions';
import { MEDIA_GALLERY_KINDS, PUBLIC_MEDIA_RESPONSE_SCHEMA, type PublicMediaAsset } from '../src/shared/media-display';

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
  test('the Photo AI inspector shows its approved pricing screenshot under the summary, with the source, and no held image', async ({ page }) => {
    const assets = await ledger('ent_photoai');
    const shown = assets.filter((asset) => isMediaDisplayable(asset) && MEDIA_GALLERY_KINDS.includes(asset.kind));
    test.skip(shown.length === 0, 'data/media-staging has no approved Photo AI gallery image (approve one with scripts/media/review-assets.ts)');

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?entity=ent_photoai');
    // The first image sits right under the summary and the key figure; any others are in 「製品画像」 further down.
    const hero = page.getByTestId('media-hero');
    await expect(hero).toBeVisible({ timeout: 45_000 });

    // One image per approved kind, loaded, each with its source text directly below it.
    const images = page.locator('[data-testid="media-hero-image"], [data-testid="media-gallery-image"]');
    await expect(images).toHaveCount(new Set(shown.map((asset) => asset.kind)).size);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    const pricing = shown.find((asset) => asset.kind === 'screenshot_pricing');
    if (pricing) {
      const figure = page.locator('figure').filter({ has: page.locator('[data-kind="screenshot_pricing"]') });
      const attribution = figure.locator('[data-testid="media-hero-attribution"], [data-testid="media-gallery-attribution"]');
      await expect(attribution).toHaveText(pricing.rights.attribution);
      const image = await figure.locator('img').boundingBox();
      const caption = await attribution.boundingBox();
      expect(image && caption && caption.y >= image.y + image.height - 1).toBe(true);
    }

    // Held, blocked and person images are nowhere in the page.
    const html = await page.content();
    for (const asset of assets.filter((candidate) => !isMediaDisplayable(candidate))) expect(html).not.toContain(asset.assetId);

    // No horizontal overflow from the new section.
    const pane = page.getByRole('complementary', { name: 'Photo AIの企業事例インスペクター' });
    await expect(pane).toHaveJSProperty('scrollWidth', await pane.evaluate((element) => element.clientWidth));

    await page.screenshot({ path: 'test-results/media-gallery-photoai.png' });
    expect(errors).toEqual([]);
  });

  test('the media API offers exactly the approved Keyence images and serves only those files', async ({ page, request }) => {
    const assets = await ledger('ent_keyence');
    const approved = assets.filter(isMediaDisplayable);
    test.skip(approved.length === 0, 'data/media-staging has no approved Keyence image');

    const body = await (await request.get('/api/media?entity_id=ent_keyence')).json();
    expect(body).toMatchObject({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true });
    const offered = body.entities.ent_keyence as PublicMediaAsset[];
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
      expect((await request.get(`/api/media/file?entity_id=ent_keyence&asset=${held.assetId}`)).status()).toBe(404);
    }

    // Keyence is not in data/catalog-release.json, so a production build shows the "not confirmed yet" notice instead of the
    // inspector. The gallery follows the case: it is shown when the case is shown and never on its own.
    await page.goto('/?entity=ent_keyence');
    const heading = page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true });
    const notice = page.getByRole('status').filter({ hasText: '詳細の公開確認が完了していない' });
    await expect(heading.or(notice).first()).toBeVisible({ timeout: 45_000 });
    if (await heading.isVisible()) {
      await expect(page.getByTestId('media-hero')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="media-hero"], #section-media')).toHaveCount(0);
    }
    await page.screenshot({ path: 'test-results/media-gallery-keyence.png' });
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
    // Photo AI's own favicon is not approved, so the API is answered for that row with a real, approved image (Keyence's favicon)
    // to check how the row is wired: ids of the visible rows go out in one request, the answer becomes a 20px mark before the name.
    const real = await (await request.get('/api/media?entity_id=ent_keyence')).json();
    const favicon = (real.entities?.ent_keyence as PublicMediaAsset[] | undefined)?.find((asset) => asset.kind === 'favicon');
    test.skip(!favicon, 'data/media-staging has no approved Keyence favicon');

    const asked: string[][] = [];
    await page.route(/\/api\/media\?/, async (route) => {
      const ids = new URL(route.request().url()).searchParams.getAll('entity_id');
      asked.push(ids);
      await route.fulfill({
        json: { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true, entities: ids.includes('ent_photoai') ? { ent_photoai: [favicon] } : {} },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible({ timeout: 45_000 });

    const row = page.getByRole('row').filter({ hasText: 'Photo AI' }).filter({ visible: true }).first();
    const logo = row.getByTestId('entity-logo');
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const box = await logo.boundingBox();
    expect(box && Math.round(box.width) === 20 && Math.round(box.height) === 20).toBe(true);
    await expect(logo).toHaveAttribute('title', favicon!.attribution);
    // Rows without an approved image get no mark at all.
    await expect(page.getByTestId('entity-logo').filter({ visible: true })).toHaveCount(1);
    await row.screenshot({ path: 'test-results/media-list-logo.png' });
    expect(asked.flat()).toContain('ent_photoai');
    expect(Math.max(...asked.map((ids) => ids.length))).toBeLessThanOrEqual(40);
    expect(errors).toEqual([]);
  });
});

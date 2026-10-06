import { test, expect } from '@playwright/test';
import { PRIMARY } from './reader-fixture';

// 公開済みの事例（GoRails）の詳細で、数値・推測・出典・メモの各区画に、どの画面幅でも届くこと。
// 詳細は entity.reader だけを読む（公開目録に入っている実際の reader。e2e/reader-fixture.ts の PRIMARY）。
for (const width of [390, 768, 960, 1440]) {
  test(`restored case content remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/?entity=${PRIMARY.id}`);
    const pane = page.getByRole('complementary', { name: `${PRIMARY.name}の企業事例インスペクター` });
    await expect(pane).toBeVisible();
    await expect(pane.locator('[data-fact="f1"]')).toContainText('Ruby on Rails の動画講座とコース');
    const metrics = pane.locator('#section-metrics');
    await metrics.scrollIntoViewIfNeeded();
    await expect(metrics).toBeVisible();
    await expect(metrics).toContainText('金額');
    const analysis = pane.locator('#section-analysis');
    await analysis.scrollIntoViewIfNeeded();
    await expect(analysis).toBeVisible();
    await expect(analysis.locator('[data-analysis]').first()).toBeVisible();
    const reasoning = pane.locator('#section-reasoning');
    await reasoning.scrollIntoViewIfNeeded();
    await expect(reasoning).toContainText('推測');
    const sources = pane.locator('#section-sources');
    await sources.scrollIntoViewIfNeeded();
    await expect(sources).toBeVisible();
    await expect(sources).toContainText('GoRails 料金ページ');
    await pane.getByRole('button', { name: 'メモ', exact: true }).click();
    await pane.locator('#section-notes').scrollIntoViewIfNeeded();
    await expect(pane.locator('#section-notes textarea')).toBeVisible();
    const bounds = await pane.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await expect(pane).toHaveJSProperty('scrollWidth', await pane.evaluate(el => el.clientWidth));
    expect(errors).toEqual([]);
  });
}

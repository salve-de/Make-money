import { test, expect } from '@playwright/test';

for (const width of [390, 768, 960, 1440]) {
  test(`restored case content remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?entity=ent_photoai');
    const pane = page.getByRole('complementary', { name: 'Photo AIの企業事例インスペクター' });
    await expect(pane).toBeVisible();
    await expect(pane.locator('#section-summary')).toContainText('事業の概要');
    const operations = pane.locator('#section-financial-operations');
    await operations.scrollIntoViewIfNeeded();
    await expect(operations).toBeVisible();
    await expect(operations).toContainText('ツール');
    const playbook = pane.locator('#section-playbook');
    await playbook.scrollIntoViewIfNeeded();
    await expect(playbook).toBeVisible();
    await expect(playbook).toContainText('実行');
    await pane.getByRole('button', { name: '出典・記録', exact: true }).click();
    await expect(pane.locator('#section-stream')).toBeVisible();
    await expect(pane.locator('#section-stream')).not.toHaveAttribute('hidden');
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

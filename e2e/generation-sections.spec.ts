import { expect, test } from '@playwright/test';

// 一覧は世代ごとに区切って出す（新しい世代が上、「第N世代（M件）」）。公開版の事例の世代は目録の値をそのまま使う。

for (const [name, viewport] of [['PC', { width: 1440, height: 1000 }], ['スマホ', { width: 390, height: 844 }]] as const) {
  test(`${name}: 世代ごとの区切りが新しい順に出る`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const headings = page.getByTestId('generation-heading').filter({ visible: true });
    await expect(headings.first()).toBeVisible();
    const texts = (await headings.allTextContents()).map((text) => text.trim());
    expect(texts[0]).toMatch(/^第3世代（\d+件）$/);
    expect(texts[1]).toMatch(/^第2世代（\d+件）$/);
    expect(texts[2]).toBe('第1世代（10件）');
  });
}

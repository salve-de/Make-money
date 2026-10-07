import { expect, test } from '@playwright/test';

// 一覧は世代ごとに区切って出す（新しい世代が上、「第N世代（M件）」）。公開版は今は第1世代だけなので、
// 応答の先頭の数件に世代を付けて、区切りが PC の表にもスマホのカードにも出ることを確かめる。
test.beforeEach(async ({ page }) => {
  await page.route('**/api/catalog*', async (route) => {
    const response = await route.fetch();
    const body = await response.json() as { data: { generation?: number }[] };
    body.data.forEach((entity, index) => { if (index < 2) entity.generation = 3; else if (index < 4) entity.generation = 2; });
    body.data.sort((a, b) => (b.generation ?? 1) - (a.generation ?? 1));
    await route.fulfill({ response, json: body });
  });
});

for (const [name, viewport] of [['PC', { width: 1440, height: 1000 }], ['スマホ', { width: 390, height: 844 }]] as const) {
  test(`${name}: 世代ごとの区切りが新しい順に出る`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const headings = page.getByTestId('generation-heading').filter({ visible: true });
    await expect(headings.first()).toBeVisible();
    const texts = (await headings.allTextContents()).map((text) => text.trim());
    expect(texts[0]).toBe('第3世代（2件）');
    expect(texts[1]).toBe('第2世代（2件）');
    expect(texts[2]).toMatch(/^第1世代（\d+件）$/);
  });
}

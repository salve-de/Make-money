import { expect, test } from '@playwright/test';
import { CATALOG_NAMES, PRIMARY } from './reader-fixture';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/businesses*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ source: 'local_fallback', data: [], nextCursor: null, hasMore: false }),
  }));
});

// SOLO は scale が SOLO と出典つきで確認できた事例だけ。公開版の10件は scale がどれも未確認なので、
// 読み込み直しても1件も出ない（未確認を一人運営として出さない）。絞り込み無しの一覧には10件とも出ることも確かめる。
test('SOLO deep link filters enterprise rows before and after reload', async ({ page }) => {
  await page.goto('/?filter=SOLO');
  const rows = page.getByRole('row').filter({ visible: true });
  const expectSoloOnly = async () => {
    // 絞り込みの結果が描かれるまで待つ（検索欄が出てから）
    await expect(page.getByPlaceholder(/会社名・事業/).first()).toBeVisible();
    // 一覧は描かれていて、見出しの行だけが残る（何も読めていないだけ、ではない）
    await expect(rows).toHaveCount(1);
    for (const name of CATALOG_NAMES) await expect(rows.filter({ hasText: name })).toHaveCount(0);
  };
  await expectSoloOnly();
  await page.reload();
  await expectSoloOnly();
  await page.goto('/');
  await expect(rows.filter({ hasText: PRIMARY.name })).toHaveCount(1);
});

test('batch deep links survive reload and removed URL parameters reset', async ({ page }) => {
  await page.goto('/?batch=missing-pr20-batch');
  const rows = page.getByRole('row').filter({ visible: true });
  await expect(rows).toHaveCount(1);
  await page.reload();
  await expect(rows).toHaveCount(1);
  await page.evaluate(() => window.history.pushState(null, '', '/'));
  await expect.poll(async () => rows.count()).toBeGreaterThan(1);
  await page.goBack();
  await expect(rows).toHaveCount(1);
  await page.goForward();
  await expect.poll(async () => rows.count()).toBeGreaterThan(1);
});

test('anonymous users never see the editorial bulk approval action', async ({ page }) => {
  await page.goto('/');
  const collectedInbox = page.getByRole('button', { name: /新着事例/ }).first();
  await expect(collectedInbox).toBeVisible();
  const filteredPage = page.waitForResponse((response) => {
    const url = new URL(response.url());
    if (url.pathname !== '/api/catalog') return false;
    const filters = JSON.parse(url.searchParams.get('filters') || '{}');
    return filters.tags?.includes('収集事例');
  });
  await collectedInbox.click();
  expect((await filteredPage).status()).toBe(200);
  await expect(page.getByRole('button', { name: /一括承認/ })).toHaveCount(0);
});

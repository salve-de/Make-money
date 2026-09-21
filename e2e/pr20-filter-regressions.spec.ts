import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/businesses*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ source: 'local_fallback', data: [], nextCursor: null, hasMore: false }),
  }));
});

test('SOLO deep link filters enterprise rows before and after reload', async ({ page }) => {
  await page.goto('/?filter=SOLO');
  const rows = page.getByRole('row').filter({ visible: true });
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await page.reload();
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
});

test('batch deep links survive reload and removed URL parameters reset', async ({ page }) => {
  await page.goto('/?batch=missing-pr20-batch');
  const rows = page.getByRole('row').filter({ visible: true });
  await expect(rows).toHaveCount(1);
  await page.reload();
  await expect(rows).toHaveCount(1);
  await page.evaluate(() => window.history.pushState(null, '', '/'));
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await page.goBack();
  await expect(rows).toHaveCount(1);
  await page.goForward();
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
});

test('anonymous users never see the editorial bulk approval action', async ({ page }) => {
  await page.goto('/');
  const collectedInbox = page.getByRole('button', { name: /収集事例/ }).first();
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

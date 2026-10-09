import { expect, test } from '@playwright/test';

// 公開前の点検: 404 が日本語で出ること、robots.txt と sitemap.xml が返ること、個人ページが検索に出ないこと。
test('存在しないアドレスは日本語の 404 画面になる', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'トップへ戻る' })).toBeVisible();
  // Next 自身の noindex と画面側の noindex で meta が複数になるため、すべてが noindex であることを見る
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
  expect(robots.length).toBeGreaterThan(0);
  for (const content of robots) expect(content).toMatch(/noindex/);
});

test('robots.txt は API と個人ページを拒否し、sitemap を指す', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('Disallow: /api/');
  expect(body).toContain('Disallow: /alerts');
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test('sitemap.xml は固定ページを含み、個人ページを含まない', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('/welcome');
  expect(body).not.toContain('/discover');
  expect(body).not.toContain('/alerts');
  expect(body).not.toContain('/maintenance');
});

test('個人ページと共通の共有画像', async ({ page, request }) => {
  await page.goto('/alerts');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const image = await request.get('/opengraph-image');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('メンテナンス画面は日本語で、検索に出さない', async ({ page }) => {
  await page.goto('/maintenance');
  await expect(page.getByRole('heading', { level: 1, name: 'ただいまメンテナンス中です' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

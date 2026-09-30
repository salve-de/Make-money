import { expect, test } from '@playwright/test';
import { routeReader } from './reader-fixture';

test('a fabricated local PRO flag never unlocks the ledger', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kin_pro_unlocked', 'true'));
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByText('UNLOCKED: 機関解錠済')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'PRO', exact: true })).toBeVisible();
  const response = await page.request.get('/api/company-analysis?entity_id=ent_photoai');
  expect([401, 403]).toContain(response.status());
});

// Photo AI は公開版の103社に入っていない（詳細は「準備中」）。財務の数字も作文も画面に出ないことを、そのまま確かめる。
test('ticker and welcome use the same amounts as the ledger', async ({ page }) => {
  await page.goto('/?entity=ent_photoai');
  const ticker = page.getByRole('complementary', { name: '台帳の財務サマリー' });
  await expect(ticker).toHaveCount(0);
  const inspector = page.getByRole('complementary', { name: 'Photo AIの企業事例インスペクター' });
  await expect(inspector).toContainText('この事例の詳細は準備中です。');
  await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
  await expect(inspector).not.toContainText('45億');
  await page.goto('/welcome');
  const preview = page.locator('a').filter({ hasText: 'Photo AI' });
  await expect(preview).toHaveCount(1);
  await expect(preview).toContainText('未確認');
  await expect(preview).not.toContainText('77.3%');
});

test('empty trend search clears selected detail and result statistics', async ({ page }) => {
  await page.goto('/?mode=ARCHETYPES');
  await page.getByPlaceholder('テーマを検索').first().fill('audit-no-matching-trend');
  await expect(page.getByText('0件', { exact: true })).toBeVisible();
  await expect(page.getByText('86.5%')).toHaveCount(0);
});

test('opening success without a payment cannot claim confirmation or grant access', async ({ page }) => {
  await page.goto('/success');
  await expect(page.getByRole('heading', { name: '決済情報が見つかりません' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('購入完了は確認できていません');
  await expect(page.getByText('PAYMENT_CONFIRMED')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('kin_pro_unlocked'))).not.toBe('true');
});

// 公開済みの事例（Plausible）の詳細に、利益が「未確認」の reader を載せて確かめる。0円の実測に見せず、出典リンクは安全な形で出る。
test('unconfirmed financials never present a zero as a measured result', async ({ page }) => {
  await routeReader(page, 'ent_plausible');
  await page.goto('/?entity=ent_plausible');
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary', { name: 'Plausible Analyticsの企業事例インスペクター' });
  await expect(inspector.locator('#section-metrics')).toBeVisible();
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  await expect(inspector).toContainText('未確認: 利益');
  await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
  const sources = page.locator('#section-sources');
  await expect(sources).toBeVisible();
  await expect(sources.getByRole('link', { name: /サンプル公式/ })).toHaveAttribute('href', /^https?:\/\//);
  const links = sources.getByRole('link');
  for (let i = 0; i < await links.count(); i += 1) {
    await expect(links.nth(i)).toHaveAttribute('href', /^https?:\/\//);
    await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(sources).not.toContainText('原本暗号保全済み');
});

test('an old duplicate entity URL still opens its canonical company', async ({ page }) => {
  await page.goto('/?entity=ent_business_72f423163f9c7ce9b932');
  await expect(page.getByRole('heading', { level: 2, name: /Ahrefs/ })).toBeVisible();
});

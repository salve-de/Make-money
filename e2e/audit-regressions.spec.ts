import { expect, test } from '@playwright/test';
import { PRIMARY } from './reader-fixture';

test('a fabricated local PRO flag never unlocks the ledger', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kin_pro_unlocked', 'true'));
  await page.goto(`/?entity=${PRIMARY.id}`);
  await expect(page.getByText('UNLOCKED: 機関解錠済')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'PRO', exact: true })).toBeVisible();
  const response = await page.request.get(`/api/company-analysis?entity_id=${PRIMARY.id}`);
  expect([401, 403]).toContain(response.status());
});

// 公開目録に無い事例（Photo AI）は、名前も数字も画面に出さない。/welcome に出す件数は公開件数だけ。
test('an unpublished case shows no name or numbers, and welcome shows only the published count', async ({ page }) => {
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByText('この事例は公開していません。')).toBeVisible();
  await expect(page.getByText('Photo AI')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /を参考に計画を作る|をもとに計画を作成/ })).toHaveCount(0);
  await page.goto('/welcome');
  await expect(page.getByText('3341')).toHaveCount(0);
  await expect(page.getByText('Photo AI')).toHaveCount(0);
});

test('opening success without a payment cannot claim confirmation or grant access', async ({ page }) => {
  await page.goto('/success');
  await expect(page.getByRole('heading', { name: '決済情報が見つかりません' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('購入完了は確認できていません');
  await expect(page.getByText('PAYMENT_CONFIRMED')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('kin_pro_unlocked'))).not.toBe('true');
});

// 公開済みの事例（GoRails）は利益・費用・道具が未確認。0円の実測に見せず、出典リンクは安全な形で出る。
test('unconfirmed financials never present a zero as a measured result', async ({ page }) => {
  await page.goto(`/?entity=${PRIMARY.id}`);
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary', { name: `${PRIMARY.name}の企業事例インスペクター` });
  await expect(inspector.locator('#section-metrics')).toBeVisible();
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  await expect(inspector).not.toContainText(PRIMARY.unconfirmed);
  await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
  const sources = page.locator('#section-sources');
  await expect(sources).toBeVisible();
  await expect(sources.getByRole('link', { name: /GoRails 料金ページ/ })).toHaveAttribute('href', 'https://gorails.com/pricing');
  const links = sources.getByRole('link');
  expect(await links.count()).toBeGreaterThan(0);
  for (let i = 0; i < await links.count(); i += 1) {
    await expect(links.nth(i)).toHaveAttribute('href', /^https?:\/\//);
    await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(sources).not.toContainText('原本暗号保全済み');
});

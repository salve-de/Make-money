import { expect, test } from '@playwright/test';

test('a fabricated local PRO flag never unlocks the ledger', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kin_pro_unlocked', 'true'));
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByText('UNLOCKED: 機関解錠済')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '財務台帳', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Playbook', exact: true })).toBeVisible();
});

test('ticker and welcome use the same amounts as the ledger', async ({ page }) => {
  await page.goto('/?entity=ent_photoai');
  const ticker = page.getByRole('complementary', { name: '台帳の財務サマリー' });
  await expect(ticker).toContainText('Photo AI: 月商 未確認 / 営業利益率 未確認');
  await expect(ticker).not.toContainText('MARKET LIVE');
  await expect(ticker).not.toContainText('45億');
  await page.goto('/welcome');
  const preview = page.locator('a').filter({ hasText: 'Photo AI' }).filter({ hasText: '未確認/月' });
  await expect(preview).toHaveCount(1);
  await expect(preview).not.toContainText('77.3%');
});

test('empty trend search clears selected detail and result statistics', async ({ page }) => {
  await page.goto('/?mode=ARCHETYPES');
  await page.getByPlaceholder('歪み・手口・大手の弱点を検索...').fill('audit-no-matching-trend');
  await expect(page.getByText('注目例 0件')).toBeVisible();
  await expect(page.getByText('86.5%')).toHaveCount(0);
});

test('opening success without a payment cannot claim confirmation or grant access', async ({ page }) => {
  await page.goto('/success');
  await expect(page.getByRole('heading', { name: '決済状況の確認' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('購入完了は確認できていません');
  await expect(page.getByText('PAYMENT_CONFIRMED')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('kin_pro_unlocked'))).not.toBe('true');
});

test('unconfirmed financials never present a zero as a measured result', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('銘柄名・手口・タグ・裏帳簿を検索...').fill('Clubhouse');
  await page.getByRole('row').filter({ hasText: 'Clubhouse' }).click();
  await expect(page.getByRole('heading', { name: 'Clubhouse (Alpha Exploration)', exact: true })).toBeVisible();
  await expect(page.getByText('金額・費用の裏付けは未確認。').first()).toBeVisible();
  await page.getByRole('button', { name: '財務P&L 未確認' }).click();
  const financials = page.locator('#section-financial');
  await expect(financials).toBeInViewport();
  await expect(financials).toContainText('財務データは未確認');
  await expect(financials.getByRole('table')).toHaveCount(0);
  await expect(financials).not.toContainText('¥0');
});

test('an old duplicate entity URL still opens its canonical company', async ({ page }) => {
  await page.goto('/?entity=ent_business_72f423163f9c7ce9b932');
  await expect(page.getByRole('heading', { level: 2, name: /Ahrefs/ })).toBeVisible();
});

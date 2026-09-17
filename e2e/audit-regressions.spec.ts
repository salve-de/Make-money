import { expect, test } from '@playwright/test';

test('a fabricated local PRO flag never unlocks the ledger', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kin_pro_unlocked', 'true'));
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByText('UNLOCKED: 機関解錠済')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '【本丸】資本主義の裏帳簿', exact: true })).toBeVisible();
  const response = await page.request.get('/api/company-analysis?entity_id=ent_photoai');
  expect([401, 403]).toContain(response.status());
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
  await page.getByPlaceholder('歪み・手口・大手の弱点を検索...').first().fill('audit-no-matching-trend');
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
  // Keep this regression on the same canonical Photo AI deep-link contract
  // exercised elsewhere in the suite; ticker membership is intentionally not
  // a prerequisite for opening a dossier.
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /現金の解剖室/ }).click();
  const financials = page.locator('#section-cash-anatomy');
  await expect(financials).toBeInViewport();
  await expect(financials).toContainText('財務データ未確認');
  await expect(financials.getByRole('table')).toHaveCount(0);
  await expect(financials).not.toContainText('¥0');
});

test('an old duplicate entity URL still opens its canonical company', async ({ page }) => {
  await page.goto('/?entity=ent_business_72f423163f9c7ce9b932');
  await expect(page.getByRole('heading', { level: 2, name: /Ahrefs/ })).toBeVisible();
});

import { expect, test } from '@playwright/test';

// 2026-09-29 表示契約: 機械的正直化された PARTIAL 記録は表示され、再監査中の注記を出す。
// 出典付きで保持された記録（Keyence）には注記が出ない。
const PARTIAL_ID = 'ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286';
const PARTIAL_NEWSLETTER_ID = 'ent_ebizfacts_ryansneddonnaptownscoop300kyearlocalnewslett_1e614f249087';
const KEPT_ID = 'ent_plaid_K5R9T3LM'; // 出典URL付きで保持された記録（機関投資家向け別扱いの Keyence は使わない）

test.describe('honest catalog display contract', () => {
  test('a demoted PARTIAL record is displayed with the re-audit notice and no fabricated revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_ID}`);
    await expect(page.getByRole('heading', { name: /Steve Hanov/ })).toBeVisible({ timeout: 45_000 });
    const notice = page.getByTestId('reaudit-partial-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('再監査中');
    await expect(page.getByText('【月商150万円】')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/honest-partial-steve-hanov.png', fullPage: false });
  });

  test('the newsletter record no longer shows the fabricated 4,500万円 monthly revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_NEWSLETTER_ID}`);
    await expect(page.getByRole('heading', { name: /Ryan Sneddon/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('reaudit-partial-notice')).toBeVisible();
    await expect(page.getByText(/4,?500万円/)).toHaveCount(0);
    await page.screenshot({ path: 'test-results/honest-partial-naptown-scoop.png', fullPage: false });
  });

  test('a record kept with a source shows no re-audit notice', async ({ page }) => {
    await page.goto(`/?entity=${KEPT_ID}`);
    await expect(page.getByRole('heading', { name: /Plaid/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('reaudit-partial-notice')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/kept-with-source-plaid.png', fullPage: false });
  });
});

import { expect, test } from '@playwright/test';

// 表示契約: 機械的に正直化された PARTIAL 記録（eBiz の作文）は公開版の103社に入らない。
// 一覧には出ても、詳細は「準備中」で、作文の数字（月商150万円・月4,500万円）も再監査の注記も画面に出さない。
// 出典URL付きで保持された記録（Plaid）にも注記は出ない。
const PARTIAL_ID = 'ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286';
const PARTIAL_NEWSLETTER_ID = 'ent_ebizfacts_ryansneddonnaptownscoop300kyearlocalnewslett_1e614f249087';
const KEPT_ID = 'ent_plaid_K5R9T3LM'; // 出典URL付きで保持された記録（機関投資家向け別扱いの Keyence は使わない）

test.describe('honest catalog display contract', () => {
  test('a demoted PARTIAL record shows only the pending notice and no fabricated revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_ID}`);
    await expect(page.getByRole('heading', { name: /Steve Hanov/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('complementary', { name: /Steve Hanov.*インスペクター/ })).toContainText('この事例の詳細は準備中です。');
    await expect(page.getByTestId('reaudit-partial-notice')).toHaveCount(0);
    await expect(page.getByText('【月商150万円】')).toHaveCount(0);
    await expect(page.getByText(/月商150万円/)).toHaveCount(0);
    await page.screenshot({ path: 'test-results/honest-partial-steve-hanov.png', fullPage: false });
  });

  test('the newsletter record no longer shows the fabricated 4,500万円 monthly revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_NEWSLETTER_ID}`);
    await expect(page.getByRole('heading', { name: /Ryan Sneddon/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('complementary', { name: /Ryan Sneddon.*インスペクター/ })).toContainText('この事例の詳細は準備中です。');
    await expect(page.getByTestId('reaudit-partial-notice')).toHaveCount(0);
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

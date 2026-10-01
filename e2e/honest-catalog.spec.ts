import { expect, test } from '@playwright/test';

// 表示契約: 機械的に正直化された記録（eBiz の作文）や出典が確認できない記録は公開目録（103社）に入らない。
// 目録に無い事例は、名前も作文の数字（月商150万円・月4,500万円）も再監査の注記も画面に出さず、「公開していません」だけを出す。
const PARTIAL_ID = 'ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286';
const PARTIAL_NEWSLETTER_ID = 'ent_ebizfacts_ryansneddonnaptownscoop300kyearlocalnewslett_1e614f249087';
const UNPUBLISHED_WITH_SOURCE_ID = 'ent_plaid_K5R9T3LM';

test.describe('honest catalog display contract', () => {
  test('a demoted PARTIAL record shows no name and no fabricated revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_ID}`);
    await expect(page.getByText('この事例は公開していません。')).toBeVisible();
    await expect(page.getByText(/Steve Hanov/)).toHaveCount(0);
    await expect(page.getByTestId('reaudit-partial-notice')).toHaveCount(0);
    await expect(page.getByText(/月商150万円/)).toHaveCount(0);
  });

  test('the newsletter record no longer shows the fabricated 4,500万円 monthly revenue', async ({ page }) => {
    await page.goto(`/?entity=${PARTIAL_NEWSLETTER_ID}`);
    await expect(page.getByText('この事例は公開していません。')).toBeVisible();
    await expect(page.getByText(/Ryan Sneddon/)).toHaveCount(0);
    await expect(page.getByText(/4,?500万円/)).toHaveCount(0);
  });

  test('a record that is not in the catalog shows no re-audit notice either', async ({ page }) => {
    await page.goto(`/?entity=${UNPUBLISHED_WITH_SOURCE_ID}`);
    await expect(page.getByText('この事例は公開していません。')).toBeVisible();
    await expect(page.getByText(/Plaid/)).toHaveCount(0);
    await expect(page.getByTestId('reaudit-partial-notice')).toHaveCount(0);
  });
});

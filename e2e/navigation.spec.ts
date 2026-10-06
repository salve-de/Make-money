import { openNotes, selectCompany } from './inspector-actions';
import { expect, test } from '@playwright/test';
import { CATALOG_NAMES, PRIMARY, SECONDARY } from './reader-fixture';

// Exercise real controls and redirects without AI generation, payment, or data mutations.
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    console.log('NAVIGATION_FAILURE_DOM', JSON.stringify({
      url: page.url(),
      headings: await page.locator('h1,h2,h3').allTextContents(),
      buttons: await page.getByRole('button').allTextContents(),
    }));
  }
});

test('search and screener change the company list and reset cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const search = page.getByPlaceholder(/会社名・事業/).first();
  // 詳細（aside）の中の数値の表にも行があるので、事例一覧の行だけを数える
  const rows = page.getByRole('row').and(page.locator(':not(aside *)')).filter({ visible: true });
  await search.fill(PRIMARY.name);
  await expect(rows.filter({ hasText: PRIMARY.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: SECONDARY.name })).toHaveCount(0);
  await rows.filter({ hasText: PRIMARY.name }).click();
  await expect(page.getByRole('heading', { level: 2, name: PRIMARY.name })).toBeVisible();
  await search.fill('no-matching-company-architecture-smoke');
  await expect(rows).toHaveCount(1);
  await search.fill('');
  // 公開版の10件はどれも scale が未確認（UNKNOWN）。「一人で運営」は scale が SOLO と出典つきで確認できた事例だけなので、
  // 10件のどれも出ない。絞り込みの外では10件とも出ていることを、解除したあとに確かめる。
  await page.getByRole('button', { name: '条件を絞る' }).click();
  await page.getByRole('button', { name: '一人で運営', exact: true }).click();
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(rows).toHaveCount(1);
  for (const name of CATALOG_NAMES) await expect(rows.filter({ hasText: name })).toHaveCount(0);
  await page.getByRole('button', { name: '絞り込み条件をすべて解除', exact: true }).click();
  await search.fill(SECONDARY.name);
  await expect(rows.filter({ has: page.getByText(SECONDARY.name, { exact: true }) })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('analyst note survives reload and remains attached to the selected company', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?entity=${PRIMARY.id}`);
  await openNotes(page);
  const note = page.locator('#section-notes textarea');
  await note.fill('Smoke note: verify the quoted operating margin before comparison.');
  await page.reload();
  await openNotes(page);
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, SECONDARY.name);
  await expect(note).not.toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, PRIMARY.name);
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  expect(errors).toEqual([]);
});

test('legacy finder redirects into the usable current ledger rather than a deleted sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: '事例を検索・絞り込み' })).toBeVisible();
  await selectCompany(page, PRIMARY.name);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toHaveCount(0);
  await selectCompany(page, PRIMARY.name);
  expect(errors).toEqual([]);
});

for (const raw of ['null', '{}', JSON.stringify([null, 42, PRIMARY.id])]) {
  test(`malformed viewing history does not crash the ledger: ${raw}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((raw) => localStorage.setItem('mm_viewed_entity_history_v1', raw), raw);
    await page.goto(`/?entity=${PRIMARY.id}`);
    await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible();
    await selectCompany(page, SECONDARY.name);
    await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}


test('leaving a topic for the ledger clears topic routing and survives reload', async ({ page }) => {
  await page.goto('/?topic=solo_empire');
  await page.getByRole('navigation', { name: '主要ナビゲーション', exact: true }).getByRole('link', { name: '事例', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: '事例を検索・絞り込み' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '事例を検索・絞り込み' })).toBeVisible();
});

test('closing a case leaves no history entry that reopens it', async ({ page }) => {
  await page.goto('/welcome');
  await page.goto('/');
  await selectCompany(page, SECONDARY.name);
  await expect(page).toHaveURL(/entity=/);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page).not.toHaveURL(/entity=/);
  await expect(page.getByRole('heading', { level: 2, name: SECONDARY.name, exact: true })).toHaveCount(0);
  // 閉じたあとに「戻る」を押しても、閉じた事例は開かず前のページへ戻る
  await page.goBack();
  await expect(page).toHaveURL(/\/welcome$/);
});

// 本番の既定表示: 公開目録が届いたら先頭の事例を PC 幅で自動表示する。閉じたら開き直さず、スマホ幅では開かない。
test('default view auto-selects the first published case on desktop only', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const inspector = page.getByRole('complementary', { name: /の企業事例インスペクター/ });
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.waitForTimeout(800);
  await expect(inspector).toHaveCount(0);

  const phone = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const mobile = await phone.newPage();
  const requests: string[] = [];
  mobile.on('request', (req) => { if (req.url().includes('/api/businesses') && req.url().includes('entity_id=')) requests.push(req.url()); });
  await mobile.goto('/');
  await mobile.waitForTimeout(1500);
  await expect(mobile.getByRole('complementary', { name: /の企業事例インスペクター/ })).toHaveCount(0);
  expect(requests).toEqual([]);
  await phone.close();
  expect(errors).toEqual([]);
});

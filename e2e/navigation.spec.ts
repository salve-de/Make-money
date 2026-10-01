import { openNotes, selectCompany } from './inspector-actions';
import { expect, test } from '@playwright/test';

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
  const search = page.getByPlaceholder(/会社名・ティッカー/).first();
  const rows = page.getByRole('row').filter({ visible: true });
  await search.fill('Excalidraw');
  await expect(rows.filter({ hasText: 'Excalidraw' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'GMass' })).toHaveCount(0);
  await rows.filter({ hasText: 'Excalidraw' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Excalidraw/ })).toBeVisible();
  await search.fill('no-matching-company-architecture-smoke');
  await expect(rows).toHaveCount(1);
  await search.fill('');
  // 「一人で運営」は scale が SOLO と出典つきで確認できた事例だけ。公開版に入る Updown.io が残り、
  // 規模が未確認の Excalidraw や、公開目録に無い Bird Global は出ない。
  await page.getByRole('button', { name: '条件を絞る' }).click();
  await page.getByRole('button', { name: '一人で運営', exact: true }).click();
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(rows.filter({ hasText: 'Updown.io' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'Excalidraw' })).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Bird Global' })).toHaveCount(0);
  await page.getByRole('button', { name: '絞り込み条件をすべて解除', exact: true }).click();
  await search.fill('GMass');
  await expect(rows.filter({ has: page.getByText('GMass', { exact: true }) })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('analyst note survives reload and remains attached to the selected company', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openNotes(page);
  const note = page.locator('#section-notes textarea');
  await note.fill('Smoke note: verify the quoted operating margin before comparison.');
  await page.reload();
  await openNotes(page);
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, 'GMass');
  await expect(note).not.toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, 'Excalidraw');
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  expect(errors).toEqual([]);
});

test('legacy finder redirects into the usable current ledger rather than a deleted sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible();
  await selectCompany(page, 'Excalidraw');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toHaveCount(0);
  await selectCompany(page, 'Excalidraw');
  expect(errors).toEqual([]);
});

for (const raw of ['null', '{}', '[null,42,"ent_excalidraw_c7820d"]']) {
  test(`malformed viewing history does not crash the ledger: ${raw}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((raw) => localStorage.setItem('mm_viewed_entity_history_v1', raw), raw);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible();
    await selectCompany(page, 'GMass');
    await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}


test('leaving a topic for the ledger clears topic routing and survives reload', async ({ page }) => {
  await page.goto('/?topic=solo_empire');
  await page.getByRole('navigation', { name: '主要ナビゲーション', exact: true }).getByRole('link', { name: '事例一覧', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: '事例を検索・絞り込み' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '事例を検索・絞り込み' })).toBeVisible();
});

test('closing a case leaves no history entry that reopens it', async ({ page }) => {
  await page.goto('/welcome');
  await page.goto('/');
  await selectCompany(page, 'GMass');
  await expect(page).toHaveURL(/entity=/);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page).not.toHaveURL(/entity=/);
  await expect(page.getByRole('heading', { level: 2, name: 'GMass', exact: true })).toHaveCount(0);
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

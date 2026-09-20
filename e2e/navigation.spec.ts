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
  const search = page.getByPlaceholder(/銘柄名/).first();
  const rows = page.getByRole('row').filter({ visible: true });
  await search.fill('Photo AI');
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await rows.filter({ hasText: 'Photo AI' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Photo AI/ })).toBeVisible();
  await search.fill('no-matching-company-architecture-smoke');
  await expect(rows).toHaveCount(1);
  await search.fill('');
  await page.getByRole('button', { name: '多条件スクリーニング' }).click();
  await page.getByRole('button', { name: '完全1人 (ソロ)', exact: true }).click();
  await page.getByRole('button', { name: '条件適用', exact: true }).click();
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await page.getByTitle('スクリーナー条件を解除', { exact: true }).click();
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(1);
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
  await selectCompany(page, 'Photo AI');
  await expect(note).not.toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, 'キーエンス (KEYENCE)');
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  expect(errors).toEqual([]);
});

test('playbook tabs render their datasets and macro redirects back to the same product', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.log('PLAYBOOK_PAGE_ERROR', error.message); });
  await page.goto('/playbook', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: /事業・ツールの参考プレイブック/ })).toBeVisible();
  // Select the tab explicitly: the assertion concerns its content and click behavior.
  await page.getByRole('button', { name: /ツール勢力図・乗り換え推移/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'ツール構成と乗り換えの参考例', exact: true })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('参考サンプル・一次証跡未確認');
  await expect(page.getByText('123社 ヘッダー検証済', { exact: true })).toHaveCount(0);
  for (const [tab, heading] of [
    ['賞味期限アラート', '即死判定格下げアラート'],
    ['稼ぎの型の参考例', '事業の組み立てを考える参考プレイブック'],
    ['初動突破ゲリラ戦録', '初動獲得の参考事例'],
    ['黄金スタックレシピ', '黄金スタック構成レシピ'],
  ]) {
    await page.getByRole('button', { name: new RegExp(tab) }).click();
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(heading) })).toBeVisible();
  }
  await page.goto('/macro');
  await expect(page).toHaveURL(/\/playbook$/);
  await expect(page.getByRole('heading', { level: 1, name: /事業・ツールの参考プレイブック/ })).toBeVisible();
  await page.getByRole('button', { name: /ツール勢力図・乗り換え推移/ }).click();
  await page.getByRole('main').getByText('Photo AI', { exact: true }).first().click();
  await expect(page).toHaveURL(/entity=ent_photoai/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 2, name: /Photo AI/ })).toBeVisible();
  await page.goto('/playbook');
  await page.getByRole('link', { name: '← 個別企業台帳 (Ledger)' }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});

test('legacy finder redirects into the usable current ledger rather than a deleted sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await selectCompany(page, 'Photo AI');
  await page.getByTitle('閉じる (Esc)', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toHaveCount(0);
  await selectCompany(page, 'Photo AI');
  expect(errors).toEqual([]);
});

test('legacy finder and macro links still reach their canonical routes', async ({ page }) => {
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await page.goto('/macro');
  await expect(page).toHaveURL(/\/playbook$/);
  await expect(page.getByRole('heading', { level: 1, name: /事業・ツールの参考プレイブック/ })).toBeVisible();
  await page.getByRole('link', { name: '← 個別企業台帳 (Ledger)' }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible({ timeout: 15000 });
});

for (const raw of ['null', '{}', '[null,42,"ent_photoai"]']) {
  test(`malformed viewing history does not crash the ledger: ${raw}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((raw) => localStorage.setItem('mm_viewed_entity_history_v1', raw), raw);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await selectCompany(page, 'Photo AI');
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

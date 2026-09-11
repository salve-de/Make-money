import { expect, test } from '@playwright/test';

// These routes use checked-in content. Nothing submits AI generation or payment requests.
test('search and screener change the company list and reset cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const search = page.getByPlaceholder('銘柄名・手口・タグ・裏帳簿を検索...');
  const rows = page.getByRole('row').filter({ visible: true });
  await search.fill('Photo AI');
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await rows.filter({ hasText: 'Photo AI' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Photo AI/ })).toBeVisible();
  await search.fill('no-matching-company-architecture-smoke');
  await expect(rows).toHaveCount(1); // header only
  await search.fill('');
  await page.getByRole('button', { name: '50軸スクリーニング' }).click();
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
  await page.getByTitle('極秘考察メモ', { exact: true }).click();
  const note = page.locator('#section-notes textarea');
  await note.fill('Smoke note: verify the quoted operating margin before comparison.');
  await page.reload();
  await page.getByTitle('極秘考察メモ', { exact: true }).click();
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await page.getByTitle('次銘柄', { exact: true }).click();
  await expect(note).not.toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await page.getByTitle('前銘柄', { exact: true }).click();
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  expect(errors).toEqual([]);
});

test('playbook tabs render their datasets and macro redirects back to the same product', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playbook');
  await expect(page.getByRole('heading', { level: 1, name: /事業・ツールの参考プレイブック/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /ツール構成と乗り換えの参考例/ })).toBeVisible();
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
  await page.getByRole('main').getByText('Photo AI', { exact: true }).first().click();
  await expect(page).toHaveURL(/entity=ent_photoai/);
  await expect(page.getByRole('heading', { level: 2, name: /Photo AI/ })).toBeVisible();
  await page.goto('/playbook');
  await page.getByRole('link', { name: '← 個別企業台帳 (Ledger)' }).click();
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('finder opens and closes an existing company financial sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/finder');
  await expect(page.getByRole('button', { name: '企業財務DB', exact: true })).toBeVisible();
  const search = page.getByPlaceholder('銘柄・手法を検索...');
  await search.fill('オークション');
  await expect(page.getByRole('heading', { level: 2, name: /虚栄心オークション/ })).toBeVisible();
  await search.fill('no-finder-match-smoke');
  await expect(page.getByText('検索条件に一致するモデルが見つかりません')).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: '利益率', exact: true }).click();
  await page.getByRole('button', { name: '企業財務DB', exact: true }).click();
  await expect(page.getByText('事業詳細・財務構造分析シート', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByText('事業詳細・財務構造分析シート', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});


test('finder navigation reaches the current ledger and signals routes', async ({ page }) => {
  await page.goto('/finder');
  await page.getByRole('button', { name: 'シグナル Signals' }).click();
  await expect(page).toHaveURL(/\/playbook$/);
  await expect(page.getByRole('heading', { level: 1, name: /事業・ツールの参考プレイブック/ })).toBeVisible();
  await page.goto('/finder');
  await page.getByRole('button', { name: '台帳 Explore' }).click();
  await expect(page).toHaveURL(/mode=LEDGER/);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
});

for (const raw of ['null', '{}', '[null,42,"ent_photoai"]']) {
  test(`malformed viewing history does not crash the ledger: ${raw}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((raw) => localStorage.setItem('mm_viewed_entity_history_v1', raw), raw);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await page.getByTitle('次銘柄', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

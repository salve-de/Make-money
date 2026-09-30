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
  await search.fill('Photo AI');
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await rows.filter({ hasText: 'Photo AI' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Photo AI/ })).toBeVisible();
  await search.fill('no-matching-company-architecture-smoke');
  await expect(rows).toHaveCount(1);
  await search.fill('');
  // 「一人で運営」は scale が SOLO と出典つきで確認できた事例だけ。公開版に入る Updown.io が残り、
  // 規模が未確認の Photo AI や大企業の Bird Global・キーエンスは出ない。
  await page.getByRole('button', { name: '条件を絞る' }).click();
  await page.getByRole('button', { name: '一人で運営', exact: true }).click();
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(rows.filter({ hasText: 'Updown.io' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'Photo AI' })).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Bird Global' })).toHaveCount(0);
  await expect(rows.filter({ hasText: 'キーエンス (KEYENCE)' })).toHaveCount(0);
  await page.getByRole('button', { name: '絞り込み条件をすべて解除', exact: true }).click();
  await search.fill('Ahrefs');
  await expect(rows.filter({ has: page.getByText('Ahrefs', { exact: true }) })).toHaveCount(1);
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
  await selectCompany(page, 'Ahrefs');
  await expect(note).not.toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  await selectCompany(page, 'Photo AI');
  await expect(note).toHaveValue('Smoke note: verify the quoted operating margin before comparison.');
  expect(errors).toEqual([]);
});

test('playbook tabs render their datasets and macro redirects back to the same product', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.log('PLAYBOOK_PAGE_ERROR', error.message); });
  await page.goto('/playbook', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: /手口と道具/ })).toBeVisible();
  // Select the tab explicitly: the assertion concerns its content and click behavior.
  await page.getByRole('button', { name: /ツール構成/ }).click();
  await expect(page.getByLabel('用途', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '公式資料を開く ↗' }).first()).toHaveAttribute('href', /^https:\/\//);
  await expect(page.getByText('123社 ヘッダー検証済', { exact: true })).toHaveCount(0);
  for (const [tab, heading] of [
    ['失敗と見直し', '基盤サービスへの依存'],
    ['事業の型', 'アプリ開発用テンプレートの販売'],
    ['初期の顧客獲得', '既存の作業に組み込む'],
    ['技術構成の参考', '小さく始めるWebサービス'],
  ]) {
    await page.getByRole('button', { name: new RegExp(tab) }).click();
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
  }
  await page.goto('/macro');
  await expect(page).toHaveURL(/\/playbook$/);
  await expect(page.getByRole('heading', { level: 1, name: /手口と道具/ })).toBeVisible();
  await page.getByRole('button', { name: /ツール構成/ }).click();
  await page.getByRole('button', { name: '初期の顧客獲得', exact: true }).click();
  await page.getByRole('link', { name: '参考事例: Nomad List', exact: true }).first().click();
  await expect(page).toHaveURL(/entity=ent_nomadlist/, { timeout: 15000 });
  await expect(page.getByRole('status')).toContainText('Nomad List：詳細の公開確認が完了していない');
  await expect(page.getByRole('heading', { name: 'Nomad List', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Nomad Listを参考に計画を作る' })).toHaveAttribute('href', '/execute/ent_nomadlist');
  await page.goto('/playbook');
  await page.getByRole('link', { name: 'Make Money', exact: true }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});

test('legacy finder redirects into the usable current ledger rather than a deleted sheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  await selectCompany(page, 'Photo AI');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toHaveCount(0);
  await selectCompany(page, 'Photo AI');
  expect(errors).toEqual([]);
});

test('legacy finder and macro links still reach their canonical routes', async ({ page }) => {
  await page.goto('/finder');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  await page.goto('/macro');
  await expect(page).toHaveURL(/\/playbook$/);
  await expect(page.getByRole('heading', { level: 1, name: /手口と道具/ })).toBeVisible();
  await page.getByRole('link', { name: 'Make Money', exact: true }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible({ timeout: 15000 });
});

for (const raw of ['null', '{}', '[null,42,"ent_photoai"]']) {
  test(`malformed viewing history does not crash the ledger: ${raw}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((raw) => localStorage.setItem('mm_viewed_entity_history_v1', raw), raw);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
    await selectCompany(page, 'Ahrefs');
    await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toHaveCount(0);
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
  await selectCompany(page, 'Ahrefs');
  await expect(page).toHaveURL(/entity=/);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page).not.toHaveURL(/entity=/);
  await expect(page.getByRole('heading', { level: 2, name: 'Ahrefs', exact: true })).toHaveCount(0);
  // 閉じたあとに「戻る」を押しても、閉じた事例は開かず前のページへ戻る
  await page.goBack();
  await expect(page).toHaveURL(/\/welcome$/);
});

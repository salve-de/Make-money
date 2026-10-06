import { expect, test } from '@playwright/test';
import { PRIMARY } from './reader-fixture';

// 手元で起動済みのサーバー向け（BASE_URL）。事例 → 「これで作る」→ 材料として表示 → 事業検討の開始、と一覧の見出し。

test('「これで作る」で事例が材料として /build に出て、事業検討に事例が渡る', async ({ page }) => {
  await page.goto(`/?entity=${PRIMARY.id}`);
  const make = page.getByRole('link', { name: new RegExp(`${PRIMARY.name}をもとに事業を作る`) }).filter({ visible: true }).first();
  await expect(make).toHaveAttribute('href', `/build?case=${PRIMARY.id}`);
  await make.click();

  await expect(page).toHaveURL(new RegExp(`/build\\?case=${PRIMARY.id}`));
  const material = page.getByTestId('build-material');
  await expect(material).toContainText(PRIMARY.name);
  const start = material.getByRole('link', { name: 'この事例を材料に案を作る' });
  await expect(start).toHaveAttribute('href', `/?mode=SYNTHESIS&entity=${PRIMARY.id}`);
  await page.screenshot({ path: 'test-results/build-material.png', fullPage: true });
  await start.click();
  await expect(page).toHaveURL(/mode=SYNTHESIS/);
  await expect(page).toHaveURL(new RegExp(`entity=${PRIMARY.id}`));
  await expect(page.getByText(PRIMARY.name).first()).toBeVisible();
});

test('不正な事例IDや公開目録に無いIDは材料にしない', async ({ page }) => {
  for (const value of ['%3Cscript%3E', 'ent_not_in_catalog_zzzz']) {
    await page.goto(`/build?case=${value}`);
    await expect(page.getByRole('heading', { level: 1, name: '作る' })).toBeVisible();
    await expect(page.getByRole('link', { name: '事業検討で案を作る' })).toBeVisible();
    await expect(page.getByTestId('build-material')).toHaveCount(0);
  }
});

test('一覧の見出しが検索・絞り込みに合わせて更新され、解除で戻る', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const title = page.locator('.term-panel-title').filter({ hasText: '事例一覧' }).first();
  await expect(title).toContainText('条件なし');

  const search = page.getByPlaceholder(/会社名・事業/).first();
  await search.fill(PRIMARY.name);
  await expect(title).toContainText(`検索「${PRIMARY.name}」`);
  await expect(title).not.toContainText('条件なし');
  await expect(title).toContainText('1件');
  await page.screenshot({ path: 'test-results/ledger-title-search.png' });

  await search.fill('no-match-build-from-case-zzzz');
  await expect(title).toContainText('検索「no-match-build-from-case-zzzz」');
  await expect(title).toContainText('0件');

  await search.fill('');
  await expect(title).toContainText('条件なし');
  await expect(title).toContainText('10件');

  await page.goto('/?filter=SOLO');
  await expect(title).toContainText('一人で運営');
  await expect(title).not.toContainText('条件なし');
});

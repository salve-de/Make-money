import { expect, test, type Page } from '@playwright/test';

// 保存・メモ・比較・保存条件の通し確認（未ログイン）。
// 開発サーバーに向けるときは E2E_BASE_URL=http://127.0.0.1:3130 を指定する（未指定なら playwright.config.ts の baseURL）。
const baseURL = process.env.E2E_BASE_URL;
if (baseURL) test.use({ baseURL });
test.setTimeout(300_000);

async function firstCases(page: Page, count: number): Promise<{ id: string; name: string }[]> {
  const response = await page.request.get('/api/catalog?limit=10');
  const body = await response.json() as { data: { id: string; name: string }[] };
  return body.data.slice(0, count).map(({ id, name }) => ({ id, name }));
}

const shotsDir = process.env.E2E_SHOTS_DIR;
async function shoot(page: Page, name: string) {
  if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png` });
}

const WIDTHS: { label: string; width: number; height: number }[] = [
  { label: 'PC', width: 1440, height: 900 },
  { label: 'スマホ390', width: 390, height: 844 },
  { label: 'スマホ320', width: 320, height: 640 },
];

for (const viewport of WIDTHS) {
  test(`${viewport.label}：事例の保存→再読み込みで残る→メモ→保存した条件へ（未ログイン）`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const [target] = await firstCases(page, 1);
    await page.goto(`/?entity=${encodeURIComponent(target.id)}`, { waitUntil: 'domcontentloaded' });
    const rowSave = page.getByRole('button', { name: `${target.name}を保存` }).first();
    await expect(rowSave).toBeVisible({ timeout: 120_000 });
    await shoot(page, `${viewport.label}-1-before-save`);
    await rowSave.click();
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('makemoney.bookmarks.v1'))).toContain(target.id);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: `${target.name}の保存を解除` }).first()).toBeVisible({ timeout: 120_000 });
    await shoot(page, `${viewport.label}-2-saved-after-reload`);

    await page.getByRole('tab', { name: 'メモ' }).or(page.getByRole('button', { name: 'メモ', exact: true })).first().click();
    const memo = page.getByRole('textbox').last();
    await memo.fill('比較用のメモ（e2e）');
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('make_money_analyst_notes_v1'))).toContain('比較用のメモ');
    await shoot(page, `${viewport.label}-3-memo`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'メモ' }).or(page.getByRole('button', { name: 'メモ', exact: true })).first().click();
    await expect(page.getByRole('textbox').last()).toHaveValue('比較用のメモ（e2e）', { timeout: 120_000 });

    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('検索条件を保存して、新着をメールで受け取れます')).toBeVisible({ timeout: 120_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await shoot(page, `${viewport.label}-4-alerts`);
  });
}

test('比較は1件・複数件・上限超過のどれでも案内が出る', async ({ page }) => {
  const cases = await firstCases(page, 6);
  await page.goto(`/compare?ids=${cases[0].id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('まだ1件だけです')).toBeVisible({ timeout: 120_000 });

  await page.goto(`/compare?ids=${cases.slice(0, 3).map((item) => item.id).join(',')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('table', { name: '事例の比較表' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('まだ1件だけです')).toHaveCount(0);

  await page.goto(`/compare?ids=${cases.map((item) => item.id).join(',')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('残りの2件は表示していません')).toBeVisible({ timeout: 120_000 });

  await page.goto('/compare?ids=', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('比較する事例がありません')).toBeVisible({ timeout: 120_000 });
});

test('保存した条件は未ログインでも何ができるかが分かる', async ({ page }) => {
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('検索条件を保存して、新着をメールで受け取れます')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'ログインして使う' })).toBeVisible();
  await expect(page.getByRole('link', { name: '事例一覧で条件を決める' })).toBeVisible();
});

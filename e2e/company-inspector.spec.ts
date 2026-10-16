import { selectCompany } from './inspector-actions';
import { expect, test } from '@playwright/test';
import { NO_MONEY, PRIMARY, SECONDARY, openDetails } from './reader-fixture';

// 公開済みの事例（GoRails）で、一覧 → 詳細 → 閉じる → 開き直す、を通す。
// 詳細は entity.reader だけを読む（公開目録の reader が出る）。
// 取り下げた損益セクション・捏造値・旧グラフは出ず、出典欄が出る。
test('company list opens financials and evidence, then closes and reopens the inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?entity=${PRIMARY.id}`);
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toHaveCount(0);
  await page.getByPlaceholder(/会社名・事業/).first().fill(PRIMARY.name);
  const row = page.getByRole('row').filter({ hasText: PRIMARY.name }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary').filter({ has: page.getByRole('heading', { name: PRIMARY.name, exact: true }) });
  await openDetails(page);
  await expect(inspector.locator('#section-metrics')).toBeVisible();
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  for (const legacy of ['純手残り', '損益ブリッジ', '資金フロー', '現金の滝', '通帳引き算バー']) await expect(inspector).not.toContainText(legacy);
  await expect(inspector).not.toContainText(/¥-50,000,000|¥-5,000万|¥-260,000,000|[−-]5,000万円|[−-]2\.6億円/);
  await expect(inspector.locator('canvas')).toHaveCount(0);
  await page.locator('#section-sources').scrollIntoViewIfNeeded();
  await expect(page.locator('#section-sources')).toBeInViewport();
  await expect(page.getByText(/Display Guarantee: 100%/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('withdrawn narrative sections (loot blueprint, value chain, flywheel) are not rendered', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?entity=${PRIMARY.id}`);
  await expect(page.getByRole('heading', { name: PRIMARY.name, exact: true })).toBeVisible();

  await expect(page.locator('#section-flywheel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /強化ループ/ })).toHaveCount(0);

  await expect(page.locator('#section-loot-blueprint')).toHaveCount(0);
  await expect(page.locator('#section-value-chain')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('strategy API rejects malformed input before processing', async ({ request }) => {
  const response = await request.post('/api/strategy-chat', { data: { action: 'SYNTHESIZE', selectedEntityIds: 'not-an-array' } });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'Invalid strategy request' });
});

test('J/K never switches companies, including after reloading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?entity=${PRIMARY.id}`);
  const heading = page.getByRole('heading', { name: PRIMARY.name, exact: true });
  await expect(heading).toBeVisible();
  await heading.click();
  for (const key of ['j', 'k', 'J', 'K']) await page.keyboard.press(key);
  await expect(heading).toBeVisible();
  await expect(page.locator('kbd').filter({ hasText: 'J/K' })).toHaveCount(0);
  await page.reload();
  await expect(heading).toBeVisible();
  await selectCompany(page, SECONDARY.name);
  await expect(heading).toHaveCount(0);
  expect(errors).toEqual([]);
});

// 収集基盤の候補や旧版の行が API から届いても、目録に無い事例は一覧にも詳細にも出ない
test('a row outside the published catalog never appears even if an API returns it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const outsider = { id: 'ent_smoke_revenue_only', name: '境界確認企業', entityType: 'company', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [] };
  await page.route('**/api/businesses*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ source: 'catalog_release', data: [outsider], nextCursor: null, hasMore: false }) }));
  await page.goto('/?entity=ent_smoke_revenue_only');
  await expect(page.getByText('この事例は公開していません。')).toBeVisible();
  await expect(page.getByText('境界確認企業')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// 数値の欄そのものが無い事例（Teamcamp）。結果のカードを出さず、0円も作らず、出典欄は出る。
test('unconfirmed financials omit the result card without fabricating zero values', async ({ page }) => {
  await page.goto(`/?entity=${NO_MONEY.id}`);
  await expect(page.getByRole('heading', { name: NO_MONEY.name, exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary', { name: `${NO_MONEY.name}の企業事例インスペクター` });
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  await expect(inspector.locator('#section-metrics')).toHaveCount(0);
  await expect(inspector).not.toContainText(NO_MONEY.unconfirmed);
  await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
  await openDetails(page);
  await expect(page.locator('#section-sources')).toBeVisible();
});

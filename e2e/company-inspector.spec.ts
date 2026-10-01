import { openNotes, selectCompany } from './inspector-actions';
import { expect, test } from '@playwright/test';
import { routeReader } from './reader-fixture';

// 公開済みの事例（Plausible）で、一覧 → 詳細 → 閉じる → 開き直す、を通す。
// 詳細は entity.reader だけを読む（reader は公開版にだけ入るので、ここでは詳細レスポンスに作り物の reader を足す）。
// 取り下げた損益セクション・捏造値・旧グラフは出ず、出典欄とメモタブが出る。
test('company list opens financials and evidence, then closes and reopens the inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await routeReader(page, 'ent_plausible');
  await page.goto('/?entity=ent_plausible');
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toHaveCount(0);
  await page.getByPlaceholder(/会社名・ティッカー/).first().fill('Plausible');
  const row = page.getByRole('row').filter({ hasText: 'Plausible Analytics' }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary').filter({ has: page.getByRole('heading', { name: 'Plausible Analytics', exact: true }) });
  await expect(inspector.locator('#section-metrics')).toBeVisible();
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  for (const legacy of ['純手残り', '損益ブリッジ', '資金フロー', '現金の滝', '通帳引き算バー']) await expect(inspector).not.toContainText(legacy);
  await expect(inspector).not.toContainText(/¥-50,000,000|¥-5,000万|¥-260,000,000|[−-]5,000万円|[−-]2\.6億円/);
  await expect(inspector.locator('canvas')).toHaveCount(0);
  await page.locator('#section-sources').scrollIntoViewIfNeeded();
  await expect(page.locator('#section-sources')).toBeInViewport();
  await openNotes(page);
  await expect(page.getByText(/Display Guarantee: 100%/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('withdrawn narrative sections (loot blueprint, value chain, flywheel) are not rendered', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?entity=ent_excalidraw_c7820d');
  await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible();

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

test('J/K never switches companies, including while writing and reloading a note', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?entity=ent_excalidraw_c7820d');
  const heading = page.getByRole('heading', { name: 'Excalidraw', exact: true });
  await expect(heading).toBeVisible();
  await openNotes(page);
  const note = page.locator('#section-notes textarea');
  await note.fill('');
  await note.pressSequentially('jkJK memo');
  await expect(heading).toBeVisible();
  await expect(note).toHaveValue('jkJK memo');
  await heading.click();
  for (const key of ['j', 'k', 'J', 'K']) await page.keyboard.press(key);
  await expect(heading).toBeVisible();
  await expect(page.locator('kbd').filter({ hasText: 'J/K' })).toHaveCount(0);
  await page.reload();
  await expect(heading).toBeVisible();
  await openNotes(page);
  await expect(note).toHaveValue('jkJK memo');
  await selectCompany(page, 'GMass');
  await expect(heading).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const raw of ['null', '[]', '{broken', JSON.stringify({ ent_excalidraw_c7820d: { content: 42 }, ent_gmass_209d19: { entityId: 'ent_gmass_209d19', content: '正常な既存メモ', updatedAt: '2026-09-11T00:00:00Z' } })]) {
  test(`damaged note storage is recoverable without losing original data: ${raw.slice(0, 28)}`, async ({ page }) => {
    const storageKey = 'make_money_analyst_notes_v1';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ storageKey, raw }) => {
      if (!sessionStorage.getItem('notes-test-seeded')) { localStorage.setItem(storageKey, raw); sessionStorage.setItem('notes-test-seeded', 'true'); }
    }, { storageKey, raw });
    await page.goto('/?entity=ent_excalidraw_c7820d');
    await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible();
    await openNotes(page);
    const note = page.locator('#section-notes textarea');
    await expect(note).toHaveValue('');
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(raw);
    await note.fill('復旧後のメモ jkJK');
    const stored = await page.evaluate((key) => ({ notes: JSON.parse(localStorage.getItem(key) || '{}'),
      backups: Object.keys(localStorage).filter((k) => k.startsWith(`${key}.recovery.`)).map((k) => localStorage.getItem(k)) }), storageKey);
    expect(stored.backups).toEqual([raw]);
    if (raw.includes('ent_gmass')) expect(stored.notes.ent_gmass_209d19.content).toBe('正常な既存メモ');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Excalidraw', exact: true })).toBeVisible();
    await openNotes(page);
    await expect(note).toHaveValue('復旧後のメモ jkJK');
    expect(errors).toEqual([]);
  });
}

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

test('unconfirmed financials omit the result card without fabricating zero values', async ({ page }) => {
  await routeReader(page, 'ent_plausible');
  await page.goto('/?entity=ent_plausible');
  await expect(page.getByRole('heading', { name: 'Plausible Analytics', exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary', { name: 'Plausible Analyticsの企業事例インスペクター' });
  await expect(page.locator('#section-cash-anatomy')).toHaveCount(0);
  await expect(inspector).toContainText('未確認: 利益');
  await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
  await expect(page.locator('#section-sources')).toBeVisible();
});

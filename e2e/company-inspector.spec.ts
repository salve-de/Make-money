import { expect, test } from '@playwright/test';

test('company list opens financials and evidence, then closes and reopens the inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');

  // The checked-in core company is available without live R2 credentials.
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await page.getByTitle('閉じる (Esc)', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);

  const row = page.getByRole('row').filter({ hasText: 'キーエンス (KEYENCE)' }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /財務P&L/ }).click();
  const financials = page.locator('#section-financial');
  await expect(financials).toBeInViewport();
  await expect(financials).toContainText('月商');
  await expect(financials).toContainText('純手残り (Net)');
  await expect(financials).toContainText('¥800.0億');
  await expect(financials).toContainText('¥432.0億');

  await page.getByRole('button', { name: /特異物証/ }).click();
  await expect(page.getByRole('heading', { name: '特異点物証 ＆ 金抜きの急所ファイル' })).toBeVisible();
  await expect(page.locator('#section-evidence')).toContainText('原価率18%の直販要塞・相見積もり完全拒否');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('malformed Foundation response cannot replace the usable core list', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await page.route('**/api/businesses*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ source: 'foundation_lake', data: [{ id: 'malformed', name: 'Invalid remote company' }], nextCursor: null, hasMore: false }),
  }));
  await page.goto('/');
  await expect.poll(() => warnings.some((warning) => warning.includes('Foundation Lake read failed'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await expect(page.getByText('Invalid remote company', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /財務P&L/ }).click();
  await expect(page.locator('#section-financial')).toContainText('¥800.0億');
  expect(errors).toEqual([]);
});

test('existing hazard dossier keeps its loss label and dynamic evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?entity=ent_jasper_e3e5b0b671c3f89a38e0');
  await expect(page.getByRole('heading', { name: 'Jasper.ai (旧 Jarvis)', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '致命的特異点・死因物証保全ファイル' })).toBeVisible();
  await expect(page.locator('#section-evidence')).toContainText('ChatGPT無料公開による存在価値消滅と大量レイオフの検死');
  await page.getByRole('button', { name: /財務P&L/ }).click();
  await expect(page.locator('#section-financial')).toContainText('POST-MORTEM');
  await expect(page.locator('#section-financial')).toContainText('¥-260,000,000');
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
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true });
  await expect(heading).toBeVisible();
  await page.getByRole('button', { name: 'メモ', exact: true }).click();
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
  await page.getByRole('button', { name: 'メモ', exact: true }).click();
  await expect(note).toHaveValue('jkJK memo');
  await page.getByTitle('次銘柄', { exact: true }).click();
  await expect(heading).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const raw of ['null', '[]', '{broken', JSON.stringify({
  ent_keyence: { content: 42 },
  ent_photoai: { entityId: 'ent_photoai', content: '正常な既存メモ', updatedAt: '2026-09-11T00:00:00Z' },
})]) {
  test(`damaged note storage is recoverable without losing original data: ${raw.slice(0, 28)}`, async ({ page }) => {
    const storageKey = 'make_money_analyst_notes_v1';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ storageKey, raw }) => {
      if (!sessionStorage.getItem('notes-test-seeded')) {
        localStorage.setItem(storageKey, raw);
        sessionStorage.setItem('notes-test-seeded', 'true');
      }
    }, { storageKey, raw });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'メモ', exact: true }).click();
    const note = page.locator('#section-notes textarea');
    await expect(note).toHaveValue('');
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(raw);
    await note.fill('復旧後のメモ jkJK');
    const stored = await page.evaluate((key) => ({
      notes: JSON.parse(localStorage.getItem(key) || '{}'),
      backups: Object.keys(localStorage).filter((k) => k.startsWith(`${key}.recovery.`)).map((k) => localStorage.getItem(k)),
    }), storageKey);
    expect(stored.backups).toEqual([raw]);
    if (raw.includes('ent_photoai')) expect(stored.notes.ent_photoai.content).toBe('正常な既存メモ');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'メモ', exact: true }).click();
    await expect(note).toHaveValue('復旧後のメモ jkJK');
    expect(errors).toEqual([]);
  });
}

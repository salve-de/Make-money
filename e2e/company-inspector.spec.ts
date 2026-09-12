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
  await expect(financials).toContainText('営業利益 (税引前)');
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

test('remote revenue-only detail leaves profit unknown and does not invent a waterfall', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const summary = {
    id: 'ent_smoke_revenue_only', name: '境界確認企業', entityType: 'company', aliases: [],
    canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [],
    valueProfile: {
      tier: 'USEFUL', score: 40, labels: [], businessSignal: '企業向け契約管理を月額で提供する業務支援サービス',
      painSignal: null, moneySignal: '$120000 annual revenue', tractionSignal: null,
      mechanismSignal: null, timeSignal: null,
      counts: { claims: 0, metrics: 1, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 },
    },
  };
  const detail = {
    ...summary, claims: [], metrics: [{
      id: 'metric_revenue', metricType: 'monthly_revenue', value: 120000, unit: 'JPY', currency: 'JPY',
      periodStart: null, periodEnd: null, pointInTime: null, basis: null, scope: null,
      originType: 'collected', verificationStatus: 'SUPPORTED', confidence: null, evidenceIds: [],
    }], moneySignals: [], events: [], relationships: [], observations: [], derived: [], bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true,
  };
  let detailReturned = false;
  await page.route('**/api/businesses*', (route) => {
    const isDetail = new URL(route.request().url()).searchParams.has('entity_id');
    if (isDetail) detailReturned = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isDetail
      ? { source: 'foundation_lake', data: detail }
      : { source: 'foundation_lake', data: [summary], hasMore: false, nextCursor: null }) });
  });
  await page.goto('/?entity=ent_smoke_revenue_only');
  await expect.poll(() => detailReturned).toBe(true);
  await expect(page.getByRole('heading', { name: '境界確認企業', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /財務P&L/ }).click();
  const financials = page.locator('#section-financial');
  await expect(financials).toContainText('¥12万');
  await expect(financials).toContainText('未確認');
  await expect(financials).not.toContainText('¥0');
  await expect(financials).not.toContainText('100%基準');
  expect(errors).toEqual([]);
});


test('unconfirmed financials have an honest label and a working navigation target', async ({ page }) => {
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  const jump = page.getByRole('button', { name: '財務P&L 未確認' });
  await expect(jump).toBeVisible();
  await jump.click();
  const section = page.locator('#section-financial');
  await expect(section).toBeInViewport();
  await expect(section).toContainText('財務データは未確認');
  await expect(section).not.toContainText('¥0');
});

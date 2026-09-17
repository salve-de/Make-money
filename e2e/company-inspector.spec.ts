import { openNotes, selectCompany } from './inspector-actions';
import { expect, test } from '@playwright/test';

test('company list opens financials and evidence, then closes and reopens the inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await page.getByTitle('閉じる (Esc)', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: 'キーエンス (KEYENCE)' }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^0[23]\s*損益$/ }).click();
  const financials = page.locator('#section-cash-anatomy');
  await expect(financials).toBeInViewport();
  await expect(financials).toContainText('売上高');
  await expect(financials).toContainText('営業利益');
  await expect(financials).not.toContainText('純手残り');
  await expect(financials).not.toContainText('損益ブリッジ');
  await expect(financials).not.toContainText('資金フロー');
  await expect(financials).not.toContainText('現金の滝');
  await expect(financials).not.toContainText('通帳引き算バー');
  await expect(financials.locator('canvas')).toHaveCount(0);
  await expect(financials).toContainText('¥800.0億');
  await expect(financials).toContainText('¥432.0億');
  await page.getByRole('button', { name: /根拠/ }).click();
  const evidence = page.locator('#section-evidence');
  await expect(evidence).toBeInViewport();
  await expect(evidence).toContainText(/儲けのウラ側 ＆ 現場の証拠|特異点物証 ＆ 金抜きの急所ファイル/);
  await expect(evidence).toContainText(/直販独占モデル|代理店排除直販体制|原価率18%/);
  await page.getByRole('button', { name: '証拠', exact: true }).click();
  await expect(page.getByText('保存済み観測を表示', { exact: true })).toBeVisible();
  await expect(page.getByText(/Display Guarantee: 100%/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('value chain and flywheel are unified into loot blueprint and redundant sections removed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();

  await expect(page.locator('#section-flywheel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /強化ループ/ })).toHaveCount(0);

  const lootBlueprint = page.locator('#section-loot-blueprint');
  await expect(lootBlueprint).toBeVisible();
  await expect(page.locator('#section-value-chain')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('malformed Foundation response cannot replace the usable core list', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.route('**/api/businesses*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ source: 'foundation_lake', data: [{ id: 'malformed', name: 'Invalid remote company' }], nextCursor: null, hasMore: false }),
  }));
  await page.goto('/');
  await expect.poll(() => warnings.some((warning) => warning.includes('Foundation Lake read failed'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
  await expect(page.getByText('Invalid remote company', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^0[23]\s*損益$/ }).click();
  await expect(page.locator('#section-cash-anatomy')).toContainText('¥800.0億');
  expect(errors).toEqual([]);
});

test('sparse Foundation candidate cannot replace a curated dossier with the same ID', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const candidate = {
    id: 'ent_photoai', name: 'Photo AI (候補)', entityType: 'company', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [],
    valueProfile: { tier: 'CANDIDATE', score: 1, labels: [], businessSignal: '未精錬候補', painSignal: null, moneySignal: null, tractionSignal: null, mechanismSignal: null, timeSignal: null,
      counts: { claims: 0, metrics: 0, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 } },
  };
  let detailRequests = 0;
  await page.route('**/api/businesses*', (route) => {
    const isDetail = new URL(route.request().url()).searchParams.has('entity_id');
    if (isDetail) detailRequests += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isDetail
      ? { source: 'foundation_lake', data: { ...candidate, claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [], bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true } }
      : { source: 'foundation_lake', data: [candidate], hasMore: false, nextCursor: null }) });
  });
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Photo AI (候補)', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /根拠/ }).click();
  await expect(page.locator('#section-evidence')).toContainText('継続MRRではない');
  expect(detailRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('existing hazard dossier keeps its loss label and dynamic evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?entity=ent_jasper_e3e5b0b671c3f89a38e0');
  const heading = page.getByRole('heading', { name: 'Jasper.ai (旧 Jarvis)', exact: true });
  await expect(heading).toBeVisible();
  await expect(page.locator('#section-evidence')).toContainText(/失敗・撤退の事実ログ|致命的特異点・死因物証保全ファイル/);
  await expect(page.locator('#section-evidence')).toContainText(/ChatGPT.*無料.*(大量解雇|レイオフ|解約|存在価値)/);
  await page.getByRole('button', { name: /^0[23]\s*損益$/ }).click();
  const inspector = page.getByRole('complementary').filter({ has: heading });
  await expect(inspector).toContainText('営業利益');
  await expect(inspector).not.toContainText('赤字出血');
  await expect(page.locator('#section-cash-anatomy')).toContainText(/¥-50,000,000|¥-5,000万|¥-260,000,000/);
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
  await selectCompany(page, 'Photo AI');
  await expect(heading).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const raw of ['null', '[]', '{broken', JSON.stringify({ ent_keyence: { content: 42 }, ent_photoai: { entityId: 'ent_photoai', content: '正常な既存メモ', updatedAt: '2026-09-11T00:00:00Z' } })]) {
  test(`damaged note storage is recoverable without losing original data: ${raw.slice(0, 28)}`, async ({ page }) => {
    const storageKey = 'make_money_analyst_notes_v1';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ storageKey, raw }) => {
      if (!sessionStorage.getItem('notes-test-seeded')) { localStorage.setItem(storageKey, raw); sessionStorage.setItem('notes-test-seeded', 'true'); }
    }, { storageKey, raw });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await openNotes(page);
    const note = page.locator('#section-notes textarea');
    await expect(note).toHaveValue('');
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(raw);
    await note.fill('復旧後のメモ jkJK');
    const stored = await page.evaluate((key) => ({ notes: JSON.parse(localStorage.getItem(key) || '{}'),
      backups: Object.keys(localStorage).filter((k) => k.startsWith(`${key}.recovery.`)).map((k) => localStorage.getItem(k)) }), storageKey);
    expect(stored.backups).toEqual([raw]);
    if (raw.includes('ent_photoai')) expect(stored.notes.ent_photoai.content).toBe('正常な既存メモ');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'キーエンス (KEYENCE)', exact: true })).toBeVisible();
    await openNotes(page);
    await expect(note).toHaveValue('復旧後のメモ jkJK');
    expect(errors).toEqual([]);
  });
}

test('remote revenue-only detail leaves profit unknown and does not invent a waterfall', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const summary = { id: 'ent_smoke_revenue_only', name: '境界確認企業', entityType: 'company', aliases: [], canonicalIdentifier: null, domain: null, status: 'active', observedAt: null, evidenceIds: [],
    valueProfile: { tier: 'USEFUL', score: 40, labels: [], businessSignal: '企業向け契約管理を月額で提供する業務支援サービス', painSignal: null, moneySignal: '$120000 annual revenue', tractionSignal: null, mechanismSignal: null, timeSignal: null,
      counts: { claims: 0, metrics: 1, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 } } };
  const detail = { ...summary, claims: [], metrics: [{ id: 'metric_revenue', metricType: 'monthly_revenue', value: 120000, unit: 'JPY', currency: 'JPY', periodStart: null, periodEnd: null, pointInTime: null, basis: null, scope: null,
    originType: 'collected', verificationStatus: 'SUPPORTED', confidence: null, evidenceIds: [] }], moneySignals: [], events: [], relationships: [], observations: [], derived: [], bundlesScanned: 0, bundleObjectsListed: 0, bundleScanComplete: true };
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
  await page.getByRole('button', { name: /^0[23]\s*損益$/ }).click();
  const financials = page.locator('#section-cash-anatomy');
  await expect(financials).toContainText('¥12万');
  await expect(financials).toContainText('未確認');
  await expect(financials).not.toContainText('¥0');
  await expect(financials).not.toContainText('100%基準');
  expect(errors).toEqual([]);
});

test('unconfirmed financials have an honest label and a working navigation target', async ({ page }) => {
  await page.goto('/?entity=ent_photoai');
  await expect(page.getByRole('heading', { name: 'Photo AI', exact: true })).toBeVisible();
  const jump = page.getByRole('button', { name: /^0[23]\s*損益$/ });
  await expect(jump).toBeVisible();
  await jump.click();
  const section = page.locator('#section-cash-anatomy');
  await expect(section).toBeInViewport();
  await expect(section).toContainText(/財務データ.*(未確認|非公開)/);
  await expect(section).not.toContainText('¥0');
});

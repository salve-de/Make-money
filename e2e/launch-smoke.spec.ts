import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';

// 公開前に最低限守る主要経路（docs/launch/QUALITY_GATES.md）。
// トップ表示・事例詳細・検索・比較・ログイン誘導・規約ページ・404・死活確認。
// 決済・AI 生成・DB 書き込みはしない。事例は公開目録（data/catalog-release.json）の先頭から選び、名前の決め打ちをしない。

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string> };
const publishedIds = Object.keys(manifest.details);

async function publishedCase(request: APIRequestContext, index = 0): Promise<{ id: string; name: string }> {
  const id = publishedIds[index];
  expect(id, '公開目録に事例がある').toBeTruthy();
  const response = await request.get(`/api/catalog?q=${encodeURIComponent(id)}&pageSize=1`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { id: string; name: string }[] };
  expect(body.data[0]?.id).toBe(id);
  return { id, name: body.data[0].name };
}

test.describe('公開前の主要経路', () => {
  test('トップが表示され、公開目録の事例が一覧に並ぶ。画面のエラーが出ない', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('row').filter({ visible: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('事例の詳細を直接開ける', async ({ page, request }) => {
    const target = await publishedCase(request);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`/?entity=${encodeURIComponent(target.id)}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 2, name: target.name, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('検索で事例が絞り込まれ、該当なしの検索でも壊れない', async ({ page, request }) => {
    const target = await publishedCase(request);
    await page.goto('/');
    const search = page.getByPlaceholder(/会社名・ティッカー/).first();
    const rows = page.getByRole('row').filter({ visible: true });
    await search.fill(target.name);
    await expect(rows.filter({ has: page.getByText(target.name, { exact: true }) })).toHaveCount(1);
    await search.fill('zzzz-launch-smoke-no-such-case');
    await expect(rows.filter({ has: page.getByText(target.name, { exact: true }) })).toHaveCount(0);
    await expect(search).toBeVisible();
  });

  test('比較ページが開く。IDなしでも、公開目録にないIDでも壊れない', async ({ page, request }) => {
    const target = await publishedCase(request);
    for (const query of ['', `?ids=${encodeURIComponent(target.id)}`, '?ids=ent_not_in_catalog_launch_smoke']) {
      const errors: string[] = [];
      const onError = (error: Error) => errors.push(error.message);
      page.on('pageerror', onError);
      const response = await page.goto(`/compare${query}`);
      expect(response?.status(), `/compare${query}`).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      page.off('pageerror', onError);
      expect(errors, `/compare${query}`).toEqual([]);
    }
  });

  test('ログインしていない人には、保存条件ページでログインへの誘導が出て、ログイン画面が開く', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('検索条件を保存して、新着をメールで受け取れます')).toBeVisible();
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await page.getByRole('button', { name: 'ログイン画面を閉じる' }).click();
    await expect(dialog).toBeHidden();
  });

  for (const [path, title] of [
    ['/legal/terms', '利用規約'],
    ['/legal/privacy', 'プライバシーポリシー'],
    ['/legal/tokushoho', '特定商取引法に基づく表記'],
    ['/legal/contact', 'お問い合わせ・削除依頼'],
  ] as const) {
    test(`規約ページが開く: ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    });
  }

  test('存在しないアドレスは 404 を返す（画面・API とも）', async ({ request }) => {
    expect((await request.get('/launch-smoke-no-such-page')).status()).toBe(404);
    expect((await request.get('/api/launch-smoke-no-such-route')).status()).toBe(404);
  });

  test('死活確認 /api/health は認証なしで、キャッシュされず、内部情報を出さない', async ({ request }) => {
    const response = await request.get('/api/health');
    // e2e のサーバーには D1 が無いので 503（database: ng）が正しい。本番の監視では 200 になる
    expect([200, 503]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    const text = await response.text();
    const body = JSON.parse(text) as { status: string; version: string; release: string; time: string; checks: { database: string; catalog: string } };
    expect(Object.keys(body).sort()).toEqual(['checks', 'release', 'status', 'time', 'version']);
    expect(Object.keys(body.checks).sort()).toEqual(['catalog', 'database']);
    expect(['ok', 'down']).toContain(body.status);
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
    // 公開目録は CI でも読める
    expect(body.checks.catalog).toBe('ok');
    expect(text).not.toMatch(/token|secret|password|07affd4c|r2\.cloudflarestorage|Error:/i);
  });
});

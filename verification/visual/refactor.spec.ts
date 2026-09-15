import { expect, test, type Page } from '@playwright/test';
import { recordRuntimeErrors, reportRuntimeFailure } from './runtime-diagnostics';

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.addStyleTag({ content: `
    *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }
    /* JS-driven continuous ticker: compare the initial frame, not different elapsed times. */
    [aria-label="台帳の財務サマリー"] .will-change-transform { transform: translate3d(0, 0, 0) !important; }
  ` });
  await expect(page.locator('body')).not.toContainText('Application error:');
  await expect(page.locator('body')).not.toContainText('This page could not be found');
}

test.beforeEach(async ({ page }) => {
  recordRuntimeErrors(page);
  await page.clock.setFixedTime(new Date('2026-09-15T00:00:00Z'));
  await page.route('**/api/businesses*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ source: 'local_fallback', data: [], nextCursor: null, hasMore: false }),
  }));
});
test.afterEach(async ({ page }, info) => reportRuntimeFailure(page, info));

for (const [name, url, expected] of [
  ['playbook', '/playbook', '事業・ツールの参考プレイブック'],
  ['ledger', '/', 'キーエンス'],
  ['inspector', '/?entity=ent_keyence', 'キーエンス'],
  ['partners', '/partners', 'REFERRAL CONSOLE'],
  ['radar', '/radar', '市場傾向'],
  ['synthesis', '/?mode=SYNTHESIS', '独自アイデア調書'],
  ['opportunity', '/radar/trend-ai-doc-pipeline', 'AI即食いクリーンMarkdown化'],
  ['landmine', '/radar/landmine-ai-wrapper', '薄い汎用AIラッパー'],
] as const) {
  test(`unchanged ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBe(true);
    await expect(page.locator('body')).toContainText(expected);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('every extracted playbook section preserves its rendered output', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playbook', { waitUntil: 'networkidle' });
  for (const [name, tab, heading] of [
    ['death-traps', '賞味期限アラート', '即死判定格下げアラート'],
    ['current-waves', '稼ぎの型の参考例', '事業の組み立てを考える参考プレイブック'],
    ['genesis', '初動突破ゲリラ戦録', '初動獲得の参考事例'],
    ['stacks', '黄金スタックレシピ', '黄金スタック構成レシピ'],
  ]) {
    await page.getByRole('button', { name: new RegExp(tab) }).click();
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('synthesis chat pane preserves the initial conversation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?mode=SYNTHESIS', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '事業デューデリジェンス＆戦略壁打ち', exact: true }).click();
  await expect(page.locator('body')).toContainText('実在企業の財務・戦略データ');
  await settle(page);
  await expect(page).toHaveScreenshot('synthesis-chat.png', { fullPage: true });
  expect(errors).toEqual([]);
});

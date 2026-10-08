import { expect, test, type Page } from '@playwright/test';

// メニューの項目（スマホの引き出し／PC の「その他」）と、スマホ幅の「絞り込み・検索」の通し確認（未ログイン）。
// 開発サーバーに向けるときは E2E_BASE_URL=http://127.0.0.1:3170 を指定する。写真は E2E_SHOTS_DIR に保存する。
const baseURL = process.env.E2E_BASE_URL;
if (baseURL) test.use({ baseURL });
test.setTimeout(300_000);

/** 開発サーバーでは、読み込み直後（操作の仕組みが付く前）のクリックが効かないことがあるので、開くまで押し直す */
async function clickUntilVisible(click: () => Promise<void>, target: () => Promise<void>) {
  await expect(async () => { await click(); await target(); }).toPass({ timeout: 120_000, intervals: [1000, 2000, 4000] });
}

const shotsDir = process.env.E2E_SHOTS_DIR;
async function shoot(page: Page, name: string) {
  if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png` });
}

/** 未ログインで出る項目（ログインの仕組みが無い環境では「ログイン・新規登録」だけ出ない） */
const ITEMS: { label: string; path: RegExp }[] = [
  { label: '保存した事例とメモ', path: /\/\?mode=SYNTHESIS$/ },
  { label: '比較', path: /\/compare$/ },
  { label: '保存した条件', path: /\/alerts$/ },
  { label: '自分の商品', path: /\/marketplace\/activity#activity-listings$/ },
  { label: '紹介と取引', path: /\/marketplace\/activity#activity-referrals$/ },
];

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

for (const viewport of [{ label: 'スマホ390', width: 390, height: 844 }, { label: 'スマホ320', width: 320, height: 640 }]) {
  test(`${viewport.label}：メニューに補助機能が並び、全項目が開く`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const drawer = page.getByRole('dialog');
    const rows = drawer.getByRole('navigation', { name: 'そのほかの画面' }).locator('li');
    await clickUntilVisible(() => page.getByRole('button', { name: 'メニューを開く' }).click({ timeout: 5000 }), () => expect(rows.first()).toBeVisible({ timeout: 3000 }));
    const labels = (await rows.allInnerTexts()).map((text) => text.trim());
    for (const item of ITEMS) expect(labels.some((text) => text.startsWith(item.label)), item.label).toBe(true);
    // 1項目1行・12px 以上・押せる高さ44px 以上・ラベルが切れない
    const metrics = await rows.evaluateAll((nodes) => nodes.map((node) => {
      const link = node.querySelector('a, button') as HTMLElement;
      const label = node.querySelector('span') as HTMLElement;
      return { height: link.getBoundingClientRect().height, font: parseFloat(getComputedStyle(label).fontSize), lines: Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight)), clipped: label.scrollWidth > label.clientWidth };
    }));
    for (const metric of metrics) {
      expect(metric.height).toBeGreaterThanOrEqual(44);
      expect(metric.font).toBeGreaterThanOrEqual(12);
      expect(metric.lines).toBe(1);
      expect(metric.clipped).toBe(false);
    }
    await expect(drawer.getByRole('link', { name: '利用規約' })).toBeVisible();
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    await shoot(page, `${viewport.label}-menu`);
    console.log(`${viewport.label} メニュー項目数 ${labels.length}: ${labels.join(' | ')}`);

    for (const item of ITEMS) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const link = page.getByRole('dialog').getByRole('link', { name: item.label });
      await clickUntilVisible(() => page.getByRole('button', { name: 'メニューを開く' }).click({ timeout: 5000 }), () => expect(link).toBeVisible({ timeout: 3000 }));
      const href = await link.getAttribute('href');
      const response = await page.request.get(href!.replace(/#.*$/, ''));
      expect(response.status(), item.label).toBe(200);
      await link.click();
      await page.waitForURL(item.path, { timeout: 120_000 });
      expect(await noOverflow(page), `${item.label} の横はみ出し`).toBeLessThanOrEqual(0);
    }
  });
}

test('PC：「その他」にスマホと同じ項目が並ぶ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const menu = page.locator('details', { hasText: 'その他' }).first();
  await clickUntilVisible(
    async () => { if (!(await menu.evaluate((node) => (node as HTMLDetailsElement).open))) await page.locator('summary', { hasText: 'その他' }).click({ timeout: 5000 }); },
    () => expect(menu.getByRole('link', { name: ITEMS[0].label })).toBeVisible({ timeout: 3000 }),
  );
  for (const item of ITEMS) await expect(menu.getByRole('link', { name: item.label })).toBeVisible({ timeout: 120_000 });
  await shoot(page, 'PC1440-more');
  const count = await menu.getByRole('link').filter({ hasNot: page.locator('[href^="/legal"]') }).count();
  console.log(`PC その他の項目数（法務リンクを除く） ${count}`);
});

for (const viewport of [{ label: 'スマホ390', width: 390, height: 844 }, { label: 'スマホ320', width: 320, height: 640 }]) {
  test(`${viewport.label}：検索は「絞り込み・検索」の画面で行い、検索語は見出しに出てクリアで戻る`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const button = page.getByRole('button', { name: /絞り込み・検索/ });
    await expect(button).toBeVisible({ timeout: 120_000 });
    // 閉じた状態: 検索窓は出ていない
    await expect(page.getByPlaceholder(/会社名・事業/)).toBeHidden();
    await expect(page.getByTestId('search-term-mark')).toHaveCount(0);
    await shoot(page, `${viewport.label}-search-closed`);

    const dialog = page.getByRole('dialog', { name: '事例を条件で絞り込む' });
    const input = dialog.getByPlaceholder(/会社名・事業/);
    await clickUntilVisible(() => button.click({ timeout: 5000 }), () => expect(input).toBeVisible({ timeout: 3000 }));
    await shoot(page, `${viewport.label}-search-open-empty`);
    await input.fill('a');
    await expect(dialog.getByRole('button', { name: '検索語を消去' })).toBeVisible();
    await shoot(page, `${viewport.label}-search-open-term`);
    await dialog.getByRole('button', { name: '閉じる', exact: true }).click();

    // 検索語あり: ボタンに印、見出しに「検索「語」・N件」
    await expect(page.getByTestId('search-term-mark')).toBeVisible();
    const summary = page.getByTestId('mobile-search-summary');
    await expect(summary).toContainText('検索「a」');
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    await shoot(page, `${viewport.label}-search-with-term`);

    // クリアで元に戻る
    await summary.getByRole('button', { name: '検索語を消去' }).click();
    await expect(summary).toHaveCount(0);
    await expect(page.getByTestId('search-term-mark')).toHaveCount(0);
    await shoot(page, `${viewport.label}-search-cleared`);
  });
}

test('PC：上部の検索欄はそのまま使える', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder(/会社名・事業/).first()).toBeVisible({ timeout: 120_000 });
  // PC は左の絞り込み欄が担う。同じ中身の「条件を絞る」ボタンは出さない
  await expect(page.getByRole('complementary', { name: '絞り込み' })).toBeVisible();
  await expect(page.getByRole('button', { name: '条件を絞る' })).toBeHidden();
  await expect(page.getByRole('button', { name: /絞り込み・検索/ })).toBeHidden();
});

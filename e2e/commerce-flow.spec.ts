/**
 * 掲載→購入→紹介の通し確認（ローカル専用。環境変数が無ければ全部 skip する）。
 *
 * 本物の Firebase・Stripe・課金には一切つながない。Firebase Auth エミュレーター（demo- プロジェクト）と、
 * 手元の D1（pnpm db:migrate:local）を使う開発サーバーに対して、3人（出品者・紹介者・買い手）の画面操作で通す。
 * 購入はテスト購入（実際の請求なし）。
 *
 *   COMMERCE_E2E_BASE_URL=http://127.0.0.1:3130 COMMERCE_E2E_AUTH_EMULATOR=http://127.0.0.1:9139 \
 *   pnpm exec playwright test -c e2e/commerce-flow.config.ts
 */
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const baseURL = process.env.COMMERCE_E2E_BASE_URL;
const emulator = process.env.COMMERCE_E2E_AUTH_EMULATOR;
const projectId = process.env.COMMERCE_E2E_PROJECT_ID || 'demo-make-money';
const shots = process.env.COMMERCE_E2E_SHOTS || 'test-results/commerce-flow';

test.skip(!baseURL || !emulator, 'ローカル専用：COMMERCE_E2E_BASE_URL と COMMERCE_E2E_AUTH_EMULATOR が無いので実行しない');
test.use({ baseURL });
test.describe.configure({ mode: 'serial', timeout: 240_000 });

interface Account { email: string; password: string }

/** エミュレーターに利用者を作る（画面の登録操作は account-flow.spec.ts が確認済み）。 */
async function createAccount(tag: string): Promise<Account> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const account = { email: `c1-${tag}-${stamp}@example.test`, password: `Test-${stamp}-pw` };
  const response = await fetch(`${emulator}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true }),
  });
  expect(response.ok, `エミュレーターへの登録 ${projectId}`).toBe(true);
  return account;
}

async function newPerson(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ baseURL, viewport });
  return { context, page: await context.newPage() };
}

/** 取引・紹介の画面のログインボタンから、メールとパスワードでログインする。 */
async function login(page: Page, account: Account) {
  await page.goto('/marketplace/activity');
  await page.getByRole('button', { name: 'ログイン', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('メールアドレス').fill(account.email);
  await dialog.getByLabel(/パスワード/).fill(account.password);
  await dialog.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('取引の記録を読み込み中')).toHaveCount(0, { timeout: 60_000 });
}

async function noHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label}：横にはみ出している`).toBeLessThanOrEqual(0);
}

async function minTapHeight(page: Page, names: Array<string | RegExp>, min: number, label: string) {
  for (const name of names) {
    const control = page.getByRole('button', { name }).first();
    const box = await control.boundingBox();
    expect(box, `${label}：${String(name)} が見つからない`).not.toBeNull();
    expect(box!.height, `${label}：${String(name)} の高さ`).toBeGreaterThanOrEqual(min - 0.5);
  }
}

async function flow(browser: Browser, viewport: { width: number; height: number }, prefix: string, mobile: boolean) {
  const started = Date.now();
  const shot = (page: Page, name: string) => (console.log(`${prefix} ${name} ${Math.round((Date.now() - started) / 1000)}s`), page).screenshot({ path: `${shots}/${prefix}-${name}.png`, fullPage: false });
  const seller = await createAccount('seller');
  const referrer = await createAccount('referrer');
  const buyer = await createAccount('buyer');
  const contexts: BrowserContext[] = [];
  try {
    // 0件の表示：登録したばかりの出品者
    const s = await newPerson(browser, viewport); contexts.push(s.context);
    await s.page.goto('/marketplace/activity');
    await expect(s.page.getByRole('button', { name: 'ログイン', exact: true }).first()).toBeVisible();
    await shot(s.page, '01-activity-signed-out');
    await login(s.page, seller);
    await expect(s.page.getByText('まだ取引の記録はありません')).toBeVisible();
    await expect(s.page.getByText('掲載はまだありません')).toBeVisible();
    await shot(s.page, '02-activity-empty');
    await noHorizontalOverflow(s.page, '取引・紹介（0件）');

    // 作る→掲載：掲載を公開し、販売条件（価格・紹介報酬）を決める
    await s.page.goto('/marketplace/new');
    const title = `テスト販売 ${Date.now()}`;
    await s.page.getByLabel(/サービス名/).fill(title);
    await s.page.getByLabel('誰の何を解決するサービスか').fill('小さな工場向けに、紙図面を検索できるデータへ変換するテスト用のサービスです。');
    await s.page.getByLabel(/公開したサービスのURL/).fill('https://example.com/service');
    await s.page.getByLabel('価格表示（任意）').fill('テスト購入 2,980円');
    await s.page.getByLabel('掲載者名（任意）').fill('テスト商店');
    await s.page.getByRole('button', { name: 'Make-Moneyに公開' }).click();
    await expect(s.page.getByRole('button', { name: '公開内容を更新' })).toBeVisible();
    await expect(s.page.getByRole('heading', { name: 'Make-Money内で販売する' })).toBeVisible();
    await expect(s.page.getByText('販売条件を読み込み中')).toHaveCount(0, { timeout: 30_000 });
    await s.page.getByLabel('価格（円・税込）').fill('50');
    await expect(s.page.getByRole('button', { name: '販売条件を保存' })).toBeDisabled(); // 100円未満は保存できない
    await s.page.getByLabel('価格（円・税込）').fill('2980');
    await s.page.getByLabel(/紹介報酬/).fill('10');
    await expect(s.page.getByText('この価格では1件あたり 298円')).toBeVisible();
    await shot(s.page, '03-offer-editor');
    await s.page.getByRole('button', { name: '販売条件を保存' }).click();
    await expect(s.page.getByText('販売条件を保存しました')).toBeVisible();
    await noHorizontalOverflow(s.page, '掲載の編集');

    // 掲載一覧に出て、詳細に購入欄がある
    await s.page.goto('/marketplace');
    const row = s.page.getByRole('link', { name: new RegExp(title) });
    await expect(row).toBeVisible();
    await noHorizontalOverflow(s.page, '掲載一覧');
    await shot(s.page, '04-listing-index');
    await row.click();
    await expect(s.page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(s.page.getByText('2,980円').first()).toBeVisible();
    // 出品者本人は買えない
    await s.page.getByRole('button', { name: /2,980円で購入/ }).click();
    await expect(s.page.getByRole('alert').filter({ hasText: '自分の掲載は購入できません' })).toBeVisible();
    await expect(s.page.getByRole('button', { name: '紹介リンクを作る' })).toBeVisible();
    await s.page.getByRole('button', { name: '紹介リンクを作る' }).click();
    await expect(s.page.getByRole('alert').filter({ hasText: '自分の掲載には紹介リンクを作れません' })).toBeVisible();
    const detailPath = new URL(s.page.url()).pathname;

    // 紹介者：紹介リンクを作る
    const r = await newPerson(browser, viewport); contexts.push(r.context);
    await login(r.page, referrer);
    await r.page.goto(detailPath);
    await expect(r.page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await r.page.getByRole('button', { name: '紹介リンクを作る' }).click();
    const linkBox = r.page.getByLabel('あなたの紹介リンク');
    await expect(linkBox).toBeVisible();
    const referralUrl = await linkBox.inputValue();
    expect(referralUrl).toMatch(/\/marketplace\/.+\?ref=[a-z0-9]{12}$/);
    await shot(r.page, '05-referral-link');
    if (mobile) await minTapHeight(r.page, ['リンクをコピー'], 44, '紹介リンク欄');
    await noHorizontalOverflow(r.page, '掲載詳細（紹介者）');

    // 買い手：紹介リンクを開く（未ログイン）→ ログインして購入
    const b = await newPerson(browser, viewport); contexts.push(b.context);
    const visited = b.page.waitForResponse((response) => response.url().includes('/referral-visits') && response.ok(), { timeout: 60_000 });
    await b.page.goto(referralUrl);
    await expect(b.page.getByText('紹介リンクから開いています')).toBeVisible();
    await visited;
    if (mobile) await minTapHeight(b.page, ['ログインして購入'], 44, '購入欄');
    await shot(b.page, '06-detail-signed-out');
    await b.page.getByRole('button', { name: 'ログインして購入' }).click();
    const dialog = b.page.getByRole('dialog');
    await dialog.getByLabel('メールアドレス').fill(buyer.email);
    await dialog.getByLabel(/パスワード/).fill(buyer.password);
    await dialog.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(b.page.getByRole('dialog')).toHaveCount(0);
    const buyButton = b.page.getByRole('button', { name: /2,980円で購入/ });
    await expect(buyButton).toBeVisible({ timeout: 60_000 });
    if (mobile) await minTapHeight(b.page, [/2,980円で購入/], 44, '購入欄');
    await buyButton.click();
    const receipt = b.page.getByRole('status', { name: '購入の記録' });
    await expect(receipt).toContainText('購入を記録しました（テスト購入・請求なし）');
    await expect(receipt).toContainText('紹介経由');
    await expect(receipt).toContainText('2,980円');
    await shot(b.page, '07-receipt');
    await noHorizontalOverflow(b.page, '購入後');
    // 買い手の取引一覧
    await b.page.goto('/marketplace/activity');
    await expect(b.page.locator('#activity-purchases').locator('..')).toContainText(title);
    await shot(b.page, '08-buyer-activity');

    // 紹介者の成果：開いた1回・購入1件・報酬298円
    await r.page.goto('/marketplace/activity');
    const referrals = r.page.locator('#activity-referrals').locator('..');
    await expect(referrals).toContainText(title);
    await expect(referrals).toContainText('1回');
    await expect(referrals).toContainText('1件');
    await expect(referrals).toContainText('298円');
    await expect(r.page.locator('#activity-ledger').locator('..')).toContainText('報酬を記録');
    await shot(r.page, '09-referrer-activity');
    await noHorizontalOverflow(r.page, '取引・紹介（紹介者）');

    // 出品者の販売：紹介報酬つきで見え、取り消すと報酬も取り消される
    await s.page.goto('/marketplace/activity');
    const sales = s.page.locator('#activity-sales').locator('..');
    await expect(sales).toContainText('紹介経由（報酬を記録）');
    await expect(sales).toContainText('紹介報酬 298円');
    await shot(s.page, '10-seller-sales');
    await noHorizontalOverflow(s.page, '取引・紹介（出品者）');
    if (mobile) await minTapHeight(s.page, ['取り消す'], 44, '販売の取り消し');
    await s.page.getByRole('button', { name: '取り消す' }).click();
    await expect(sales).toContainText('取り消し済み');
    await r.page.goto('/marketplace/activity');
    await expect(r.page.locator('#activity-ledger').locator('..')).toContainText('返金で取り消し');
    await expect(r.page.locator('#activity-ledger').locator('..')).toContainText('-298円');

    // 読み込み中・エラーの表示（応答を遅らせる／失敗させる）
    const e = await newPerson(browser, viewport); contexts.push(e.context);
    await login(e.page, buyer);
    await e.page.route('**/api/marketplace/commerce/activity', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: '取引の記録を読み込めませんでした' }) });
    });
    await e.page.goto('/marketplace/activity');
    await expect(e.page.getByRole('status').filter({ hasText: '取引の記録を読み込み中' })).toBeVisible();
    await shot(e.page, '11-loading');
    await expect(e.page.getByRole('alert').filter({ hasText: '取引の記録を読み込めませんでした' })).toBeVisible();
    await expect(e.page.getByRole('button', { name: '再読み込み' })).toBeVisible();
    await shot(e.page, '12-error');
    await e.page.unroute('**/api/marketplace/commerce/activity');
    await e.page.getByRole('button', { name: '再読み込み' }).click();
    await expect(e.page.locator('#activity-purchases').locator('..')).toContainText(title);

    // 最小幅 320px でもはみ出さない
    if (mobile) {
      for (const page of [s.page, b.page]) {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/marketplace/activity');
        await expect(page.locator('#activity-listings')).toBeVisible({ timeout: 60_000 });
        await noHorizontalOverflow(page, '取引・紹介（320px）');
        await page.goto(detailPath);
        await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
        await noHorizontalOverflow(page, '掲載詳細（320px）');
      }
      await shot(s.page, '13-detail-320');
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}

test('PC幅：掲載→販売条件→紹介リンク→購入→紹介報酬の記録→取り消し', async ({ browser }) => {
  await flow(browser, { width: 1440, height: 1000 }, 'pc', false);
});

test('スマホ幅(390→320)：掲載→販売条件→紹介リンク→購入→紹介報酬の記録→取り消し', async ({ browser }) => {
  await flow(browser, { width: 390, height: 844 }, 'sp', true);
});

/**
 * 会員導線の通し確認（ローカル専用。CI では認証・決済を扱わないため、環境変数が無ければ全部 skip する）。
 *
 * 本物の Firebase・Stripe には一切つながない。次の3つを手元で立てたうえで、別設定で実行する（手順は e2e/README.md の末尾）。
 * - Firebase Auth エミュレーター（demo- プロジェクト）
 * - 開発サーバー（NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST などを設定したもの。wrangler のローカル D1）
 * - 任意：Stripe 偽装サーバー e2e/support/stripe-mock.mjs（ACCOUNT_E2E_STRIPE_MOCK があるときだけ決済も通す）
 *
 *   ACCOUNT_E2E_BASE_URL=http://127.0.0.1:3131 ACCOUNT_E2E_AUTH_EMULATOR=http://127.0.0.1:9139 \
 *   ACCOUNT_E2E_STRIPE_MOCK=http://127.0.0.1:12111 pnpm exec playwright test -c e2e/account-flow.config.ts
 */
import { expect, test, type Page } from '@playwright/test';

const baseURL = process.env.ACCOUNT_E2E_BASE_URL;
const emulator = process.env.ACCOUNT_E2E_AUTH_EMULATOR;
const stripeMock = process.env.ACCOUNT_E2E_STRIPE_MOCK;
const projectId = process.env.ACCOUNT_E2E_PROJECT_ID || 'demo-make-money';
const shots = process.env.ACCOUNT_E2E_SHOTS || 'test-results/account-flow';

test.skip(!baseURL || !emulator, 'ローカル専用：ACCOUNT_E2E_BASE_URL と ACCOUNT_E2E_AUTH_EMULATOR が無いので実行しない');
test.use({ baseURL });
test.describe.configure({ mode: 'serial', timeout: 180_000 });

function newAccount(tag: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { email: `w1-${tag}-${stamp}@example.test`, password: `Test-${stamp}-pw` };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
}

async function oobCodesFor(email: string): Promise<Array<{ email: string; requestType: string }>> {
  const response = await fetch(`${emulator}/emulator/v1/projects/${projectId}/oobCodes`);
  const body = await response.json() as { oobCodes?: Array<{ email: string; requestType: string }> };
  return (body.oobCodes ?? []).filter((code) => code.email === email);
}

async function fillCredentials(page: Page, email: string, password: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('メールアドレス').fill(email);
  await dialog.getByLabel(/パスワード/).fill(password);
}

test('PC幅：登録→メニュー→会員設定→再設定メール→ログアウト→再ログイン→（決済→解約→退会）', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const account = newAccount('pc');

  // 未ログインの会員設定
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: '会員設定', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: '無料で登録する' })).toBeVisible();
  await shot(page, 'pc-01-signed-out');

  // 登録
  await page.getByRole('button', { name: '無料で登録する' }).click();
  await expect(page.getByRole('heading', { name: 'アカウント作成' })).toBeVisible();
  await fillCredentials(page, account.email, account.password);
  await page.getByRole('button', { name: '登録を完了する' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByText(account.email, { exact: true })).toBeVisible();
  await expect(page.getByText('契約状況を読み込んでいます')).toHaveCount(0, { timeout: 90_000 });
  await expect(page.getByText('無料プラン').first()).toBeVisible();
  await shot(page, 'pc-02-account-signed-in');

  // ヘッダーのメニュー
  const accountButton = page.getByRole('button', { name: new RegExp(`アカウント（${account.email.replace(/[.+]/g, '\\$&')}）`) });
  await accountButton.click();
  await expect(page.getByRole('link', { name: '会員設定' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ログアウト' }).first()).toBeVisible();
  await shot(page, 'pc-03-header-menu');
  await page.keyboard.press('Escape');

  // 会員設定からパスワード再設定メール
  await page.getByRole('button', { name: 'パスワード再設定のメールを送る' }).click();
  await expect(page.getByText(`${account.email} あてに、パスワードを決め直すためのメールを送りました。`)).toBeVisible();
  expect((await oobCodesFor(account.email)).some((code) => code.requestType === 'PASSWORD_RESET')).toBe(true);
  await shot(page, 'pc-04-reset-sent');

  // ヘッダーからログアウト
  await accountButton.click();
  await page.getByRole('button', { name: 'ログアウト' }).first().click();
  await expect(page.getByRole('button', { name: '無料で登録する' })).toBeVisible();
  await expect(page.locator('header').getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();

  // ヘッダーのログインから、パスワードを忘れた → 再設定メール → ログインに戻る → 再ログイン
  await page.locator('header').getByRole('button', { name: 'ログイン', exact: true }).click();
  await page.getByRole('button', { name: 'パスワードを忘れた' }).click();
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
  await page.getByRole('dialog').getByLabel('メールアドレス').fill(account.email);
  await page.getByRole('button', { name: '再設定メールを送る' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('メールを送りました');
  await shot(page, 'pc-05-forgot-password');
  expect((await oobCodesFor(account.email)).filter((code) => code.requestType === 'PASSWORD_RESET').length).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'ログインに戻る' }).click();
  await page.getByRole('dialog').getByLabel(/パスワード/).fill('wrong-password-1');
  await page.getByRole('dialog').getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'メールアドレスかパスワードが違います' })).toBeVisible();
  await shot(page, 'pc-06-login-error');
  await page.getByRole('dialog').getByLabel(/パスワード/).fill(account.password);
  await page.getByRole('dialog').getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByText(account.email, { exact: true })).toBeVisible();

  if (stripeMock) {
    // 決済（偽装サーバー）：PRO → 月額を購入 → 完了ページ → 会員設定に反映
    await page.goto('/?pro=1');
    const pro = page.getByRole('dialog', { name: 'PRO' });
    await expect(pro).toBeVisible();
    await pro.getByText('月額プラン').click();
    await shot(page, 'pc-07-pro-plans');
    await pro.getByRole('button', { name: /購入する/ }).click();
    await page.waitForURL(/\/pay\//);
    await page.getByRole('button', { name: '支払う（テスト）' }).click();
    await page.waitForURL(/\/success\?session_id=/);
    await expect(page.getByRole('heading', { name: '会員権限を確認しました' })).toBeVisible({ timeout: 90_000 });
    await shot(page, 'pc-08-success');
    await page.getByRole('link', { name: /会員設定/ }).click();
    await expect(page.getByText('PRO（月額プラン）')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/^次回の更新日 \d{4}年\d{1,2}月\d{1,2}日$/)).toBeVisible();
    await shot(page, 'pc-09-account-pro');

    // 契約中は退会できない（先に解約）
    await page.getByRole('button', { name: 'アカウントを削除する' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除する' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '解約してから' })).toBeVisible();
    await shot(page, 'pc-10-delete-blocked');

    // 契約の管理（偽装）で解約 → 会員設定に戻る
    await page.getByRole('button', { name: '契約の管理（支払い方法の変更・解約）' }).click();
    await page.waitForURL(/\/portal\?/);
    await page.getByRole('button', { name: '解約する（テスト）' }).click();
    await page.waitForURL(/\/account$/);
    await expect(page.getByText(/まで利用できます（更新しません）$/)).toBeVisible({ timeout: 90_000 });
    await shot(page, 'pc-11-cancelled');
  }

  // 退会
  await page.getByRole('button', { name: 'アカウントを削除する' }).click();
  await shot(page, 'pc-12-delete-confirm');
  await page.getByRole('alertdialog').getByRole('button', { name: '削除する' }).click();
  await expect(page.getByText('アカウントを削除しました。')).toBeVisible({ timeout: 90_000 });
  await shot(page, 'pc-13-deleted');

  // 削除したアカウントでは入れない
  await page.goto('/account');
  await page.getByRole('main').getByRole('button', { name: 'ログイン', exact: true }).click();
  await fillCredentials(page, account.email, account.password);
  await page.getByRole('dialog').getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'メールアドレスかパスワードが違います' })).toBeVisible();
});

test('スマホ幅：メニューから登録→メニューにメールとプラン→ログアウト', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const account = newAccount('sp');

  await page.goto('/');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await shot(page, 'sp-01-drawer-signed-out');
  await page.getByRole('link', { name: 'ログイン・新規登録' }).click();
  await page.waitForURL(/\/account$/);
  await page.getByRole('button', { name: '無料で登録する' }).click();
  await fillCredentials(page, account.email, account.password);
  await page.getByRole('button', { name: '登録を完了する' }).click();
  await expect(page.locator('main').getByText(account.email, { exact: true })).toBeVisible();
  await expect(page.getByText('契約状況を読み込んでいます')).toHaveCount(0, { timeout: 90_000 });
  await shot(page, 'sp-02-account');
  await page.screenshot({ path: `${shots}/sp-02b-account-full.png`, fullPage: true });

  await page.getByRole('button', { name: 'メニューを開く' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByText(account.email)).toBeVisible();
  await expect(drawer.getByRole('link', { name: '会員設定' })).toBeVisible();
  await shot(page, 'sp-03-drawer-signed-in');
  await drawer.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.getByRole('button', { name: '無料で登録する' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('スマホ幅：創刊版（買い切り）を偽の決済で購入→完了→会員設定に反映', async ({ page }) => {
  test.skip(!stripeMock, 'ACCOUNT_E2E_STRIPE_MOCK が無いので決済は通さない');
  await page.setViewportSize({ width: 390, height: 844 });
  const account = newAccount('once');

  await page.goto('/account');
  await page.getByRole('button', { name: '無料で登録する' }).click();
  await fillCredentials(page, account.email, account.password);
  await page.getByRole('button', { name: '登録を完了する' }).click();
  await expect(page.locator('main').getByText(account.email, { exact: true })).toBeVisible();
  await expect(page.getByText('契約状況を読み込んでいます')).toHaveCount(0, { timeout: 90_000 });

  await page.goto('/?pro=1');
  const pro = page.getByRole('dialog', { name: 'PRO' });
  await expect(pro).toBeVisible();
  await pro.getByText('創刊版（買い切り）').click();
  await expect(pro.getByText('創刊版は1回のお支払いで、自動更新・月額請求はありません。')).toBeVisible();
  await shot(page, 'once-01-pro-plans');
  await pro.getByRole('button', { name: /購入する（.*1,980/ }).click();
  await page.waitForURL(/\/pay\//);
  await expect(page.getByText('¥1,980')).toBeVisible();
  await shot(page, 'once-02-fake-pay');
  await page.getByRole('button', { name: '支払う（テスト）' }).click();
  await page.waitForURL(/\/success\?session_id=/);
  await expect(page.getByRole('heading', { name: '会員権限を確認しました' })).toBeVisible({ timeout: 90_000 });
  await shot(page, 'once-03-success');
  await page.getByRole('link', { name: /会員設定/ }).click();
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole('heading', { name: '会員設定', level: 1 })).toBeVisible();
  await expect(page.getByText('PRO（創刊版（買い切り））')).toBeVisible({ timeout: 90_000 });
  // 買い切りは更新も解約もない
  await expect(page.getByText(/^次回の更新日/)).toHaveCount(0);
  await shot(page, 'once-04-account-pro');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

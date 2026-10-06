import { defineConfig, devices } from '@playwright/test';

/**
 * 会員導線の通し確認（e2e/account-flow.spec.ts）だけを、手元で起動済みのサーバーに対して流す設定。ローカル専用。
 * サーバーは自分で立てる（e2e/README.md の末尾）。この設定はサーバーを起動しない。
 */
export default defineConfig({
  testDir: '.',
  testMatch: /account-flow\.spec\.ts$/,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

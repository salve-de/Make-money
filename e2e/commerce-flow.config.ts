import { defineConfig, devices } from '@playwright/test';

/**
 * 掲載→購入→紹介の通し確認（e2e/commerce-flow.spec.ts）だけを、手元で起動済みのサーバーに対して流す設定。ローカル専用。
 * サーバーは自分で立てる（e2e/README.md の「会員導線」と同じ手順）。この設定はサーバーを起動しない。
 */
export default defineConfig({
  testDir: '.',
  testMatch: /commerce-flow\.spec\.ts$/,
  retries: 0,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

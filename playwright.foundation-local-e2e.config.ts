import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.FOUNDATION_LOCAL_E2E_ORIGIN || 'http://127.0.0.1:3211';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'c9e-local-foundation.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1440, height: 1000 },
    },
  }],
});
